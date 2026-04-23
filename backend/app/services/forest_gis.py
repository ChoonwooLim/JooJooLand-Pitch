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
    """임상도 속성 정규화."""
    return {
        "임상":   _pick(attrs, "frtp_cd", "frtp_nm", "imsang", "type"),
        "수종":   _pick(attrs, "kofrtp_cd", "kofrtp_nm", "sujong"),
        "경급":   _pick(attrs, "dmcls_cd", "dmcls_nm", "dbh"),
        "영급":   _pick(attrs, "agcls_cd", "agcls_nm", "age"),
        "수관밀도": _pick(attrs, "dncls_cd", "dncls_nm", "density"),
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
