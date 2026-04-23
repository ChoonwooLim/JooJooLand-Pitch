"""산림 분석 API — 필지 폴리곤을 받아 임상도·산지구분도·산사태위험 교집합 계산.

엔드포인트:
- GET  /api/forest/status          : 적재 레이어 건수
- POST /api/forest/analyze          : 필지 폴리곤(GeoJSON) 분석 — 단건
- POST /api/forest/analyze-batch   : 여러 필지 일괄 분석
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session

from ..core.db import get_session
from ..services.forest_gis import analyze_parcel, dataset_status

router = APIRouter(prefix="/api/forest", tags=["forest"])


class AnalyzeRequest(BaseModel):
    parcel_no: int = Field(..., description="parcels.js 의 no")
    geometry: dict[str, Any] = Field(..., description="GeoJSON Polygon/MultiPolygon")
    layers: list[str] = Field(
        default_factory=lambda: ["imsang", "sanji", "landslide"],
        description="분석할 레이어 리스트",
    )


class AnalyzeBatchRequest(BaseModel):
    parcels: list[AnalyzeRequest]


@router.get("/status")
def status(db: Session = Depends(get_session)) -> dict:
    counts = dataset_status(db)
    return {
        "loaded_layers": counts,
        "total_features": sum(counts.values()),
        "ready": bool(counts),
    }


@router.post("/analyze")
def analyze(req: AnalyzeRequest, db: Session = Depends(get_session)) -> dict:
    try:
        return analyze_parcel(db, req.parcel_no, req.geometry, req.layers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"analyze 실패: {e}")


@router.post("/analyze-batch")
def analyze_batch(req: AnalyzeBatchRequest, db: Session = Depends(get_session)) -> dict:
    results = []
    for p in req.parcels:
        try:
            results.append(analyze_parcel(db, p.parcel_no, p.geometry, p.layers))
        except Exception as e:
            results.append({"parcel_no": p.parcel_no, "error": str(e)})

    # 프로젝트 전체 합계
    roll: dict[str, dict[str, dict[str, float]]] = {}  # layer -> category -> {area_m2, count}
    for r in results:
        if "error" in r:
            continue
        for layer, info in r.get("layers", {}).items():
            for item in info.get("items", []):
                cat = item["category"]
                roll.setdefault(layer, {}).setdefault(cat, {"area_m2": 0.0, "count": 0})
                roll[layer][cat]["area_m2"] += item["area_m2"]
                roll[layer][cat]["count"] += 1

    project_summary = {}
    for layer, cats in roll.items():
        items = [
            {
                "category": c,
                "area_m2": round(v["area_m2"], 1),
                "area_pyeong": round(v["area_m2"] / 3.305785, 1),
                "parcel_count": v["count"],
            }
            for c, v in cats.items()
        ]
        items.sort(key=lambda x: -x["area_m2"])
        project_summary[layer] = items

    return {"per_parcel": results, "project_summary": project_summary}
