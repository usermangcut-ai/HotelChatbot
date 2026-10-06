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


def _admin_client():
    return _client_as("staff_account", "admin-test", "admin")


def test_create_staff_account_returns_201(monkeypatch):
    monkeypatch.setattr(agent_db, "create_staff_account",
                         lambda u, p, r: {"username": u, "role": r, "created_at": "2026-07-21T00:00:00"})
    resp = _admin_client().post("/api/admin/staff-accounts", json={
        "username": "nv1", "password": "pass123", "role": "staff"})
    assert resp.status_code == 201
    assert resp.json()["username"] == "nv1"


def test_create_staff_account_rejects_invalid_role():
    resp = _admin_client().post("/api/admin/staff-accounts", json={
        "username": "nv1", "password": "pass123", "role": "manager"})
    assert resp.status_code == 422


def test_create_staff_account_rejects_duplicate(monkeypatch):
    def boom(u, p, r):
        raise agent_db.DuplicateUsernameError(f"'{u}' đã tồn tại.")

    monkeypatch.setattr(agent_db, "create_staff_account", boom)
    resp = _admin_client().post("/api/admin/staff-accounts", json={
        "username": "admin", "password": "x", "role": "staff"})
    assert resp.status_code == 409


def test_create_staff_account_requires_admin():
    resp = client.post("/api/admin/staff-accounts", json={
        "username": "nv1", "password": "pass123", "role": "staff"})
    assert resp.status_code == 401


def test_create_staff_account_rejects_staff_role_caller():
    resp = _client_as("staff_account", "nv1", "staff").post("/api/admin/staff-accounts", json={
        "username": "nv2", "password": "pass123", "role": "staff"})
    assert resp.status_code == 403


def test_list_staff_accounts(monkeypatch):
    monkeypatch.setattr(agent_db, "list_staff_accounts",
                         lambda: [{"username": "admin", "role": "admin", "created_at": "x"}])
    resp = _admin_client().get("/api/admin/staff-accounts")
    assert resp.status_code == 200
    assert resp.json()[0]["username"] == "admin"
    assert "password" not in resp.json()[0]


def test_delete_staff_account_returns_404_when_missing(monkeypatch):
    monkeypatch.setattr(agent_db, "delete_staff_account", lambda u: False)
    resp = _admin_client().delete("/api/admin/staff-accounts/khong-ton-tai")
    assert resp.status_code == 404


def test_delete_staff_account_success(monkeypatch):
    monkeypatch.setattr(agent_db, "delete_staff_account", lambda u: True)
    resp = _admin_client().delete("/api/admin/staff-accounts/nv1")
    assert resp.status_code == 200


def test_update_booking_rejects_unknown_status():
    resp = _admin_client().patch("/api/admin/bookings/1", json={"status": "hacked"})
    assert resp.status_code == 422


def test_update_service_request_rejects_booking_only_status():
    resp = _admin_client().patch("/api/admin/service-requests/1", json={"status": "paid"})
    assert resp.status_code == 422


def test_staff_update_request_rejects_unknown_status():
    resp = _admin_client().patch("/api/staff/requests/1", json={"status": "xong"})
    assert resp.status_code == 422
