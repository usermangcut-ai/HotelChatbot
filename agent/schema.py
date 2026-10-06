"""Tạo & nâng cấp hotel.db: migration đánh số (PRAGMA user_version) + seed phòng/admin.

Gọi init_db() MỘT lần lúc app khởi động (FastAPI lifespan / CLI / eval). Import module này KHÔNG ghi
gì vào DB.

Thêm/sửa schema về sau = viết thêm một hàm _vN rồi nối vào cuối MIGRATIONS — KHÔNG sửa migration cũ
(DB trên server đã chạy chúng rồi, sửa lại sẽ không bao giờ được chạy lần nữa).
"""
import json
import logging
import os
import sqlite3

from agent import clock, knowledge
from agent.config import ADMIN_PASSWORD, ADMIN_USERNAME, DB_PATH, ROOMS_PATH
from agent.db import checkout_expired_stays, hash_password

log = logging.getLogger(__name__)


def _columns(conn, table):
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}


def _v1_base_schema(conn):
    """Schema gốc trước khi có migration đánh số. Viết idempotent để chạy được trên cả DB trống lẫn
    hotel.db cũ (user_version = 0) đã có sẵn bảng."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            room_id TEXT PRIMARY KEY, room_type TEXT, floor INTEGER, available INTEGER)""")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_type TEXT NOT NULL, check_in TEXT NOT NULL, check_out TEXT NOT NULL,
            guest_name TEXT, guest_phone TEXT, guest_email TEXT, num_guests INTEGER,
            status TEXT NOT NULL, created_at TEXT NOT NULL)""")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS service_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_type TEXT NOT NULL, guest_name TEXT, guest_phone TEXT, requested_at TEXT,
            party_size INTEGER, note TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL)""")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS staff_accounts (
            username TEXT PRIMARY KEY, password_hash TEXT NOT NULL, role TEXT NOT NULL,
            created_at TEXT NOT NULL)""")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS guest_accounts (
            room_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, reservation_id INTEGER,
            created_at TEXT NOT NULL)""")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS staff_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id TEXT, request_type TEXT NOT NULL, note TEXT, status TEXT NOT NULL,
            created_at TEXT NOT NULL)""")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY, identity_type TEXT NOT NULL, identity_id TEXT NOT NULL,
            role TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL)""")
    if "room_id" not in _columns(conn, "reservations"):
        conn.execute("ALTER TABLE reservations ADD COLUMN room_id TEXT")
    for table in ("guest_accounts", "staff_accounts"):
        if "password_plain" not in _columns(conn, table):
            conn.execute(f"ALTER TABLE {table} ADD COLUMN password_plain TEXT")


def _v2_hardening(conn):
    """Bỏ mật khẩu plaintext; tài khoản khách theo TỪNG booking (không còn khóa theo số phòng — booking
    sau ghi đè khách đang ở); gắn yêu cầu với booking; dọn bảng/cột phòng lỗi thời."""
    # 1. Chuyển hash cũ (SHA-256 trần) sang bcrypt, dùng password_plain lần cuối rồi xóa cột.
    for table, key in (("staff_accounts", "username"), ("guest_accounts", "room_id")):
        rows = conn.execute(f"SELECT {key}, password_hash, password_plain FROM {table}").fetchall()
        for ident, pwd_hash, plain in rows:
            if plain and not (pwd_hash or "").startswith("$2"):
                conn.execute(f"UPDATE {table} SET password_hash=? WHERE {key}=?",
                             (hash_password(plain), ident))
    conn.execute("ALTER TABLE staff_accounts DROP COLUMN password_plain")

    # 2. guest_accounts: khóa chính reservation_id. Tài khoản cũ không gắn booking nào bị bỏ.
    conn.execute("""
        CREATE TABLE guest_accounts_v2 (
            reservation_id INTEGER PRIMARY KEY, room_id TEXT NOT NULL,
            password_hash TEXT NOT NULL, created_at TEXT NOT NULL)""")
    conn.execute("INSERT OR IGNORE INTO guest_accounts_v2 "
                 "(reservation_id, room_id, password_hash, created_at) "
                 "SELECT reservation_id, room_id, password_hash, created_at FROM guest_accounts "
                 "WHERE reservation_id IS NOT NULL")
    conn.execute("DROP TABLE guest_accounts")
    conn.execute("ALTER TABLE guest_accounts_v2 RENAME TO guest_accounts")
    conn.execute("CREATE INDEX idx_guest_accounts_room ON guest_accounts(room_id)")

    # 3. rooms: bỏ cột available (lỗi thời — phòng trống tính động từ reservations); bỏ room_types
    #    (giá/thông số lấy từ knowledge.json).
    conn.execute("""
        CREATE TABLE rooms_v2 (
            room_id TEXT PRIMARY KEY, room_type TEXT NOT NULL, floor INTEGER)""")
    conn.execute("INSERT INTO rooms_v2 (room_id, room_type, floor) "
                 "SELECT room_id, room_type, floor FROM rooms")
    conn.execute("DROP TABLE rooms")
    conn.execute("ALTER TABLE rooms_v2 RENAME TO rooms")
    conn.execute("DROP TABLE IF EXISTS room_types")

    # 4. Yêu cầu gắn với booking — khách chỉ thấy yêu cầu của chính lượt lưu trú của mình.
    conn.execute("ALTER TABLE staff_requests ADD COLUMN reservation_id INTEGER")
    conn.execute("ALTER TABLE service_requests ADD COLUMN reservation_id INTEGER")

    # 5. Phiên khách cũ lưu identity_id = số phòng; từ v2 là reservation_id → hủy để đăng nhập lại.
    conn.execute("DELETE FROM sessions WHERE identity_type='guest_account'")


MIGRATIONS = [_v1_base_schema, _v2_hardening]


def migrate(conn):
    """Chạy các migration chưa áp dụng, theo thứ tự, rồi ghi lại số phiên bản."""
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    for number, step in enumerate(MIGRATIONS[version:], start=version + 1):
        step(conn)
        conn.execute(f"PRAGMA user_version = {number}")


def seed_rooms(conn, rooms_path=ROOMS_PATH):
    """Thêm phòng còn thiếu từ rooms.json. Phòng đã có giữ nguyên, không xóa (giữ lịch sử booking)."""
    with open(rooms_path, encoding="utf-8") as f:
        rooms = json.load(f)
    valid = set(knowledge.room_titles())
    bad = [r["room_id"] for r in rooms if r["room_type"] not in valid]
    if bad:
        raise ValueError(f"rooms.json: hạng phòng không có trong knowledge.json ở phòng "
                         f"{', '.join(bad)}")
    conn.executemany("INSERT OR IGNORE INTO rooms (room_id, room_type, floor) VALUES (?,?,?)",
                     [(r["room_id"], r["room_type"], r.get("floor")) for r in rooms])


def seed_admin(conn, username=ADMIN_USERNAME, password=ADMIN_PASSWORD):
    """Tạo admin đầu tiên khi bảng staff_accounts trống VÀ có mật khẩu cấu hình. Trả True nếu đã tạo."""
    if conn.execute("SELECT COUNT(*) FROM staff_accounts").fetchone()[0]:
        return False
    if not password:
        log.warning("Chưa có tài khoản nhân viên nào và ADMIN_PASSWORD trống — không tạo admin.")
        return False
    conn.execute("INSERT INTO staff_accounts (username, password_hash, role, created_at) "
                 "VALUES (?,?,?,?)", (username, hash_password(password), "admin", clock.now_iso()))
    return True


def init_db(db_path=DB_PATH, rooms_path=ROOMS_PATH, admin_username=ADMIN_USERNAME,
            admin_password=ADMIN_PASSWORD):
    """Đưa DB tại db_path về trạng thái sẵn sàng: migrate → seed phòng → seed admin (trong MỘT
    transaction — lỗi giữa chừng thì không thay đổi gì), rồi chốt các booking đã qua ngày trả phòng."""
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    conn = sqlite3.connect(db_path, isolation_level=None)   # tự quản lý transaction
    try:
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("BEGIN IMMEDIATE")
        try:
            migrate(conn)
            seed_rooms(conn, rooms_path)
            seed_admin(conn, admin_username, admin_password)
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise
    finally:
        conn.close()
    checkout_expired_stays(db_path)
