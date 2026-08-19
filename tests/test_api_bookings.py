from fastapi.testclient import TestClient
from datetime import date, timedelta

from agent import db as agent_db
from api.main import app

client = TestClient(app)


def test_list_rooms_returns_all_room_types():
    resp = client.get("/api/rooms")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 8
    assert all("room_type" in r and "price_vnd" in r for r in data)


def test_create_booking_returns_201_and_booking_id(monkeypatch):
    def fake_create_reservation(room_type, check_in, check_out, guest_name, guest_phone,
                                 guest_email, num_guests):
        return {"id": 42, "room_type": room_type, "check_in": check_in,
                "check_out": check_out, "status": "paid"}

    monkeypatch.setattr(agent_db, "create_reservation", fake_create_reservation)
    resp = client.post("/api/bookings", json={
        "room_type": "Deluxe Queen", "check_in": "2099-08-01", "check_out": "2099-08-02",
        "guest_name": "Nguyen Van A", "guest_phone": "0900000000",
        "guest_email": "a@test.com", "num_guests": 2})
    assert resp.status_code == 201
    assert resp.json()["id"] == 42


def test_create_booking_returns_409_when_sold_out(monkeypatch):
    def fake_create_reservation(*args, **kwargs):
        raise agent_db.SoldOutError("Hết phòng Deluxe Queen trong khoảng đã chọn")

    monkeypatch.setattr(agent_db, "create_reservation", fake_create_reservation)
    resp = client.post("/api/bookings", json={
        "room_type": "Deluxe Queen", "check_in": "2099-08-01", "check_out": "2099-08-02",
        "guest_name": "A", "guest_phone": "090", "guest_email": "a@test.com", "num_guests": 2})
    assert resp.status_code == 409


def test_create_booking_rejects_checkout_before_checkin():
    resp = client.post("/api/bookings", json={
        "room_type": "Deluxe Queen", "check_in": "2099-08-05", "check_out": "2099-08-01",
        "guest_name": "A", "guest_phone": "090", "guest_email": "a@test.com", "num_guests": 2})
    assert resp.status_code == 422


def test_create_booking_rejects_zero_guests():
    resp = client.post("/api/bookings", json={
        "room_type": "Deluxe Queen", "check_in": "2099-08-01", "check_out": "2099-08-02",
        "guest_name": "A", "guest_phone": "090", "guest_email": "a@test.com", "num_guests": 0})
    assert resp.status_code == 422


def test_create_booking_rejects_unknown_room_type():
    resp = client.post("/api/bookings", json={
        "room_type": "Phòng Không Tồn Tại", "check_in": "2099-08-01", "check_out": "2099-08-02",
        "guest_name": "A", "guest_phone": "090", "guest_email": "a@test.com", "num_guests": 2})
    assert resp.status_code == 422


def test_create_booking_rejects_today():
    resp = client.post("/api/bookings", json={
        "room_type": "Deluxe Queen",
        "check_in": date.today().isoformat(),
        "check_out": (date.today() + timedelta(days=1)).isoformat(),
        "guest_name": "A", "guest_phone": "090", "guest_email": "a@test.com", "num_guests": 2})
    assert resp.status_code == 422

