from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.plugin_sync import plugin_manager
from app.services.webapp_sync import webapp_manager

router = APIRouter(prefix="/ws/webapp", tags=["webapp"])


@router.websocket("/{project_id}")
async def webapp_websocket(
    websocket: WebSocket,
    project_id: str,
) -> None:
    await webapp_manager.connect(project_id, websocket)
    try:
        while True:
            payload: dict[str, Any] = await websocket.receive_json()
            message_type = payload.get("type")

            if message_type == "SYNC_COMPONENTS":
                components = payload.get("components", [])
                delivered = await plugin_manager.broadcast(project_id, payload)
                await websocket.send_json(
                    {
                        "type": "ACK",
                        "relayed_to": 1 if delivered else 0,
                        "components": len(components),
                    }
                )
                continue

            await websocket.send_json(
                {"type": "error", "message": f"Unknown message type: {message_type}"}
            )
    except WebSocketDisconnect:
        webapp_manager.disconnect(project_id, websocket)
