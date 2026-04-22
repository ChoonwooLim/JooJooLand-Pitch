import json

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse, Response

from ..core.config import get_settings

router = APIRouter(prefix="/api/vworld", tags=["vworld"])

VWORLD_BASE = "https://api.vworld.kr/req"


@router.get("/config.js", response_class=PlainTextResponse)
def vworld_config_js():
    s = get_settings()
    body = (
        f"window.VWORLD_KEY = {json.dumps(s.vworld_api_key or '')};\n"
        f"window.CESIUM_ION_TOKEN = {json.dumps(s.cesium_ion_token or '')};\n"
    )
    return Response(
        content=body,
        media_type="application/javascript; charset=utf-8",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/address")
async def vworld_address_proxy(request: Request):
    key = get_settings().vworld_api_key
    if not key:
        raise HTTPException(status_code=503, detail="VWORLD_API_KEY not configured")
    params = dict(request.query_params)
    params["key"] = key
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{VWORLD_BASE}/address", params=params)
    return Response(content=r.content, status_code=r.status_code, media_type=r.headers.get("content-type", "application/json"))


@router.get("/data")
async def vworld_data_proxy(request: Request):
    key = get_settings().vworld_api_key
    if not key:
        raise HTTPException(status_code=503, detail="VWORLD_API_KEY not configured")
    params = dict(request.query_params)
    params["key"] = key
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{VWORLD_BASE}/data", params=params)
    return Response(content=r.content, status_code=r.status_code, media_type=r.headers.get("content-type", "application/json"))
