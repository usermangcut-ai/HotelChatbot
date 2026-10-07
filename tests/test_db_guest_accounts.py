import sqlite3
from datetime import timedelta

import pytest

from agent import clock, db


def _book(tmp_db, start_in_days=30, nights=2, name="A", room_type="Deluxe Park Suite"):
    start = clock.today() + timedelta(days=start_in_days)
    return db.create_reservation(room_type, start.isoformat(),
                                 (start + timedelta(days=nights)).isoformat(),
                                 name, "090", "a@t.com", 2, db_path=tmp_db)


def _move_to_today(tmp_db, reservation_id, nights=2):
    """Booking chỉ tạo được cho ngày tương lai — dời ngày để giả lập khách ĐANG lưu trú."""
    today = clock.today()
    conn = sqlite3.connect(tmp_db)
    conn.execute("UPDATE reservations SET check_in=?, check_out=? WHERE id=?",
                 (today.isoformat(), (today + timedelta(days=nights)).isoformat(), reservation_id))
    conn.commit()
    conn.close()


def test_guest_password_is_long_random(tmp_db):
    assert len(_book(tmp_db)["guest_password"]) >= 12


def test_staying_guest_can_log_in(tmp_db):
    res = _book(tmp_db)
    _move_to_today(tmp_db, res["id"])
    assert db.verify_guest_login(res["room_id"], res["guest_password"], db_path=tmp_db) == res["id"]


def test_wrong_password_returns_none(tmp_db):
    res = _book(tmp_db)
    _move_to_today(tmp_db, res["id"])
    assert db.verify_guest_login(res["room_id"], "sai-mat-khau", db_path=tmp_db) is None


def test_login_before_check_in_raises_with_date(tmp_db):
    res = _book(tmp_db)
    with pytest.raises(db.StayNotStartedError) as exc:
        db.verify_guest_login(res["room_id"], res["guest_password"], db_path=tmp_db)
    assert exc.value.check_in == res["check_in"]


def test_future_booking_does_not_overwrite_current_guest(tmp_db):
    current = _book(tmp_db, name="Dang o")
    _move_to_today(tmp_db, current["id"])
    future = _book(tmp_db, start_in_days=60, name="Thang sau")
    assert future["room_id"] == current["room_id"]   # cùng phòng vật lý — đúng kịch bản lỗi cũ
    assert db.verify_guest_login(current["room_id"], current["guest_password"],
                                 db_path=tmp_db) == current["id"]


def test_session_of_staying_guest_carries_room_id(tmp_db):
    res = _book(tmp_db)
    _move_to_today(tmp_db, res["id"])
    sid = db.create_session("guest_account", str(res["id"]), "guest", db_path=tmp_db)
    assert db.get_session(sid, db_path=tmp_db) == {
        "identity_type": "guest_account", "identity_id": str(res["id"]), "role": "guest",
        "room_id": res["room_id"]}


def test_guest_session_invalid_after_booking_cancelled(tmp_db):
    res = _book(tmp_db)
    _move_to_today(tmp_db, res["id"])
    sid = db.create_session("guest_account", str(res["id"]), "guest", db_path=tmp_db)
    db.cancel_reservation(res["id"], db_path=tmp_db)
    assert db.get_session(sid, db_path=tmp_db) is None


def test_expired_session_returns_none(tmp_db):
    sid = db.create_session("staff_account", "nv1", "staff", ttl_hours=-1, db_path=tmp_db)
    assert db.get_session(sid, db_path=tmp_db) is None


def test_staff_requests_filtered_by_reservation(tmp_db):
    mine = db.create_staff_request("504", "Dọn phòng", "", reservation_id=1, db_path=tmp_db)
    db.create_staff_request("504", "Báo hỏng", "", reservation_id=2, db_path=tmp_db)
    rows = db.list_staff_requests(reservation_id=1, db_path=tmp_db)
    assert [r["id"] for r in rows] == [mine["id"]]
    assert mine["request_type"] == "Dọn phòng" and mine["status"] == "received"
    assert mine["created_at"]


def test_no_plaintext_password_columns(tmp_db):
    conn = sqlite3.connect(tmp_db)
    try:
        for table in ("staff_accounts", "guest_accounts"):
            cols = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
            assert "password_plain" not in cols
    finally:
        conn.close()


def test_guest_login_anytime_flag_allows_login_before_check_in(tmp_db, monkeypatch):
    monkeypatch.setattr(db, "GUEST_LOGIN_ANYTIME", True)
    res = _book(tmp_db)   # nhận phòng sau 30 ngày
    assert db.verify_guest_login(res["room_id"], res["guest_password"], db_path=tmp_db) == res["id"]
    sid = db.create_session("guest_account", str(res["id"]), "guest", db_path=tmp_db)
    assert db.get_session(sid, db_path=tmp_db)["room_id"] == res["room_id"]
