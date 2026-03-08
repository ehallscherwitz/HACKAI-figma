from fastapi import APIRouter

from app.core.config import settings
from app.services.plugin_sync import plugin_manager

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "env": settings.app_env,
        "ws_connections": plugin_manager.debug_info(),
    }
