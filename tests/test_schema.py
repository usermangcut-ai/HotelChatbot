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
