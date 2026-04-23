"""산림 레이어와 필지 폴리곤 간 교집합 분석 (shapely Python 측 계산).

파셀 폴리곤(GeoJSON) 을 받아 BBOX 1 차 필터 → DB 에서 후보 피처 로드 →
shapely intersection 으로 정확한 면적 산출.

면적 단위: 미터² (EPSG:3857 Web Mercator 투영 사용 — 소규모(수십ha) 범위는
오차 < 1%. 더 정확한 값이 필요하면 UTM zone 52N 로 바꾸면 됨).
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Iterable

from shapely import wkb as shp_wkb
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import transform as shp_transform
from pyproj import Transformer
from sqlmodel import Session, select

from ..models.forest import ForestFeature


# 면적 계산용 등적 투영 (한국 기준 UTM-K / EPSG:5179)
_AREA_PROJ = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True).transform


def _area_m2(geom) -> float:
    if geom is None or geom.is_empty:
        return 0.0
    return shp_transform(_AREA_PROJ, geom).area


def _parse_parcel_geojson(parcel_geom: dict) -> Polygon | MultiPolygon:
    """GeoJSON geometry dict → shapely."""
    return shape(parcel_geom)


# ==================== 레이어별 속성 해석 규칙 ====================
# SHP 마다 컬럼 이름이 다르므로 후보 여러 개 확인 (대소문자·한글)

def _pick(attrs: dict, *keys: str) -> Any:
    for k in keys:
        if k in attrs and attrs[k] not in (None, ""):
            return attrs[k]
        # 대소문자 구분 없이
        for ak, av in attrs.items():
            if ak.lower() == k.lower() and av not in (None, ""):
                return av
    return None


def classify_sanji(attrs: dict) -> str:
    """산지구분도 피처의 구분을 보전/준보전/임업용/공익용/기타 로 정규화.

    FGIS 산지구분도 속성명 예: SANJI_GBN, SANJI_CODE, GUBUN 등. 실제 SHP 받아
    컬럼 확인 후 아래 매핑을 업데이트.
    """
    raw = str(_pick(attrs, "sanji_gbn", "sanji_code", "gubun", "code") or "")
    r = raw.strip().upper()
    # 예시 매핑 (FGIS 표준 산림기본통계 기준 추정)
    if r in ("1", "01", "PROT", "BOJUN") or "보전" in r:
        return "보전산지"
    if r in ("2", "02", "SEMIP", "JUNBOJUN") or "준보전" in r:
        return "준보전산지"
    if r in ("11", "FOREST_BIZ") or "임업용" in r:
        return "임업용산지"
    if r in ("12", "PUBLIC") or "공익용" in r:
        return "공익용산지"
    return raw or "미분류"


def classify_imsang(attrs: dict) -> dict:
    """임상도 속성 정규화. NM(한글) 필드 우선, 없으면 CD(숫자)."""
    return {
        "임상":   _pick(attrs, "FRTP_NM", "frtp_nm", "FRTP_CD", "frtp_cd", "imsang", "type"),
        "수종":   _pick(attrs, "KOFTR_NM", "koftr_nm", "KOFTR_GROU", "koftr_grou", "sujong"),
        "경급":   _pick(attrs, "DMCLS_NM", "dmcls_nm", "DMCLS_CD", "dmcls_cd", "dbh"),
        "영급":   _pick(attrs, "AGCLS_NM", "agcls_nm", "AGCLS_CD", "agcls_cd", "age"),
        "수관밀도": _pick(attrs, "DNST_NM", "dnst_nm", "DNST_CD", "dnst_cd", "density"),
        "수고": _pick(attrs, "HEIGHT_NM", "height_nm", "HEIGHT", "height"),
    }


def classify_landslide(attrs: dict) -> str:
    raw = str(_pick(attrs, "grade", "risk", "등급") or "")
    return raw or "미분류"


# ==================== 메인 분석 함수 ====================

def analyze_parcel(
    db: Session,
    parcel_no: int,
    parcel_geom_geojson: dict,
    layers: Iterable[str] = ("imsang", "sanji", "landslide"),
) -> dict:
    """필지 1 건에 대해 요청 레이어별 교집합 분석."""

    parcel = _parse_parcel_geojson(parcel_geom_geojson)
    parcel_area = _area_m2(parcel)
    minx, miny, maxx, maxy = parcel.bounds

    result: dict = {
        "parcel_no": parcel_no,
        "parcel_area_m2": round(parcel_area, 1),
        "layers": {},
    }

    for layer in layers:
        # BBOX intersect 로 후보 피처만 긁어 옴 (DB 인덱스 이용)
        stmt = select(ForestFeature).where(
            ForestFeature.layer_type == layer,
            ForestFeature.min_lng <= maxx,
            ForestFeature.max_lng >= minx,
            ForestFeature.min_lat <= maxy,
            ForestFeature.max_lat >= miny,
        )
        candidates = db.exec(stmt).all()

        bucket: dict[str, dict] = defaultdict(lambda: {"area_m2": 0.0, "count": 0, "detail": {}})

        for feat in candidates:
            fgeom = shp_wkb.loads(bytes(feat.geom_wkb))
            if not fgeom.intersects(parcel):
                continue
            inter = fgeom.intersection(parcel)
            if inter.is_empty:
                continue
            area = _area_m2(inter)
            if area <= 0:
                continue

            # 레이어별 카테고리 키 결정
            if layer == "sanji":
                key = classify_sanji(feat.attrs)
            elif layer == "landslide":
                key = classify_landslide(feat.attrs)
            elif layer == "imsang":
                im = classify_imsang(feat.attrs)
                key = str(im.get("임상") or "미분류")
                bucket[key]["detail"] = im  # 마지막 값이 대표 (필요시 가중평균으로 개선)
            else:
                key = "기타"

            bucket[key]["area_m2"] += area
            bucket[key]["count"] += 1

        # 비율·정렬·반올림 정리
        total = sum(b["area_m2"] for b in bucket.values())
        out_items = []
        for k, v in bucket.items():
            out_items.append({
                "category": k,
                "area_m2": round(v["area_m2"], 1),
                "area_pyeong": round(v["area_m2"] / 3.305785, 1),
                "pct": round(v["area_m2"] / total * 100, 2) if total > 0 else 0,
                "count": v["count"],
                **({"detail": v["detail"]} if v["detail"] else {}),
            })
        out_items.sort(key=lambda x: -x["area_m2"])

        result["layers"][layer] = {
            "total_overlap_m2": round(total, 1),
            "coverage_pct": round(total / parcel_area * 100, 2) if parcel_area > 0 else 0,
            "items": out_items,
        }

    return result


def dataset_status(db: Session) -> dict:
    """레이어별 적재 건수 — 어느 레이어가 로드돼 있는지 확인용."""
    from sqlalchemy import func
    rows = db.exec(
        select(ForestFeature.layer_type, func.count(ForestFeature.id))  # type: ignore[arg-type]
        .group_by(ForestFeature.layer_type)
    ).all()
    return {layer: count for layer, count in rows}


# ==================== POI (Point) 주변 검색 ====================

def _poi_category(attrs: dict) -> str:
    """등산로 포인트의 시설 종류 정규화."""
    raw = str(_pick(attrs, "DETAIL_SPO", "detail_spo", "detail") or "").strip()
    r = raw
    if not r:
        return "기타"
    for kw, cat in [
        ("이정표", "이정표"),
        ("안내판", "안내판"),
        ("갈림길", "갈림길"),
        ("정상",   "정상"),
        ("봉우리", "봉우리"),
        ("화장실", "화장실"),
        ("쉼터",   "쉼터"),
        ("주차장", "주차장"),
        ("야영",   "야영지"),
        ("전망",   "전망대"),
        ("대피",   "대피소"),
        ("수원",   "수원"),
        ("약수",   "약수"),
        ("능선",   "능선지점"),
    ]:
        if kw in r:
            return cat
    return r[:20] or "기타"


def nearby_poi(
    db: Session,
    parcel_geom_geojson: dict,
    radius_m: float = 3000.0,
    limit: int = 500,
) -> dict:
    """필지 폴리곤 주변 `radius_m` 이내 등산로 포인트 리스트 + 카테고리 집계.

    - 입력: 파셀 GeoJSON geometry
    - 출력: {
        'total': N, 'by_category': [...], 'points': [...]  # 거리 오름차순 (limit)
      }
    """
    parcel = _parse_parcel_geojson(parcel_geom_geojson)
    minx, miny, maxx, maxy = parcel.bounds

    # BBOX 확장 (반경만큼) — 위경도 근사
    d = radius_m / 111000.0
    stmt = select(ForestFeature).where(
        ForestFeature.layer_type == "mountain_poi",
        ForestFeature.min_lng >= minx - d,
        ForestFeature.max_lng <= maxx + d,
        ForestFeature.min_lat >= miny - d,
        ForestFeature.max_lat <= maxy + d,
    )
    features = db.exec(stmt).all()

    # EPSG:5179 등적 투영으로 거리 계산
    parcel_proj = shp_transform(_AREA_PROJ, parcel)

    results: list[dict] = []
    for feat in features:
        geom = shp_wkb.loads(bytes(feat.geom_wkb))
        geom_proj = shp_transform(_AREA_PROJ, geom)
        dist = parcel_proj.distance(geom_proj)
        if dist > radius_m:
            continue
        attrs = feat.attrs or {}
        # geom 중심 좌표 (Point 일 때)
        if geom.geom_type == "Point":
            lng, lat = geom.x, geom.y
        else:
            c = geom.centroid
            lng, lat = c.x, c.y
        results.append({
            "name": _pick(attrs, "MNTN_NM") or "",
            "detail": _pick(attrs, "DETAIL_SPO") or "",
            "category": _poi_category(attrs),
            "distance_m": round(dist, 1),
            "lng": round(lng, 6),
            "lat": round(lat, 6),
            "attrs": {k: v for k, v in attrs.items() if k in (
                "MNTN_NM", "MNTN_CODE", "PMNTN_SPOT", "MANAGE_SP1", "MANAGE_SP2"
            )},
        })

    results.sort(key=lambda r: r["distance_m"])

    # 카테고리 집계
    by_cat: dict[str, int] = {}
    for r in results:
        by_cat[r["category"]] = by_cat.get(r["category"], 0) + 1
    by_category = sorted(
        [{"category": k, "count": v} for k, v in by_cat.items()],
        key=lambda x: -x["count"],
    )

    return {
        "total": len(results),
        "radius_m": radius_m,
        "by_category": by_category,
        "points": results[:limit],
    }


def nearby_poi_project(
    db: Session,
    parcel_features: list[dict],
    radius_m: float = 3000.0,
    limit: int = 500,
) -> dict:
    """프로젝트 여러 필지의 경계선을 union 하여 주변 POI 한 번에 조회."""
    if not parcel_features:
        return {"total": 0, "points": [], "by_category": []}
    geoms = [_parse_parcel_geojson(f) for f in parcel_features]
    from shapely.ops import unary_union
    union = unary_union(geoms)
    # geometry dict 로 다시 감싸서 nearby_poi 재사용
    from shapely.geometry import mapping as shp_mapping
    return nearby_poi(db, shp_mapping(union), radius_m=radius_m, limit=limit)
