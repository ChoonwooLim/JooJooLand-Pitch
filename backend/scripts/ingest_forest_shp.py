#!/usr/bin/env python
"""산림청 SHP → DB 적재 스크립트.

Usage:
    python -m backend.scripts.ingest_forest_shp \
        --layer imsang \
        --file /path/to/imsang.shp \
        --bbox 127.68,37.42,127.82,37.55 \
        [--srid-override 5179] \
        [--truncate]

- `--layer`     : 저장할 layer_type 이름 (imsang / sanji / landslide / soil)
- `--file`      : SHP 파일 경로 (.shp. .shx/.dbf/.prj 동일 디렉토리 필수)
- `--bbox`      : lngMin,latMin,lngMax,latMax (EPSG:4326). 이 범위만 잘라 DB 에 넣음
- `--srid-override` : SHP .prj 가 깨졌을 때 수동 지정 (기본 자동인식)
- `--truncate`  : 적재 전 같은 layer_type 기존 행 전부 삭제

pyogrio 는 GeoPandas 없이 SHP/GPKG 읽는 C 가속 라이브러리. 읽기 한 번에
필터·투영 변환까지 수행.

양평 BBOX 예: 127.50,37.30,127.85,37.60 (양동면 포함 여유).
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

import pyogrio
from shapely.geometry import shape, mapping  # noqa: F401
from shapely.ops import transform as shp_transform
from shapely import wkb as shp_wkb
from pyproj import CRS, Transformer
from sqlmodel import Session, delete, select

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # repo root

from backend.app.core.db import engine  # noqa: E402
from backend.app.models.forest import ForestFeature, ForestIngestLog  # noqa: E402


WGS84 = CRS.from_epsg(4326)


def parse_bbox(s: str) -> tuple[float, float, float, float]:
    parts = [float(x) for x in s.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox 는 lngMin,latMin,lngMax,latMax 4개")
    return tuple(parts)  # type: ignore[return-value]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--layer", required=True, choices=["imsang", "sanji", "landslide", "soil"])
    ap.add_argument("--file", required=True)
    ap.add_argument("--bbox", required=True, help="lngMin,latMin,lngMax,latMax (EPSG:4326)")
    ap.add_argument("--srid-override", type=int, default=None)
    ap.add_argument("--truncate", action="store_true")
    ap.add_argument("--chunk", type=int, default=500)
    args = ap.parse_args()

    bbox = parse_bbox(args.bbox)
    src = Path(args.file)
    if not src.exists():
        sys.exit(f"file not found: {src}")

    # 원본 SHP CRS 파악
    info = pyogrio.read_info(str(src))
    src_crs = args.srid_override or info.get("crs")
    if not src_crs:
        sys.exit("SHP 의 CRS 를 파악할 수 없음. --srid-override 로 지정 (예: 5179)")

    src_crs_obj = CRS.from_user_input(src_crs)
    to_wgs = Transformer.from_crs(src_crs_obj, WGS84, always_xy=True).transform

    # BBOX(EPSG:4326) → 원본 CRS BBOX 로 변환해 pyogrio 에 bbox 필터로 전달
    # (네 모서리 모두 투영 후 최소/최대 사용)
    from_wgs = Transformer.from_crs(WGS84, src_crs_obj, always_xy=True).transform
    xs, ys = zip(*[
        from_wgs(bbox[0], bbox[1]),
        from_wgs(bbox[0], bbox[3]),
        from_wgs(bbox[2], bbox[1]),
        from_wgs(bbox[2], bbox[3]),
    ])
    src_bbox = (min(xs), min(ys), max(xs), max(ys))
    print(f"[read] CRS={src_crs_obj.to_epsg()} src_bbox={src_bbox}")

    # pyogrio 로 bbox 필터 읽기 (메모리 효율)
    gdf = pyogrio.read_dataframe(
        str(src),
        bbox=src_bbox,
    )
    if gdf is None or len(gdf) == 0:
        print("[warn] 매칭 피처 0건.")
        return
    print(f"[read] {len(gdf)} features in bbox")

    inserted = 0
    skipped = 0
    now = datetime.utcnow()

    with Session(engine) as db:
        log = ForestIngestLog(
            layer_type=args.layer,
            source_file=src.name,
            bbox_filter=",".join(f"{v:.5f}" for v in bbox),
            started_at=now,
        )
        db.add(log); db.commit(); db.refresh(log)

        if args.truncate:
            db.exec(delete(ForestFeature).where(ForestFeature.layer_type == args.layer))
            db.commit()
            print(f"[truncate] layer={args.layer} 삭제")

        batch: list[ForestFeature] = []
        for idx, row in gdf.iterrows():
            geom = row.geometry
            if geom is None or geom.is_empty:
                skipped += 1
                continue
            # 원본 CRS → WGS84 변환
            geom_wgs = shp_transform(to_wgs, geom)
            # BBOX 2차 검증
            minx, miny, maxx, maxy = geom_wgs.bounds
            if maxx < bbox[0] or minx > bbox[2] or maxy < bbox[1] or miny > bbox[3]:
                skipped += 1
                continue

            # 속성 (geometry 제외)
            attrs = {}
            for col in gdf.columns:
                if col == "geometry":
                    continue
                v = row[col]
                # numpy scalar 등 JSON 직렬화 가능한 타입으로 변환
                try:
                    if hasattr(v, "item"):
                        v = v.item()
                except Exception:
                    v = str(v)
                if v is None or v != v:  # NaN
                    continue
                attrs[str(col)] = v

            feat = ForestFeature(
                layer_type=args.layer,
                source_file=src.name,
                min_lng=minx, max_lng=maxx,
                min_lat=miny, max_lat=maxy,
                attrs=attrs,
                geom_wkb=shp_wkb.dumps(geom_wgs, output_dimension=2),
                area_m2=0.0,  # 계산 비용 절감: 필요시 API 시점에 계산
                ingested_at=now,
            )
            batch.append(feat)
            if len(batch) >= args.chunk:
                db.add_all(batch); db.commit()
                inserted += len(batch)
                print(f"  [ingest] +{len(batch)} (total {inserted})")
                batch = []

        if batch:
            db.add_all(batch); db.commit()
            inserted += len(batch)

        log.inserted_count = inserted
        log.skipped_count = skipped
        log.status = "ok"
        log.finished_at = datetime.utcnow()
        db.add(log); db.commit()

    print(f"[done] layer={args.layer} inserted={inserted} skipped={skipped}")


if __name__ == "__main__":
    main()
