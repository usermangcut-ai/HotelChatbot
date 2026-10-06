"""Truy cập dữ liệu hotel.db: đọc (đếm phòng trống, danh sách) và ghi có kiểm soát (đặt phòng, yêu
cầu dịch vụ, tài khoản, phiên đăng nhập). Tạo/nâng cấp schema + seed nằm ở agent/schema.py — import
module này KHÔNG ghi gì vào DB."""
import secrets
import sqlite3
from datetime import timedelta

import bcrypt

from agent import clock
from agent.config import DB_PATH


def hash_password(raw):
    """bcrypt — có salt ngẫu nhiên riêng mỗi lần hash (2 lần hash cùng 1 mật khẩu ra 2 chuỗi khác
    nhau), cố ý chậm để chống brute-force. KHÔNG so sánh bằng == — dùng verify_password()."""
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(raw, hashed):
    return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))


class SoldOutError(Exception):
    """Ném ra khi hạng phòng đã hết trống trong khoảng ngày yêu cầu."""


class InvalidDateRangeError(Exception):
    """Ném ra khi ngày nhận/trả phòng không hợp lệ."""


class DuplicateUsernameError(Exception):
    """Ném ra khi tạo staff_account với username đã tồn tại."""


class StayNotStartedError(Exception):
    """Đúng mật khẩu nhưng chưa tới ngày nhận phòng — tài khoản khách chỉ dùng được trong kỳ lưu trú."""

    def __init__(self, check_in):
        super().__init__(f"Tài khoản dùng được từ ngày nhận phòng ({check_in}).")
        self.check_in = check_in


def _connect(db_path=DB_PATH):
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.execute("PRAGMA busy_timeout=5000")   # chờ tối đa 5s thay vì lỗi ngay khi có writer khác
    return conn


def _connect_rw(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA journal_mode=WAL")    # cho phép đọc song song trong lúc đang ghi
    return conn


# ---------- tài khoản nhân viên/admin ----------

def create_staff_account(username, password, role, db_path=DB_PATH):
    """Admin tạo tài khoản nhân viên/admin mới. role phải là 'staff' hoặc 'admin'."""
    if role not in ("staff", "admin"):
        raise ValueError("role phải là 'staff' hoặc 'admin'")
    password_hash = hash_password(password)
    conn = _connect_rw(db_path)
    try:
        exists = conn.execute("SELECT 1 FROM staff_accounts WHERE username=?",
                              (username,)).fetchone()
        if exists:
            raise DuplicateUsernameError(f"Tên đăng nhập '{username}' đã tồn tại.")
        now = clock.now_iso()
        conn.execute("INSERT INTO staff_accounts (username, password_hash, role, created_at) "
                     "VALUES (?,?,?,?)", (username, password_hash, role, now))
        conn.commit()
        return {"username": username, "role": role, "created_at": now}
    finally:
        conn.close()


def change_staff_password(username, old_password, new_password, db_path=DB_PATH):
    """Tự đổi mật khẩu của chính tài khoản đang đăng nhập (staff/admin). True nếu đổi được, False nếu
    old_password sai hoặc tài khoản không tồn tại."""
    conn = _connect_rw(db_path)
    try:
        row = conn.execute("SELECT password_hash FROM staff_accounts WHERE username=?",
                           (username,)).fetchone()
        if not row or not verify_password(old_password, row[0]):
            return False
        conn.execute("UPDATE staff_accounts SET password_hash=? WHERE username=?",
                     (hash_password(new_password), username))
        conn.commit()
        return True
    finally:
        conn.close()


def list_staff_accounts(db_path=DB_PATH):
    """Danh sách tài khoản nhân viên/admin cho admin xem — KHÔNG có mật khẩu/hash."""
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT username, role, created_at FROM staff_accounts ORDER BY created_at DESC"
        ).fetchall()
        return [{"username": r[0], "role": r[1], "created_at": r[2]} for r in rows]
    finally:
        conn.close()


def delete_staff_account(username, db_path=DB_PATH):
    """Admin xóa 1 tài khoản nhân viên/admin. True nếu có dòng bị xóa."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("DELETE FROM staff_accounts WHERE username=?", (username,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


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


# ---------- phòng & đặt phòng ----------

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
    Không truyền check_in/check_out -> mặc định coi là hỏi trống HÔM NAY (hôm nay -> hôm nay+1)."""
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
    """Chọn 1 phòng vật lý còn trống của room_type trong khoảng ngày. None nếu không tìm được."""
    booked = {r[0] for r in conn.execute(
        "SELECT room_id FROM reservations WHERE status='paid' AND room_id IS NOT NULL "
        "AND room_type=? AND check_in < ? AND check_out > ?",
        (room_type, check_out, check_in)).fetchall()}
    for row in conn.execute("SELECT room_id FROM rooms WHERE room_type=? ORDER BY room_id",
                            (room_type,)).fetchall():
        if row[0] not in booked:
            return row[0]
    return None


def create_reservation(room_type, check_in, check_out, guest_name, guest_phone, guest_email,
                       num_guests, db_path=DB_PATH):
    """Kiểm tra còn trống theo ngày rồi ghi 1 reservation status='paid' (SoldOutError nếu hết phòng).
    Gán 1 phòng vật lý và cấp tài khoản khách RIÊNG cho booking này (mật khẩu ngẫu nhiên, trả về đúng
    1 lần, chỉ lưu hash) — dùng được từ ngày nhận phòng.

    Check trống + ghi nằm trong CÙNG một transaction (BEGIN IMMEDIATE giữ write-lock ngay từ đầu) —
    nếu không, 2 request đặt đồng thời phòng cuối cùng có thể cùng đọc thấy "còn 1 phòng"."""
    today = clock.today().isoformat()
    if check_in <= today:
        raise InvalidDateRangeError(
            f"Ngày nhận phòng ({check_in}) phải sau ngày hiện tại ({today}).")
    if check_out <= check_in:   # so sánh string ISO 8601 (YYYY-MM-DD) sort đúng như so ngày
        raise InvalidDateRangeError(
            f"Ngày trả phòng ({check_out}) phải sau ngày nhận phòng ({check_in}).")
    # bcrypt cố ý chậm — hash TRƯỚC khi giữ write-lock để không chặn các request ghi khác
    guest_password = secrets.token_urlsafe(9)
    password_hash = hash_password(guest_password)

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
        if room_id:
            conn.execute(
                "INSERT INTO guest_accounts (reservation_id, room_id, password_hash, created_at) "
                "VALUES (?,?,?,?)", (reservation_id, room_id, password_hash, now))
        conn.commit()

        result = {"id": reservation_id, "room_type": room_type, "check_in": check_in,
                  "check_out": check_out, "status": "paid", "room_id": room_id}
        if room_id:
            result["guest_password"] = guest_password
        return result
    finally:
        conn.close()


def cancel_reservation(reservation_id, db_path=DB_PATH):
    """Hủy 1 reservation (status='cancelled') — phòng tự tính lại là trống. False nếu id không có."""
    return update_reservation_status(reservation_id, "cancelled", db_path=db_path)


def list_reservations(limit=50, db_path=DB_PATH):
    """Danh sách reservation mới nhất trước."""
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


def update_reservation_status(reservation_id, status, db_path=DB_PATH):
    """Đổi status ('paid'/'cancelled'/'completed'). True nếu có dòng bị sửa."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("UPDATE reservations SET status=? WHERE id=?", (status, reservation_id))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_reservation(reservation_id, db_path=DB_PATH):
    """Admin: xóa hẳn 1 reservation, kèm tài khoản + phiên khách gắn với nó (SQLite không tự cascade
    vì FK không bật)."""
    conn = _connect_rw(db_path)
    try:
        conn.execute("DELETE FROM guest_accounts WHERE reservation_id=?", (reservation_id,))
        conn.execute("DELETE FROM sessions WHERE identity_type='guest_account' AND identity_id=?",
                     (str(reservation_id),))
        cur = conn.execute("DELETE FROM reservations WHERE id=?", (reservation_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def checkout_expired_stays(db_path=DB_PATH, as_of=None):
    """Chốt booking tới ngày trả phòng (status='completed') và thu hồi tài khoản/phiên của khách.
    Trả số booking đã chốt."""
    cutoff = as_of or clock.today().isoformat()
    conn = _connect_rw(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        ids = [row[0] for row in conn.execute(
            "SELECT id FROM reservations WHERE status='paid' AND check_out <= ?",
            (cutoff,)).fetchall()]
        if ids:
            marks = ",".join("?" * len(ids))
            conn.execute(f"UPDATE reservations SET status='completed' WHERE id IN ({marks})", ids)
            conn.execute(f"DELETE FROM guest_accounts WHERE reservation_id IN ({marks})", ids)
            conn.execute(f"DELETE FROM sessions WHERE identity_type='guest_account' "
                         f"AND identity_id IN ({marks})", [str(i) for i in ids])
        conn.commit()
        return len(ids)
    finally:
        conn.close()


# ---------- tài khoản khách lưu trú ----------

def verify_guest_login(room_id, password, db_path=DB_PATH):
    """Trả reservation_id nếu đúng số phòng + mật khẩu của một booking đang lưu trú (check_in <= hôm
    nay < check_out). Đúng mật khẩu nhưng chưa tới ngày nhận phòng → StayNotStartedError. Sai → None.
    Một phòng có thể có nhiều booking nối tiếp nhau, mỗi booking một mật khẩu riêng."""
    today = clock.today().isoformat()
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT g.reservation_id, g.password_hash, r.check_in FROM guest_accounts g "
            "JOIN reservations r ON r.id = g.reservation_id "
            "WHERE g.room_id=? AND r.status='paid' AND r.check_out > ?",
            (room_id, today)).fetchall()
    finally:
        conn.close()
    for reservation_id, pwd_hash, check_in in rows:
        if verify_password(password, pwd_hash):
            if check_in > today:
                raise StayNotStartedError(check_in)
            return reservation_id
    return None


def get_active_stay(reservation_id, db_path=DB_PATH):
    """{'reservation_id','room_id'} nếu booking còn 'paid' và hôm nay nằm trong kỳ lưu trú; None nếu
    không."""
    today = clock.today().isoformat()
    conn = _connect(db_path)
    try:
        row = conn.execute(
            "SELECT id, room_id FROM reservations WHERE id=? AND status='paid' "
            "AND check_in <= ? AND check_out > ?", (reservation_id, today, today)).fetchone()
        return {"reservation_id": row[0], "room_id": row[1]} if row else None
    finally:
        conn.close()


def get_guest_contact(reservation_id, db_path=DB_PATH):
    """(guest_name, guest_phone) của booking — tự điền khi khách đã đăng nhập tạo yêu cầu dịch vụ.
    (None, None) nếu không có."""
    conn = _connect(db_path)
    try:
        row = conn.execute("SELECT guest_name, guest_phone FROM reservations WHERE id=?",
                           (reservation_id,)).fetchone()
        return (row[0], row[1]) if row else (None, None)
    finally:
        conn.close()


# ---------- yêu cầu dịch vụ (nhà hàng/spa) ----------

def create_service_request(service_type, guest_name, guest_phone, requested_at, party_size, note,
                           reservation_id=None, db_path=DB_PATH):
    """Ghi 1 dòng service_requests status='received'."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute(
            "INSERT INTO service_requests (service_type, guest_name, guest_phone, requested_at, "
            "party_size, note, status, created_at, reservation_id) VALUES (?,?,?,?,?,?,?,?,?)",
            (service_type, guest_name, guest_phone, requested_at, party_size, note, "received",
             clock.now_iso(), reservation_id))
        conn.commit()
        return {"id": cur.lastrowid, "service_type": service_type, "status": "received"}
    finally:
        conn.close()


def cancel_service_request(request_id, db_path=DB_PATH):
    """Hủy 1 yêu cầu dịch vụ (status='cancelled'). False nếu id không có."""
    return update_service_request_status(request_id, "cancelled", db_path=db_path)


def list_service_requests(limit=50, db_path=DB_PATH):
    """Danh sách yêu cầu dịch vụ mới nhất trước."""
    cols = ["id", "service_type", "guest_name", "guest_phone", "requested_at",
            "party_size", "note", "status", "created_at", "reservation_id"]
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            f"SELECT {', '.join(cols)} FROM service_requests ORDER BY id DESC LIMIT ?",
            (limit,)).fetchall()
        return [dict(zip(cols, r)) for r in rows]
    finally:
        conn.close()


def update_service_request_status(request_id, status, db_path=DB_PATH):
    """Đổi status ('received'/'done'/'cancelled') — dùng chung cho Admin và Staff."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("UPDATE service_requests SET status=? WHERE id=?", (status, request_id))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def delete_service_request(request_id, db_path=DB_PATH):
    """Admin: xóa hẳn 1 dòng yêu cầu dịch vụ."""
    conn = _connect_rw(db_path)
    try:
        cur = conn.execute("DELETE FROM service_requests WHERE id=?", (request_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ---------- yêu cầu hỗ trợ chung (dọn phòng, báo hỏng...) ----------

_STAFF_REQUEST_COLS = ["id", "room_id", "request_type", "note", "status", "created_at",
                       "reservation_id"]


def create_staff_request(room_id, request_type, note, reservation_id=None, db_path=DB_PATH):
    """Yêu cầu hỗ trợ từ khách đang lưu trú — request_type tự do. Trả về đúng dòng vừa tạo."""
    conn = _connect_rw(db_path)
    try:
        now = clock.now_iso()
        cur = conn.execute(
            "INSERT INTO staff_requests (room_id, request_type, note, status, created_at, "
            "reservation_id) VALUES (?,?,?,?,?,?)",
            (room_id, request_type, note, "received", now, reservation_id))
        conn.commit()
        return dict(zip(_STAFF_REQUEST_COLS,
                        (cur.lastrowid, room_id, request_type, note, "received", now,
                         reservation_id)))
    finally:
        conn.close()


def list_staff_requests(limit=50, reservation_id=None, db_path=DB_PATH):
    """Mới nhất trước. Truyền reservation_id → chỉ yêu cầu của lượt lưu trú đó."""
    sql = f"SELECT {', '.join(_STAFF_REQUEST_COLS)} FROM staff_requests"
    params = []
    if reservation_id is not None:
        sql += " WHERE reservation_id=?"
        params.append(reservation_id)
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    conn = _connect(db_path)
    try:
        return [dict(zip(_STAFF_REQUEST_COLS, r)) for r in conn.execute(sql, params).fetchall()]
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


# ---------- phiên đăng nhập ----------

def create_session(identity_type, identity_id, role, ttl_hours=24, db_path=DB_PATH):
    """identity_id: username (nhân viên) hoặc str(reservation_id) (khách)."""
    now = clock.now().replace(tzinfo=None)
    session_id = secrets.token_urlsafe(32)
    conn = _connect_rw(db_path)
    try:
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
    """{'identity_type','identity_id','role'} (+ 'room_id' với khách) nếu phiên còn hạn; None nếu
    không. Phiên khách còn phải gắn với booking đang lưu trú. Chỉ ĐỌC DB — không giành khóa ghi
    mỗi request."""
    conn = _connect(db_path)
    try:
        row = conn.execute(
            "SELECT identity_type, identity_id, role, expires_at FROM sessions WHERE session_id=?",
            (session_id,)).fetchone()
    finally:
        conn.close()
    if not row:
        return None
    identity_type, identity_id, role, expires_at = row
    if expires_at < clock.now_iso():
        return None
    identity = {"identity_type": identity_type, "identity_id": identity_id, "role": role}
    if identity_type == "guest_account":
        try:
            stay = get_active_stay(int(identity_id), db_path)
        except ValueError:
            return None
        if not stay:
            return None
        identity["room_id"] = stay["room_id"]
    return identity


def delete_session(session_id, db_path=DB_PATH):
    conn = _connect_rw(db_path)
    try:
        conn.execute("DELETE FROM sessions WHERE session_id=?", (session_id,))
        conn.commit()
    finally:
        conn.close()
