from fastapi.testclient import TestClient

from agent import db as agent_db
from api.auth import COOKIE_NAME
from api.main import app

client = TestClient(app)


def _client_as(identity_type, identity_id, role):
    session_id = agent_db.create_session(identity_type, identity_id, role)
    guest_client = TestClient(app)
    guest_client.cookies.set(COOKIE_NAME, session_id)
    return guest_client


def _guest_client(stay):
    return _client_as("guest_account", str(stay["reservation_id"]), "guest")


def test_create_service_request_auto_fills_contact_from_session(monkeypatch, active_stay):
    seen = {}

    monkeypatch.setattr(agent_db, "get_guest_contact",
                        lambda reservation_id: ("Nguyen Van A", "0900000000"))

    def fake_create_service_request(service_type, guest_name, guest_phone, requested_at,
                                     party_size, note, reservation_id=None):
        seen["args"] = (service_type, guest_name, guest_phone, requested_at, party_size, note,
                        reservation_id)
        return {"id": 7, "service_type": service_type, "status": "received"}

    monkeypatch.setattr(agent_db, "create_service_request", fake_create_service_request)
    resp = _guest_client(active_stay).post("/api/service-requests", json={
        "service_type": "spa", "requested_at": "2026-08-01 15:00", "party_size": 2, "note": "massage"})
    assert resp.status_code == 201
    assert resp.json()["id"] == 7
    assert seen["args"] == ("spa", "Nguyen Van A", "0900000000", "2026-08-01 15:00", 2, "massage",
                            active_stay["reservation_id"])


def test_create_service_request_rejects_unknown_service_type(monkeypatch, active_stay):
    monkeypatch.setattr(agent_db, "get_guest_contact", lambda reservation_id: (None, None))
    resp = _guest_client(active_stay).post("/api/service-requests", json={
        "service_type": "massage", "requested_at": "2026-08-01 15:00", "party_size": 2, "note": ""})
    assert resp.status_code == 422


def test_create_service_request_allows_missing_party_size(monkeypatch, active_stay):
    monkeypatch.setattr(agent_db, "get_guest_contact", lambda reservation_id: (None, None))

    def fake_create_service_request(service_type, guest_name, guest_phone, requested_at,
                                     party_size, note, reservation_id=None):
        assert party_size is None
        return {"id": 8, "service_type": service_type, "status": "received"}

    monkeypatch.setattr(agent_db, "create_service_request", fake_create_service_request)
    resp = _guest_client(active_stay).post("/api/service-requests", json={
        "service_type": "restaurant", "requested_at": "2026-08-01 19:00"})
    assert resp.status_code == 201


def test_create_service_request_rejects_walk_in_without_login():
    resp = client.post("/api/service-requests", json={
        "service_type": "spa", "requested_at": "2026-08-01 15:00", "party_size": 2, "note": ""})
    assert resp.status_code == 401


def test_create_service_request_rejects_staff_role():
    resp = _client_as("staff_account", "lantan1", "staff").post("/api/service-requests", json={
        "service_type": "spa", "requested_at": "2026-08-01 15:00", "party_size": 2, "note": ""})
    assert resp.status_code == 403
