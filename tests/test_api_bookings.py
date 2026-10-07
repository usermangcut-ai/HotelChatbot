from fastapi.testclient import TestClient
from datetime import timedelta

from agent import clock, db as agent_db
from api.main import app

client = TestClient(app)


def test_list_rooms_returns_all_room_types():
    resp = client.get("/api/rooms")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 8
    by_type = {r["room_type"]: r for r in data}
    queen = by_type["Deluxe Queen"]
    assert queen == {"room_type": "Deluxe Queen", "price_vnd": 3150000, "size_m2": 32,
                     "max_occupancy": 2, "view": "Tiêu chuẩn", "bed_type": "1 giường Queen",
                     "image_url": "/images/room_deluxe_queen.jpg", "total_rooms": 3}
    assert sum(r["total_rooms"] for r in data) == 22


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
        "check_in": clock.today().isoformat(),
        "check_out": (clock.today() + timedelta(days=1)).isoformat(),
        "guest_name": "A", "guest_phone": "090", "guest_email": "a@test.com", "num_guests": 2})
    assert resp.status_code == 422



def test_availability_counts_free_rooms_for_dates():
    resp = client.get("/api/availability", params={"room_type": "Deluxe Park Suite",
                                                   "check_in": "2099-03-01", "check_out": "2099-03-03"})
    assert resp.status_code == 200
    assert resp.json() == {"room_type": "Deluxe Park Suite", "check_in": "2099-03-01",
                           "check_out": "2099-03-03", "available": 2}


def test_availability_rejects_unknown_room_and_bad_dates():
    assert client.get("/api/availability", params={"room_type": "Phòng Ma", "check_in": "2099-03-01",
                                                   "check_out": "2099-03-03"}).status_code == 422
    assert client.get("/api/availability", params={"room_type": "Deluxe Queen", "check_in": "2099-03-03",
                                                   "check_out": "2099-03-01"}).status_code == 422
    assert client.get("/api/availability", params={"room_type": "Deluxe Queen", "check_in": "03/01/2099",
                                                   "check_out": "2099-03-05"}).status_code == 422
