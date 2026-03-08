"""Verify the Vercel entrypoint (backend/api/index.py) serves /api/v1/health."""
import sys
from pathlib import Path

# Run from backend/ so api/index.py can resolve app
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import pytest
from fastapi.testclient import TestClient

# Import the same app Vercel runs (from api/index.py)
from api.index import app


client = TestClient(app)


def test_health_full_path():
    """GET /api/v1/health returns 200 and status ok (path as received on Vercel)."""
    r = client.get("/api/v1/health")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") == "ok"
    assert "service" in data


def test_health_stripped_path():
    """GET /v1/health still works when Vercel strips /api (middleware restores path)."""
    r = client.get("/v1/health")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") == "ok"
