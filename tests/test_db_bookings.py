import sqlite3
from datetime import timedelta

import pytest

from agent import clock, db


def test_init_db_creates_tables(tmp_db):
    conn = sqlite3.connect(tmp_db)
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    conn.close()
    assert {"rooms", "reservations", "service_requests", "staff_accounts", "guest_accounts",
            "staff_requests", "sessions"} <= tables


def test_available_counts_without_dates_equals_explicit_today(tmp_db):
    from datetime import timedelta
    today = clock.today().isoformat()
    tomorrow = (clock.today() + timedelta(days=1)).isoformat()
    assert (db.available_counts(["Deluxe Park Suite"], db_path=tmp_db)
            == db.available_counts(["Deluxe Park Suite"], today, tomorrow, db_path=tmp_db))


def test_available_counts_with_dates_subtracts_overlapping_reservation(tmp_db):
    db.create_reservation("Deluxe Park Suite", "2099-08-01", "2099-08-03",
                           "Nguyen Van A", "0900000000", "a@test.com", 2, db_path=tmp_db)
    counts = db.available_counts(["Deluxe Park Suite"], "2099-08-02", "2099-08-04", db_path=tmp_db)
    assert counts["Deluxe Park Suite"] == 1   # tổng 2 phòng, 1 bị chồng lấn ngày


def test_available_counts_with_dates_no_overlap_full_available(tmp_db):
    db.create_reservation("Deluxe Park Suite", "2099-08-01", "2099-08-03",
                           "Nguyen Van A", "0900000000", "a@test.com", 2, db_path=tmp_db)
    counts = db.available_counts(["Deluxe Park Suite"], "2099-08-05", "2099-08-06", db_path=tmp_db)
    assert counts["Deluxe Park Suite"] == 2   # không chồng lấn -> đủ 2 phòng


def test_create_reservation_raises_when_sold_out(tmp_db):
    db.create_reservation("Deluxe Park Suite", "2099-08-01", "2099-08-03",
                           "A", "090", "a@test.com", 2, db_path=tmp_db)
    db.create_reservation("Deluxe Park Suite", "2099-08-01", "2099-08-03",
                           "B", "091", "b@test.com", 2, db_path=tmp_db)
    with pytest.raises(db.SoldOutError):
        db.create_reservation("Deluxe Park Suite", "2099-08-01", "2099-08-03",
                              "C", "092", "c@test.com", 2, db_path=tmp_db)


def test_create_reservation_rejects_today_at_business_layer(tmp_db):
    today = clock.today().isoformat()
    tomorrow = (clock.today() + timedelta(days=1)).isoformat()
    with pytest.raises(db.InvalidDateRangeError):
        db.create_reservation("Deluxe Park Suite", today, tomorrow,
                              "A", "090", "a@test.com", 2, db_path=tmp_db)


def test_list_reservations_returns_newest_first(tmp_db):
    db.create_reservation("Deluxe Park Suite", "2099-09-01", "2099-09-02", "A", "090",
                           "a@t.com", 2, db_path=tmp_db)
    db.create_reservation("Deluxe Park Suite", "2099-09-03", "2099-09-04", "B", "091",
                           "b@t.com", 2, db_path=tmp_db)
    rows = db.list_reservations(db_path=tmp_db)
    assert rows[0]["guest_name"] == "B"
    assert rows[1]["guest_name"] == "A"


def test_list_service_requests_returns_newest_first(tmp_db):
    db.create_service_request("spa", "A", "090", "2099-09-01 10:00", 2, "note1", db_path=tmp_db)
    db.create_service_request("restaurant", "B", "091", "2099-09-02 19:00", 4, "note2", db_path=tmp_db)
    rows = db.list_service_requests(db_path=tmp_db)
    assert rows[0]["guest_name"] == "B"


def test_cancel_reservation_sets_status_cancelled(tmp_db):
    res = db.create_reservation("Deluxe Park Suite", "2099-09-10", "2099-09-11", "A", "090",
                                 "a@t.com", 2, db_path=tmp_db)
    assert db.cancel_reservation(res["id"], db_path=tmp_db) is True
    assert db.list_reservations(db_path=tmp_db)[0]["status"] == "cancelled"


def test_cancel_reservation_frees_up_availability(tmp_db):
    res = db.create_reservation("Deluxe Park Suite", "2099-09-10", "2099-09-11", "A", "090",
                                 "a@t.com", 2, db_path=tmp_db)
    before = db.available_counts(["Deluxe Park Suite"], "2099-09-10", "2099-09-11", db_path=tmp_db)
    db.cancel_reservation(res["id"], db_path=tmp_db)
    after = db.available_counts(["Deluxe Park Suite"], "2099-09-10", "2099-09-11", db_path=tmp_db)
    assert after["Deluxe Park Suite"] == before["Deluxe Park Suite"] + 1


def test_cancel_reservation_unknown_id_returns_false(tmp_db):
    assert db.cancel_reservation(999999, db_path=tmp_db) is False


def test_cancel_service_request_sets_status_cancelled(tmp_db):
    out = db.create_service_request("spa", "A", "090", "2099-09-01 10:00", 2, "note", db_path=tmp_db)
    assert db.cancel_service_request(out["id"], db_path=tmp_db) is True
    assert db.list_service_requests(db_path=tmp_db)[0]["status"] == "cancelled"


def test_cancel_service_request_unknown_id_returns_false(tmp_db):
    assert db.cancel_service_request(999999, db_path=tmp_db) is False


def test_hash_password_roundtrips_via_verify_password(tmp_db):
    hashed = db.hash_password("s3cret")
    assert db.verify_password("s3cret", hashed) is True
    assert db.verify_password("wrong", hashed) is False


def test_hash_password_is_salted_differently_each_call(tmp_db):
    assert db.hash_password("s3cret") != db.hash_password("s3cret")


def test_create_staff_account_inserts_row(tmp_db):
    result = db.create_staff_account("nv1", "pass123", "staff", db_path=tmp_db)
    assert result == {"username": "nv1", "role": "staff", "created_at": result["created_at"]}
    assert db.verify_staff_login("nv1", "pass123", db_path=tmp_db) == "staff"


def test_create_staff_account_rejects_invalid_role(tmp_db):
    with pytest.raises(ValueError):
        db.create_staff_account("nv1", "pass123", "manager", db_path=tmp_db)


def test_create_staff_account_rejects_duplicate_username(tmp_db):
    db.create_staff_account("nv1", "pass123", "staff", db_path=tmp_db)
    with pytest.raises(db.DuplicateUsernameError):
        db.create_staff_account("nv1", "other", "staff", db_path=tmp_db)


def test_list_staff_accounts_excludes_password(tmp_db):
    db.create_staff_account("nv1", "pass123", "staff", db_path=tmp_db)
    rows = {r["username"]: r for r in db.list_staff_accounts(db_path=tmp_db)}
    assert set(rows["nv1"].keys()) == {"username", "role", "created_at"}


def test_delete_staff_account_removes_row(tmp_db):
    db.create_staff_account("nv1", "pass123", "staff", db_path=tmp_db)
    assert db.delete_staff_account("nv1", db_path=tmp_db) is True
    usernames = {r["username"] for r in db.list_staff_accounts(db_path=tmp_db)}
    assert "nv1" not in usernames


def test_delete_staff_account_unknown_returns_false(tmp_db):
    assert db.delete_staff_account("khong-ton-tai", db_path=tmp_db) is False


def test_delete_reservation_cascades_to_guest_account(tmp_db):
    res = db.create_reservation("Deluxe Park Suite", "2099-09-10", "2099-09-11", "Nguyen Van A",
                                 "0900000000", "a@t.com", 2, db_path=tmp_db)
    assert db.get_guest_contact(res["id"], db_path=tmp_db) == ("Nguyen Van A", "0900000000")
    db.delete_reservation(res["id"], db_path=tmp_db)
    assert db.get_guest_contact(res["id"], db_path=tmp_db) == (None, None)
    conn = sqlite3.connect(tmp_db)
    row = conn.execute("SELECT COUNT(*) FROM guest_accounts WHERE reservation_id=?",
                        (res["id"],)).fetchone()
    conn.close()
    assert row[0] == 0


def test_get_guest_contact_returns_reservation_name_phone(tmp_db):
    res = db.create_reservation("Deluxe Park Suite", "2099-09-10", "2099-09-11", "Nguyen Van A",
                                 "0900000000", "a@t.com", 2, db_path=tmp_db)
    assert db.get_guest_contact(res["id"], db_path=tmp_db) == ("Nguyen Van A", "0900000000")


def test_get_guest_contact_unknown_reservation_returns_none(tmp_db):
    assert db.get_guest_contact(999999, db_path=tmp_db) == (None, None)


def test_create_service_request_inserts_row(tmp_db):
    out = db.create_service_request("spa", "A", "090", "2099-08-01 15:00", 2, "massage",
                                     db_path=tmp_db)
    assert out["status"] == "received"
    conn = sqlite3.connect(tmp_db)
    row = conn.execute("SELECT service_type FROM service_requests WHERE id=?",
                        (out["id"],)).fetchone()
    conn.close()
    assert row[0] == "spa"


def test_checkout_expired_stays_completes_booking_and_removes_guest_access(tmp_db):
    yesterday = (clock.today() - timedelta(days=1)).isoformat()
    today = clock.today().isoformat()
    tomorrow = (clock.today() + timedelta(days=1)).isoformat()
    day_after = (clock.today() + timedelta(days=2)).isoformat()
    res = db.create_reservation("Deluxe Park Suite", tomorrow, day_after, "A", "090",
                                "a@t.com", 2, db_path=tmp_db)
    session_id = db.create_session("guest_account", str(res["id"]), "guest", db_path=tmp_db)
    conn = sqlite3.connect(tmp_db)
    conn.execute("UPDATE reservations SET check_in=?, check_out=? WHERE id=?",
                 (yesterday, today, res["id"]))
    conn.commit()
    conn.close()

    assert db.checkout_expired_stays(tmp_db) == 1

    conn = sqlite3.connect(tmp_db)
    status = conn.execute("SELECT status FROM reservations WHERE id=?", (res["id"],)).fetchone()[0]
    account_count = conn.execute(
        "SELECT COUNT(*) FROM guest_accounts WHERE reservation_id=?", (res["id"],)).fetchone()[0]
    session_count = conn.execute(
        "SELECT COUNT(*) FROM sessions WHERE session_id=?", (session_id,)).fetchone()[0]
    conn.close()
    assert status == "completed"
    assert account_count == 0
    assert session_count == 0

