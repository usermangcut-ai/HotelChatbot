from fastapi.testclient import TestClient

from agent import db as agent_db
from api.auth import COOKIE_NAME
from api.main import app

client = TestClient(app)


def _client_as(identity_type, identity_id, role):
    session_id = agent_db.create_session(identity_type, identity_id, role)
    c = TestClient(app)
    c.cookies.set(COOKIE_NAME, session_id)
    return c


def test_change_password_success(monkeypatch):
    monkeypatch.setattr(agent_db, "change_staff_password", lambda u, o, n: True)
    resp = _client_as("staff_account", "admin", "admin").post(
        "/api/auth/change-password", json={"old_password": "admin123", "new_password": "newpass1"})
    assert resp.status_code == 200


def test_change_password_wrong_old_password(monkeypatch):
    monkeypatch.setattr(agent_db, "change_staff_password", lambda u, o, n: False)
    resp = _client_as("staff_account", "admin", "admin").post(
        "/api/auth/change-password", json={"old_password": "sai", "new_password": "newpass1"})
    assert resp.status_code == 401


def test_change_password_rejects_guest_identity():
    resp = _client_as("guest_account", "201", "guest").post(
        "/api/auth/change-password", json={"old_password": "x", "new_password": "newpass1"})
    assert resp.status_code == 403


def test_change_password_requires_login():
    resp = client.post(
        "/api/auth/change-password", json={"old_password": "x", "new_password": "newpass1"})
    assert resp.status_code == 401


def test_change_password_rejects_short_new_password():
    resp = _client_as("staff_account", "admin", "admin").post(
        "/api/auth/change-password", json={"old_password": "admin123", "new_password": "abc"})
    assert resp.status_code == 422
