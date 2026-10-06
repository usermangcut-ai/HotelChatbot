from datetime import timedelta

from fastapi.testclient import TestClient

from agent import clock
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


def test_change_password_rejects_guest_identity(active_stay):
    resp = _client_as("guest_account", str(active_stay["reservation_id"]), "guest").post(
        "/api/auth/change-password", json={"old_password": "x", "new_password": "newpass1"})
    assert resp.status_code == 403


def test_guest_login_with_room_and_password(active_stay):
    c = TestClient(app)
    resp = c.post("/api/auth/login", json={"identity_type": "guest",
                                           "room_id": active_stay["room_id"],
                                           "password": active_stay["password"]})
    assert resp.status_code == 200
    assert resp.json()["room_id"] == active_stay["room_id"]
    me = c.get("/api/auth/me").json()
    assert me["role"] == "guest"
    assert me["room_id"] == active_stay["room_id"]


def test_guest_login_wrong_password(active_stay):
    resp = client.post("/api/auth/login", json={"identity_type": "guest",
                                                "room_id": active_stay["room_id"],
                                                "password": "sai"})
    assert resp.status_code == 401


def test_guest_login_before_check_in_explains_date():
    start = clock.today() + timedelta(days=40)
    res = agent_db.create_reservation("Villa 3 Bedroom Beachfront", start.isoformat(),
                                      (start + timedelta(days=1)).isoformat(),
                                      "B", "091", "b@t.com", 2)
    resp = client.post("/api/auth/login", json={"identity_type": "guest",
                                                "room_id": res["room_id"],
                                                "password": res["guest_password"]})
    assert resp.status_code == 401
    assert start.isoformat() in resp.json()["detail"]


def test_change_password_requires_login():
    resp = client.post(
        "/api/auth/change-password", json={"old_password": "x", "new_password": "newpass1"})
    assert resp.status_code == 401


def test_change_password_rejects_short_new_password():
    resp = _client_as("staff_account", "admin", "admin").post(
        "/api/auth/change-password", json={"old_password": "admin123", "new_password": "abc"})
    assert resp.status_code == 422


def test_login_cookie_secure_flag_follows_config(monkeypatch):
    from api.routes import auth as auth_routes

    monkeypatch.setattr(auth_routes, "COOKIE_SECURE", True)
    monkeypatch.setattr(agent_db, "verify_staff_login", lambda u, p: "staff")
    resp = client.post("/api/auth/login",
                       json={"identity_type": "staff", "username": "nv", "password": "x"})
    assert resp.status_code == 200
    assert "secure" in resp.headers["set-cookie"].lower()


def test_logout_succeeds_even_when_session_already_invalid():
    # Khách trả phòng xong → phiên hết hiệu lực; đăng xuất vẫn phải xóa được cookie, không trả 401.
    c = TestClient(app)
    c.cookies.set(COOKIE_NAME, "phien-da-het-han")
    resp = c.post("/api/auth/logout")
    assert resp.status_code == 200
    assert COOKIE_NAME in resp.headers.get("set-cookie", "")
