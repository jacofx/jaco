import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "solveconnect_test")
os.environ.setdefault("SECRET_KEY", "test-secret")

import core
import server
from test_support import FakeDB


@pytest.fixture
def client(monkeypatch):
    fake_db = FakeDB()
    active_user = {"_id": str(fake_db.buyer_id), "role": "need_help", "name": "Buyer"}

    monkeypatch.setattr(core, "db", fake_db)
    monkeypatch.setattr(core, "PAYMENTS_MODE", "demo")
    monkeypatch.setattr(core.stripe, "api_key", None)

    async def fake_emit(*args, **kwargs):
        return None

    monkeypatch.setattr(core.sio, "emit", fake_emit)

    async def override_current_user():
        return active_user

    server.app.dependency_overrides[server.get_current_user] = override_current_user
    test_client = TestClient(server.app)

    yield test_client, fake_db, active_user, monkeypatch

    server.app.dependency_overrides.clear()


@pytest.fixture
def auth_client(monkeypatch):
    fake_db = FakeDB()

    monkeypatch.setattr(core, "db", fake_db)
    monkeypatch.setattr(core, "PAYMENTS_MODE", "demo")
    monkeypatch.setattr(core.stripe, "api_key", None)

    async def fake_emit(*args, **kwargs):
        return None

    monkeypatch.setattr(core.sio, "emit", fake_emit)

    server.app.dependency_overrides.clear()
    test_client = TestClient(server.app)

    yield test_client, fake_db

    server.app.dependency_overrides.clear()
