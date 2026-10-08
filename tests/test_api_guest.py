from fastapi.testclient import TestClient

from agent import db as agent_db
from api.auth import COOKIE_NAME
from api.main import app


def _guest(stay):
    c = TestClient(app)
    c.cookies.set(COOKIE_NAME, agent_db.create_session(
        "guest_account", str(stay["reservation_id"]), "guest"))
    return c


def test_create_request_returns_own_row(active_stay):
    resp = _guest(active_stay).post("/api/me/requests",
                                    json={"request_type": "Dọn phòng", "note": "chiều nay"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["request_type"] == "Dọn phòng"
    assert body["room_id"] == active_stay["room_id"]


def test_guest_sees_only_own_requests(make_active_stay):
    first, second = make_active_stay(), make_active_stay()
    _guest(first).post("/api/me/requests", json={"request_type": "Báo hỏng", "note": ""})
    assert _guest(second).get("/api/me/requests").json() == []
    assert [r["request_type"] for r in _guest(first).get("/api/me/requests").json()] == ["Báo hỏng"]


def test_me_stay_returns_current_booking(active_stay):
    resp = _guest(active_stay).get("/api/me/stay")
    assert resp.status_code == 200
    body = resp.json()
    assert body["reservation_id"] == active_stay["reservation_id"]
    assert body["room_id"] == active_stay["room_id"]
    assert body["room_type"] == "Deluxe Queen"
    assert body["guest_name"] == "Nguyen Van A"
    assert body["num_guests"] == 2


def test_me_service_requests_only_mine(make_active_stay):
    first, second = make_active_stay(), make_active_stay()
    resp = _guest(first).post("/api/service-requests", json={
        "service_type": "spa", "requested_at": "2026-10-17 15:00", "party_size": 1, "note": "đá nóng"})
    assert resp.status_code == 201
    mine = _guest(first).get("/api/me/service-requests").json()
    assert [r["service_type"] for r in mine] == ["spa"]
    assert _guest(second).get("/api/me/service-requests").json() == []


def test_me_endpoints_require_guest():
    assert TestClient(app).get("/api/me/stay").status_code == 401


def test_staff_sees_room_of_service_request(active_stay):
    _guest(active_stay).post("/api/service-requests", json={
        "service_type": "restaurant", "requested_at": "2026-10-17 19:00", "party_size": 2, "note": ""})
    staff = TestClient(app)
    staff.cookies.set(COOKIE_NAME, agent_db.create_session("staff_account", "nv-test", "staff"))
    rows = staff.get("/api/staff/service-requests").json()
    assert rows[0]["room_id"] == active_stay["room_id"]
