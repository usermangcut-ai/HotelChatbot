import json
import sqlite3

import pytest

from agent import db, schema
from agent.schema import init_db


def _scalar(path, sql, params=()):
    conn = sqlite3.connect(path)
    try:
        return conn.execute(sql, params).fetchone()[0]
    finally:
        conn.close()


def test_init_db_on_empty_storage_seeds_all_rooms(tmp_path):
    path = str(tmp_path / "chua-co" / "hotel.db")   # thư mục chưa tồn tại — như volume mới
    init_db(path)
    assert _scalar(path, "SELECT COUNT(*) FROM rooms") == 22
    counts = db.available_counts(check_in="2099-01-01", check_out="2099-01-02", db_path=path)
    assert sum(counts.values()) == 22


def test_init_db_is_idempotent(tmp_db):
    init_db(tmp_db)
    init_db(tmp_db)
    assert _scalar(tmp_db, "SELECT COUNT(*) FROM rooms") == 22


def test_init_db_sets_latest_schema_version(tmp_db):
    assert _scalar(tmp_db, "PRAGMA user_version") == len(schema.MIGRATIONS)


def test_init_db_rejects_unknown_room_type(tmp_path):
    rooms = tmp_path / "rooms.json"
    rooms.write_text(json.dumps([{"room_id": "999", "room_type": "Phòng Ma", "floor": 9}]),
                     encoding="utf-8")
    with pytest.raises(ValueError, match="999"):
        init_db(str(tmp_path / "hotel.db"), rooms_path=str(rooms))


def test_init_db_seeds_admin_only_when_password_given(tmp_path):
    no_pw = str(tmp_path / "a.db")
    init_db(no_pw, admin_password="")
    assert _scalar(no_pw, "SELECT COUNT(*) FROM staff_accounts") == 0

    with_pw = str(tmp_path / "b.db")
    init_db(with_pw, admin_username="boss", admin_password="S3cret!pass")
    assert db.verify_staff_login("boss", "S3cret!pass", db_path=with_pw) == "admin"


def test_init_db_does_not_reseed_admin_when_accounts_exist(tmp_path):
    path = str(tmp_path / "hotel.db")
    init_db(path, admin_username="boss", admin_password="first")
    init_db(path, admin_username="boss2", admin_password="second")
    assert _scalar(path, "SELECT COUNT(*) FROM staff_accounts") == 1


def test_migrates_legacy_db_to_latest(tmp_path):
    import hashlib

    path = str(tmp_path / "legacy.db")
    conn = sqlite3.connect(path)
    schema._v1_base_schema(conn)   # đúng hình dạng hotel.db cũ, user_version vẫn = 0
    conn.execute("CREATE TABLE room_types (room_type TEXT PRIMARY KEY, price_vnd INTEGER)")
    conn.execute("INSERT INTO rooms (room_id, room_type, floor, available) "
                 "VALUES ('504', 'Deluxe Park Suite', 5, 1)")
    conn.execute("INSERT INTO staff_accounts (username, password_hash, role, created_at, "
                 "password_plain) VALUES ('boss', ?, 'admin', '2026-07-01T00:00:00', 'oldpw')",
                 (hashlib.sha256(b"oldpw").hexdigest(),))
    conn.execute("INSERT INTO reservations (id, room_type, check_in, check_out, guest_name, status, "
                 "created_at, room_id) VALUES (1, 'Deluxe Park Suite', '2099-01-01', '2099-01-03', "
                 "'A', 'paid', '2026-07-01T00:00:00', '504')")
    conn.execute("INSERT INTO guest_accounts (room_id, password_hash, reservation_id, created_at, "
                 "password_plain) VALUES ('504', ?, 1, '2026-07-01T00:00:00', 'g1')",
                 (hashlib.sha256(b"g1").hexdigest(),))
    conn.execute("INSERT INTO guest_accounts (room_id, password_hash, reservation_id, created_at) "
                 "VALUES ('505', 'x', NULL, '2026-07-01T00:00:00')")
    conn.execute("INSERT INTO sessions VALUES ('s-guest', 'guest_account', '504', 'guest', "
                 "'2026-07-01T00:00:00', '2099-01-01T00:00:00')")
    conn.commit()
    conn.close()

    init_db(path, admin_password="")

    conn = sqlite3.connect(path)
    try:
        assert conn.execute("PRAGMA user_version").fetchone()[0] == len(schema.MIGRATIONS)
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert "room_types" not in tables
        assert "available" not in schema._columns(conn, "rooms")
        assert "password_plain" not in schema._columns(conn, "staff_accounts")
        assert "password_plain" not in schema._columns(conn, "guest_accounts")
        assert "reservation_id" in schema._columns(conn, "staff_requests")
        assert "reservation_id" in schema._columns(conn, "service_requests")
        rows = conn.execute("SELECT reservation_id, room_id, password_hash FROM guest_accounts").fetchall()
        assert [(r[0], r[1]) for r in rows] == [(1, "504")]
        assert db.verify_password("g1", rows[0][2])
        assert conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0
        assert conn.execute("SELECT COUNT(*) FROM reservations").fetchone()[0] == 1
    finally:
        conn.close()
    assert db.verify_staff_login("boss", "oldpw", db_path=path) == "admin"
