"""Đọc hotel.db chỉ-đọc để đếm phòng; ghi RW có kiểm soát cho đặt phòng/yêu cầu dịch vụ.

Sau mỗi lần ghi, tự xuất thêm 1 bản sao chỉ-để-đọc ra data/hotel_view.json (xem _export_json_view) —
SQLite vẫn là nguồn dữ liệu thật duy nhất, file JSON chỉ để mở bằng text editor xem nhanh, KHÔNG bao
giờ được code đọc lại."""
import json
import os
import secrets
import sqlite3
from datetime import timedelta

import bcrypt

from agent import clock
from agent.config import DB_PATH

_VIEW_PATH = os.path.join(os.path.dirname(DB_PATH), "hotel_view.json")


def hash_password(raw):
    """bcrypt — có salt ngẫu nhiên riêng mỗi lần hash (2 lần hash cùng 1 mật khẩu ra 2 chuỗi khác
    nhau), cố ý chậm để chống brute-force. KHÔNG so sánh bằng == — dùng verify_password()."""
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(raw, hashed):
    return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))


class SoldOutError(Exception):
    """Ném ra khi hạng phòng đã hết trống trong khoảng ngày yêu cầu."""


class InvalidDateRangeError(Exception):
    """Ném ra khi check_out không sau check_in."""


def _connect(db_path=DB_PATH):
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.execute("PRAGMA busy_timeout=5000")   # chờ tối đa 5s thay vì lỗi ngay khi có writer khác
    return conn


def _connect_rw(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA journal_mode=WAL")    # cho phép đọc song song trong lúc đang ghi
    return conn


def _ensure_schema(db_path=DB_PATH):
    """Tạo bảng reservations/service_requests nếu chưa có (idempotent)."""
    conn = _connect_rw(db_path)
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_type TEXT NOT NULL,
                check_in TEXT NOT NULL,
                check_out TEXT NOT NULL,
                guest_name TEXT, guest_phone TEXT, guest_email TEXT,
                num_guests INTEGER,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS service_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_type TEXT NOT NULL,
                guest_name TEXT, guest_phone TEXT,
                requested_at TEXT,
                party_size INTEGER, note TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS staff_accounts (
                username TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS guest_accounts (
                room_id TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                reservation_id INTEGER,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS staff_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id TEXT,
                request_type TEXT NOT NULL,
                note TEXT,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                identity_type TEXT NOT NULL,
                identity_id TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
        """)
        cols = {row[1] for row in conn.execute("PRAGMA table_info(reservations)").fetchall()}
        if "room_id" not in cols:
            conn.execute("ALTER TABLE reservations ADD COLUMN room_id TEXT")
        cols = {row[1] for row in conn.execute("PRAGMA table_info(guest_accounts)").fetchall()}
        if "password_plain" not in cols:
            conn.execute("ALTER TABLE guest_accounts ADD COLUMN password_plain TEXT")
        cols = {row[1] for row in conn.execute("PRAGMA table_info(staff_accounts)").fetchall()}
        if "password_plain" not in cols:
            conn.execute("ALTER TABLE staff_accounts ADD COLUMN password_plain TEXT")
        # backfill admin mặc định tạo trước khi có cột này — mật khẩu demo công khai (README), không
        # phải bí mật rò rỉ thêm.
        conn.execute(
            "UPDATE staff_accounts SET password_plain='admin123' "
            "WHERE username='admin' AND password_plain IS NULL")
        # migrate hash cũ (SHA-256 trần) sang bcrypt — tận dụng password_plain vừa có để rehash đúng,
        # dòng nào không có password_plain (tạo trước khi lưu plaintext) sẽ giữ hash cũ, không login
        # lại được bằng mật khẩu cũ cho tới khi reset (chấp nhận được, đã biết trước).
        _migrate_to_bcrypt(conn, "staff_accounts", "username")
        _migrate_to_bcrypt(conn, "guest_accounts", "room_id")
        conn.commit()
    finally:
        conn.close()


def _migrate_to_bcrypt(conn, table, id_col):
    rows = conn.execute(f"SELECT {id_col}, password_hash, password_plain FROM {table}").fetchall()
    for ident, pwd_hash, pwd_plain in rows:
        if pwd_plain and not (pwd_hash or "").startswith("$2"):
            conn.execute(f"UPDATE {table} SET password_hash=? WHERE {id_col}=?",
                         (hash_password(pwd_plain), ident))


def seed_default_admin(username="admin", password="admin123", db_path=DB_PATH):
    """Tạo tài khoản admin mặc định nếu bảng staff_accounts còn trống (demo/first-run only)."""
    conn = _connect_rw(db_path)
    try:
        row = conn.execute("SELECT COUNT(*) FROM staff_accounts").fetchone()
        if row[0] == 0:
            now = clock.now_iso()
            conn.execute(
                "INSERT INTO staff_accounts (username, password_hash, password_plain, role, "
                "created_at) VALUES (?,?,?,?,?)",
                (username, hash_password(password), password, "admin", now))
            conn.commit()
    finally:
        conn.close()


class DuplicateUsernameError(Exception):
    """Ném ra khi tạo staff_account với username đã tồn tại."""


def create_staff_account(username, password, role, db_path=DB_PATH):
    """Admin tạo tài khoản nhân viên/admin mới. role phải là 'staff' hoặc 'admin'."""
    if role not in ("staff", "admin"):
        raise ValueError("role phải là 'staff' hoặc 'admin'")
    conn = _connect_rw(db_path)
    try:
        exists = conn.execute("SELECT 1 FROM staff_accounts WHERE username=?",
                               (username,)).fetchone()
        if exists:
            raise DuplicateUsernameError(f"Tên đăng nhập '{username}' đã tồn tại.")
        now = clock.now_iso()
        conn.execute(
            "INSERT INTO staff_accounts (username, password_hash, password_plain, role, "
            "created_at) VALUES (?,?,?,?,?)",
            (username, hash_password(password), password, role, now))
        conn.commit()
        return {"username": username, "role": role, "created_at": now}
    finally:
        conn.close()
        _export_json_view(db_path)


def change_staff_password(username, old_password, new_password, db_path=DB_PATH):
    """Tự đổi mật khẩu của chính tài khoản đang đăng nhập (staff/admin). Trả True nếu đổi thành
    công, False nếu old_password sai hoặc tài khoản không tồn tại."""
    conn = _connect_rw(db_path)
    try:
        row = conn.execute("SELECT password_hash FROM staff_accounts WHERE username=?",
                            (username,)).fetchone()
        if not row or not verify_password(old_password, row[0]):
            return False
        conn.execute(
            "UPDATE staff_accounts SET password_hash=?, password_plain=? WHERE username=?",
            (hash_password(new_password), new_password, username))
        conn.commit()
        return True
    finally:
        conn.close()
        _export_json_view(db_path)


def list_staff_accounts(db_path=DB_PATH):
    """Danh sách tài khoản nhân viên/admin CHO ADMIN XEM QUA API — KHÔNG có password (khác
    _list_staff_accounts_public vốn chỉ dành riêng cho hotel_view.json local)."""
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT username, role, created_at FROM staff_accounts ORDER BY created_at DESC"
        ).fetchall()
        return [{"username": r[0], "role": r[1], "created_at": r[2]} for r in rows]
    finally:
        conn.close()


def delete_staff_account(username, db_path=DB_PATH):
    """Admin xóa 1 tài khoản nhân viên/admin. Trả True nếu có dòng bị xóa."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("DELETE FROM staff_accounts WHERE username=?", (username,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
        _export_json_view(db_path)


def _list_staff_accounts_public(db_path=DB_PATH):
    """staff_accounts kèm password PLAINTEXT (KHÔNG có password_hash) — chỉ để xuất ra
    data/hotel_view.json cho việc test đăng nhập cục bộ, file này không qua git/server, chỉ mở bằng
    text editor. Chấp nhận lưu plaintext vì phạm vi CHỈ trong file local này (quyết định 2026-07-21)."""
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT username, password_plain, role, created_at FROM staff_accounts").fetchall()
        return [{"username": r[0], "password": r[1], "role": r[2], "created_at": r[3]}
                for r in rows]
    finally:
        conn.close()


def _list_guest_accounts_public(db_path=DB_PATH):
    """guest_accounts kèm password PLAINTEXT + tên/SĐT join từ reservation (KHÔNG có password_hash)
    — cùng lý do với _list_staff_accounts_public. Tài khoản tạo TRƯỚC khi có cột password_plain sẽ
    hiện password=null (không thể phục hồi từ hash), chỉ tài khoản mới có đủ."""
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT g.room_id, g.password_plain, g.reservation_id, g.created_at, "
            "r.guest_name, r.guest_phone FROM guest_accounts g "
            "LEFT JOIN reservations r ON r.id = g.reservation_id "
            "ORDER BY g.created_at DESC").fetchall()
        return [{"room_id": r[0], "password": r[1], "guest_name": r[4], "guest_phone": r[5],
                  "reservation_id": r[2], "created_at": r[3]} for r in rows]
    finally:
        conn.close()


def _rooms_status_public(db_path=DB_PATH):
    """Trạng thái từng phòng vật lý HÔM NAY (đang có khách ở hay trống) — tính động từ reservations
    'paid' chồng ngày hôm nay, KHÔNG dùng cờ tĩnh rooms.available (đã lỗi thời, xem available_counts).
    Chỉ để xuất ra hotel_view.json xem nhanh phòng nào còn trống."""
    today = clock.today().isoformat()
    conn = _connect(db_path)
    try:
        rooms = conn.execute(
            "SELECT room_id, room_type, floor FROM rooms ORDER BY room_id").fetchall()
        occupied = {r[0]: r for r in conn.execute(
            "SELECT room_id, guest_name, guest_phone, check_out FROM reservations "
            "WHERE status='paid' AND room_id IS NOT NULL AND check_in <= ? AND check_out > ?",
            (today, today)).fetchall()}
        out = []
        for room_id, room_type, floor in rooms:
            info = occupied.get(room_id)
            out.append({
                "room_id": room_id, "room_type": room_type, "floor": floor,
                "status": "occupied" if info else "trống",
                "guest_name": info[1] if info else None,
                "guest_phone": info[2] if info else None,
                "check_out": info[3] if info else None,
            })
        return out
    finally:
        conn.close()


def checkout_expired_stays(db_path=DB_PATH, as_of=None):
    """Hoàn tất booking tới ngày trả phòng và thu hồi account/session của khách."""
    cutoff = as_of or clock.today().isoformat()
    conn = _connect_rw(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        expired = conn.execute(
            "SELECT id, room_id FROM reservations WHERE status='paid' AND check_out <= ?",
            (cutoff,)).fetchall()
        if expired:
            reservation_ids = [row[0] for row in expired]
            room_ids = list({row[1] for row in expired if row[1]})
            reservation_marks = ",".join("?" * len(reservation_ids))
            conn.execute(
                f"UPDATE reservations SET status='completed' WHERE id IN ({reservation_marks})",
                reservation_ids)
            conn.execute(
                f"DELETE FROM guest_accounts WHERE reservation_id IN ({reservation_marks})",
                reservation_ids)
            if room_ids:
                room_marks = ",".join("?" * len(room_ids))
                conn.execute(
                    f"DELETE FROM sessions WHERE identity_type='guest_account' "
                    f"AND identity_id IN ({room_marks})",
                    room_ids)
        conn.commit()
    finally:
        conn.close()
    if expired:
        _export_json_view(db_path)
    return len(expired)


def _export_json_view(db_path=DB_PATH):
    """Ghi lại toàn bộ dữ liệu hiện tại ra data/hotel_view.json — gọi sau MỌI lần ghi vào SQLite, để
    file này luôn khớp thật với DB. Chỉ để người xem mở bằng text editor, không phải nguồn dữ liệu —
    app KHÔNG BAO GIỜ đọc lại file này, chỉ ghi."""
    snapshot = {
        "rooms_status": _rooms_status_public(db_path),
        "reservations": list_reservations(limit=1000, db_path=db_path),
        "service_requests": list_service_requests(limit=1000, db_path=db_path),
        "staff_requests": list_staff_requests(limit=1000, db_path=db_path),
        "staff_accounts": _list_staff_accounts_public(db_path),
        "guest_accounts": _list_guest_accounts_public(db_path),
    }
    view_path = os.path.join(os.path.dirname(db_path), "hotel_view.json")
    with open(view_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)


_ensure_schema()   # chạy 1 lần khi module được import — đảm bảo hotel.db thật có đủ bảng
seed_default_admin()   # tài khoản admin/admin123 mặc định nếu chưa có ai (demo)
checkout_expired_stays()   # app restart cũng tự chốt booking đã qua ngày trả phòng


def _room_type_totals(conn, room_types=None):
    if room_types:
        qs = ",".join("?" * len(room_types))
        rows = conn.execute(
            f"SELECT room_type, COUNT(*) FROM rooms WHERE room_type IN ({qs}) GROUP BY room_type",
            list(room_types)).fetchall()
    else:
        rows = conn.execute("SELECT room_type, COUNT(*) FROM rooms GROUP BY room_type").fetchall()
    return dict(rows)


def available_counts(room_types=None, check_in=None, check_out=None, db_path=DB_PATH):
    """Trả dict {room_type: số phòng trống} = tổng phòng hạng - reservation 'paid' chồng lấn ngày.
    Không truyền check_in/check_out -> mặc định coi là hỏi trống HÔM NAY (hôm nay -> hôm nay+1),
    luôn phản ánh đúng các booking 'paid' đã có (không còn dùng cờ tĩnh rooms.available cũ)."""
    if not check_in or not check_out:
        today = clock.today()
        check_in = check_in or today.isoformat()
        check_out = check_out or (today + timedelta(days=1)).isoformat()

    conn = _connect(db_path)
    try:
        totals = _room_type_totals(conn, room_types)
        if room_types:
            qs = ",".join("?" * len(room_types))
            rows = conn.execute(
                f"SELECT room_type, COUNT(*) FROM reservations "
                f"WHERE status='paid' AND room_type IN ({qs}) "
                f"AND check_in < ? AND check_out > ? GROUP BY room_type",
                list(room_types) + [check_out, check_in]).fetchall()
        else:
            rows = conn.execute(
                "SELECT room_type, COUNT(*) FROM reservations "
                "WHERE status='paid' AND check_in < ? AND check_out > ? GROUP BY room_type",
                (check_out, check_in)).fetchall()
        booked = dict(rows)
        counts = {rt: max(total - booked.get(rt, 0), 0) for rt, total in totals.items()}
        if room_types:
            for rt in room_types:
                counts.setdefault(rt, 0)
        return counts
    finally:
        conn.close()


def _pick_room_id(conn, room_type, check_in, check_out):
    """Chọn 1 phòng vật lý còn trống của room_type trong khoảng ngày — dùng để gán
    reservations.room_id khi thanh toán thành công. Trả None nếu không tìm được (không chặn đặt phòng,
    chỉ là không cấp được tài khoản khách lần này)."""
    booked = {r[0] for r in conn.execute(
        "SELECT room_id FROM reservations WHERE status='paid' AND room_id IS NOT NULL "
        "AND room_type=? AND check_in < ? AND check_out > ?",
        (room_type, check_out, check_in)).fetchall()}
    for row in conn.execute("SELECT room_id FROM rooms WHERE room_type=?", (room_type,)).fetchall():
        if row[0] not in booked:
            return row[0]
    return None


def create_reservation(room_type, check_in, check_out, guest_name, guest_phone, guest_email,
                        num_guests, db_path=DB_PATH):
    """Kiểm tra còn trống theo ngày rồi ghi 1 dòng reservation status='paid'. Ném SoldOutError nếu hết
    phòng (chống overbook). Gán luôn 1 phòng vật lý (room_id) và cấp tài khoản khách lưu trú
    (guest_accounts, mật khẩu ngẫu nhiên) ngay khi thanh toán thành công — đúng quyết định đã chốt
    trong spec RBAC.

    Check trống + ghi nằm trong CÙNG một transaction (BEGIN IMMEDIATE giữ write-lock ngay từ đầu) —
    nếu không, 2 request đặt đồng thời phòng cuối cùng có thể cùng đọc thấy "còn 1 phòng" trước khi
    request nào commit, dẫn tới overbook."""
    today = clock.today().isoformat()
    if check_in <= today:
        raise InvalidDateRangeError(
            f"Ngày nhận phòng ({check_in}) phải sau ngày hiện tại ({today}).")
    if check_out <= check_in:   # so sánh string ISO 8601 (YYYY-MM-DD) sort đúng như so ngày
        raise InvalidDateRangeError(
            f"Ngày trả phòng ({check_out}) phải sau ngày nhận phòng ({check_in}).")
    conn = _connect_rw(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        totals = _room_type_totals(conn, [room_type])
        booked = conn.execute(
            "SELECT COUNT(*) FROM reservations WHERE status='paid' AND room_type=? "
            "AND check_in < ? AND check_out > ?",
            (room_type, check_out, check_in)).fetchone()[0]
        if totals.get(room_type, 0) - booked <= 0:
            conn.execute("ROLLBACK")
            raise SoldOutError(f"Hết phòng {room_type} trong khoảng {check_in} - {check_out}")

        now = clock.now_iso()
        room_id = _pick_room_id(conn, room_type, check_in, check_out)
        cur = conn.execute(
            "INSERT INTO reservations (room_type, check_in, check_out, guest_name, guest_phone, "
            "guest_email, num_guests, status, created_at, room_id) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (room_type, check_in, check_out, guest_name, guest_phone, guest_email,
             num_guests, "paid", now, room_id))
        reservation_id = cur.lastrowid

        guest_password = None
        if room_id:
            guest_password = secrets.token_hex(4)
            conn.execute(
                "INSERT INTO guest_accounts (room_id, password_hash, password_plain, "
                "reservation_id, created_at) VALUES (?,?,?,?,?) "
                "ON CONFLICT(room_id) DO UPDATE SET password_hash=excluded.password_hash, "
                "password_plain=excluded.password_plain, reservation_id=excluded.reservation_id, "
                "created_at=excluded.created_at",
                (room_id, hash_password(guest_password), guest_password, reservation_id, now))
        conn.commit()

        result = {"id": reservation_id, "room_type": room_type, "check_in": check_in,
                  "check_out": check_out, "status": "paid", "room_id": room_id}
        if guest_password:
            result["guest_password"] = guest_password   # chỉ trả 1 lần lúc tạo, KHÔNG lưu plaintext
        return result
    finally:
        conn.close()
        _export_json_view(db_path)


def create_service_request(service_type, guest_name, guest_phone, requested_at, party_size, note,
                            db_path=DB_PATH):
    """Ghi 1 dòng service_requests status='received'. Không kiểm tra tồn kho (không phải đặt phòng)."""
    conn = _connect_rw(db_path)
    try:
        now = clock.now_iso()
        cur = conn.execute(
            "INSERT INTO service_requests (service_type, guest_name, guest_phone, requested_at, "
            "party_size, note, status, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (service_type, guest_name, guest_phone, requested_at, party_size, note, "received", now))
        conn.commit()
        return {"id": cur.lastrowid, "service_type": service_type, "status": "received"}
    finally:
        conn.close()
        _export_json_view(db_path)


def cancel_reservation(reservation_id, db_path=DB_PATH):
    """Hủy 1 reservation (status='cancelled'). Phòng tự động tính lại là trống vì
    available_counts chỉ đếm status='paid'. Trả True nếu có dòng bị sửa, False nếu id không tồn tại."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("UPDATE reservations SET status='cancelled' WHERE id=?",
                            (reservation_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
        _export_json_view(db_path)


def cancel_service_request(request_id, db_path=DB_PATH):
    """Hủy 1 yêu cầu dịch vụ (status='cancelled'). Trả True nếu có dòng bị sửa, False nếu không."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("UPDATE service_requests SET status='cancelled' WHERE id=?",
                            (request_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
        _export_json_view(db_path)


def list_reservations(limit=50, db_path=DB_PATH):
    """Trả danh sách reservation mới nhất trước — dùng để hiển thị/theo dõi DB live."""
    cols = ["id", "room_type", "check_in", "check_out", "guest_name", "guest_phone",
            "guest_email", "num_guests", "status", "created_at", "room_id"]
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            f"SELECT {', '.join(cols)} FROM reservations ORDER BY id DESC LIMIT ?",
            (limit,)).fetchall()
        return [dict(zip(cols, r)) for r in rows]
    finally:
        conn.close()


def list_service_requests(limit=50, db_path=DB_PATH):
    """Trả danh sách yêu cầu dịch vụ mới nhất trước — dùng để hiển thị/theo dõi DB live."""
    cols = ["id", "service_type", "guest_name", "guest_phone", "requested_at",
            "party_size", "note", "status", "created_at"]
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            f"SELECT {', '.join(cols)} FROM service_requests ORDER BY id DESC LIMIT ?",
            (limit,)).fetchall()
        return [dict(zip(cols, r)) for r in rows]
    finally:
        conn.close()


def update_reservation_status(reservation_id, status, db_path=DB_PATH):
    """Admin: đổi status tùy ý (vd 'paid'/'cancelled'), khác cancel_reservation (chỉ set cancelled)."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("UPDATE reservations SET status=? WHERE id=?", (status, reservation_id))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
        _export_json_view(db_path)


def delete_reservation(reservation_id, db_path=DB_PATH):
    """Admin: xóa hẳn 1 dòng reservation (khác cancel_reservation — chỉ đổi status). Xóa kèm
    guest_accounts gắn với reservation này (nếu có) — tránh tài khoản khách mồ côi trỏ tới
    reservation_id không còn tồn tại (SQLite không tự cascade vì FK không bật)."""
    conn = _connect_rw(db_path)
    try:
        conn.execute("DELETE FROM guest_accounts WHERE reservation_id=?", (reservation_id,))
        cur = conn.execute("DELETE FROM reservations WHERE id=?", (reservation_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
        _export_json_view(db_path)


def update_service_request_status(request_id, status, db_path=DB_PATH):
    """Đổi status tùy ý ('received'/'done'/'cancelled') — dùng chung cho Admin và Staff đánh dấu xử lý."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("UPDATE service_requests SET status=? WHERE id=?", (status, request_id))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
        _export_json_view(db_path)


def delete_service_request(request_id, db_path=DB_PATH):
    """Admin: xóa hẳn 1 dòng yêu cầu dịch vụ."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("DELETE FROM service_requests WHERE id=?", (request_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
        _export_json_view(db_path)


def create_staff_request(room_id, request_type, note, db_path=DB_PATH):
    """Yêu cầu hỗ trợ chung từ khách đã lưu trú (dọn phòng, báo hỏng...) — request_type tự do,
    không ép enum (đã chốt trong spec RBAC mục 6 câu 1)."""
    conn = _connect_rw(db_path)
    try:
        now = clock.now_iso()
        cur = conn.execute(
            "INSERT INTO staff_requests (room_id, request_type, note, status, created_at) "
            "VALUES (?,?,?,?,?)", (room_id, request_type, note, "received", now))
        conn.commit()
        return {"id": cur.lastrowid, "room_id": room_id, "request_type": request_type,
                "status": "received"}
    finally:
        conn.close()
        _export_json_view(db_path)


def list_staff_requests(limit=50, db_path=DB_PATH):
    cols = ["id", "room_id", "request_type", "note", "status", "created_at"]
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            f"SELECT {', '.join(cols)} FROM staff_requests ORDER BY id DESC LIMIT ?",
            (limit,)).fetchall()
        return [dict(zip(cols, r)) for r in rows]
    finally:
        conn.close()


def update_staff_request_status(request_id, status, db_path=DB_PATH):
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("UPDATE staff_requests SET status=? WHERE id=?", (status, request_id))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
        _export_json_view(db_path)


def verify_staff_login(username, password, db_path=DB_PATH):
    """Trả role ('admin'/'staff') nếu đúng, None nếu sai username/password."""
    conn = _connect(db_path)
    try:
        row = conn.execute("SELECT password_hash, role FROM staff_accounts WHERE username=?",
                            (username,)).fetchone()
        if row and verify_password(password, row[0]):
            return row[1]
        return None
    finally:
        conn.close()


def get_guest_contact(room_id, db_path=DB_PATH):
    """Trả (guest_name, guest_phone) lấy từ reservation gắn với tài khoản khách phòng room_id — dùng
    để tự điền khi khách đã đăng nhập tạo yêu cầu dịch vụ, không bắt gõ lại. (None, None) nếu không
    tìm thấy."""
    conn = _connect(db_path)
    try:
        row = conn.execute(
            "SELECT r.guest_name, r.guest_phone FROM guest_accounts g "
            "JOIN reservations r ON r.id = g.reservation_id WHERE g.room_id = ?",
            (room_id,)).fetchone()
        return (row[0], row[1]) if row else (None, None)
    finally:
        conn.close()


def verify_guest_login(room_id, password, db_path=DB_PATH):
    """Trả True nếu đúng số phòng + mật khẩu tài khoản khách lưu trú."""
    checkout_expired_stays(db_path)
    conn = _connect(db_path)
    try:
        row = conn.execute("SELECT password_hash FROM guest_accounts WHERE room_id=?",
                            (room_id,)).fetchone()
        return bool(row and verify_password(password, row[0]))
    finally:
        conn.close()


def create_session(identity_type, identity_id, role, ttl_hours=24, db_path=DB_PATH):
    conn = _connect_rw(db_path)
    try:
        session_id = secrets.token_urlsafe(32)
        now = clock.now().replace(tzinfo=None)
        conn.execute(
            "INSERT INTO sessions (session_id, identity_type, identity_id, role, created_at, "
            "expires_at) VALUES (?,?,?,?,?,?)",
            (session_id, identity_type, identity_id, role, now.isoformat(timespec="seconds"),
             (now + timedelta(hours=ttl_hours)).isoformat(timespec="seconds")))
        conn.commit()
        return session_id
    finally:
        conn.close()


def get_session(session_id, db_path=DB_PATH):
    """Trả {'identity_type','identity_id','role'} nếu session còn hạn, None nếu không có/hết hạn."""
    checkout_expired_stays(db_path)
    conn = _connect(db_path)
    try:
        row = conn.execute(
            "SELECT identity_type, identity_id, role, expires_at FROM sessions WHERE session_id=?",
            (session_id,)).fetchone()
        if not row:
            return None
        identity_type, identity_id, role, expires_at = row
        if expires_at < clock.now_iso():
            return None
        return {"identity_type": identity_type, "identity_id": identity_id, "role": role}
    finally:
        conn.close()


def delete_session(session_id, db_path=DB_PATH):
    conn = _connect_rw(db_path)
    try:
        conn.execute("DELETE FROM sessions WHERE session_id=?", (session_id,))
        conn.commit()
    finally:
        conn.close()


_export_json_view()   # đảm bảo hotel_view.json luôn có ngay từ lúc khởi động, khớp DB hiện tại
