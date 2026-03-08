from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class WebappConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, project_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[project_id].add(websocket)

    def disconnect(self, project_id: str, websocket: WebSocket) -> None:
        connections = self._connections.get(project_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self._connections.pop(project_id, None)

    def client_count(self, project_id: str) -> int:
        return len(self._connections.get(project_id, set()))

    async def broadcast(self, project_id: str, message: dict[str, Any]) -> int:
        connections = list(self._connections.get(project_id, set()))
        sent = 0
        for ws in connections:
            try:
                await ws.send_json(message)
                sent += 1
            except Exception:
                self.disconnect(project_id, ws)
        return sent


webapp_manager = WebappConnectionManager()
