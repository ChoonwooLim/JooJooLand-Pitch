from fastapi import APIRouter
from ..core.config import get_settings

router = APIRouter(prefix="/api", tags=["content"])
settings = get_settings()


@router.get("/health")
def health():
    return {
        "status": "ok",
        "service": settings.app_name,
        "env": settings.env,
        "openclaw": settings.openclaw_ws_url,
    }


@router.get("/config/public")
def public_config():
    return {
        "ue5_signaling_url": settings.ue5_signaling_url,
        "ue5_pixel_streamer_url": settings.ue5_pixel_streamer_url,
        "openclaw_model_default": settings.openclaw_model_default,
        "openclaw_model_agent": settings.openclaw_model_agent,
    }
