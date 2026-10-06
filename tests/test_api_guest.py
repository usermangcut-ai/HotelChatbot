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
