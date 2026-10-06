"""Cấu hình chung cho pytest (file ở thư mục gốc nên pytest cũng tự đưa gốc repo vào sys.path để
`import agent...` chạy được).

Trỏ STORAGE_DIR/DB_PATH/LOG_PATH vào thư mục tạm TRƯỚC khi bất kỳ module agent.*/api.* nào được import
— test không bao giờ đụng storage/hotel.db thật, và chạy được trên máy sạch (CI) không có sẵn DB.
"""
import os
import shutil
import sqlite3
import tempfile
from datetime import timedelta

import pytest

_TEST_STORAGE = tempfile.mkdtemp(prefix="vsf-test-")
os.environ["STORAGE_DIR"] = _TEST_STORAGE
os.environ["DB_PATH"] = os.path.join(_TEST_STORAGE, "hotel.db")
os.environ["LOG_PATH"] = os.path.join(_TEST_STORAGE, "logs", "traces.jsonl")
os.environ["ADMIN_PASSWORD"] = ""
os.environ["APP_TZ"] = "Asia/Ho_Chi_Minh"
os.environ["COOKIE_SECURE"] = "false"


@pytest.fixture(scope="session", autouse=True)
def _default_test_db():
    """DB mặc định (DB_PATH) cho các test API dùng hàm db.* không truyền db_path."""
    from agent.schema import init_db
    init_db()
    yield
    shutil.rmtree(_TEST_STORAGE, ignore_errors=True)


@pytest.fixture
def tmp_db(tmp_path):
    """DB sạch riêng cho từng test: schema mới nhất + 22 phòng từ rooms.json."""
    from agent.schema import init_db
    path = str(tmp_path / "hotel.db")
    init_db(path)
    return path


@pytest.fixture
def make_active_stay():
    """Factory tạo booking ĐANG lưu trú (check_in = hôm nay) trên DB mặc định. Booking chỉ tạo được
    cho ngày tương lai, nên tạo ở +30 ngày rồi dời ngày về hôm nay."""
    from agent import clock, db

    def _make(room_type="Deluxe Queen", nights=2):
        start = clock.today() + timedelta(days=30)
        res = db.create_reservation(room_type, start.isoformat(),
                                    (start + timedelta(days=nights)).isoformat(),
                                    "Nguyen Van A", "0900000000", "a@t.com", 2)
        today = clock.today()
        conn = sqlite3.connect(db.DB_PATH)
        conn.execute("UPDATE reservations SET check_in=?, check_out=? WHERE id=?",
                     (today.isoformat(), (today + timedelta(days=nights)).isoformat(), res["id"]))
        conn.commit()
        conn.close()
        return {"reservation_id": res["id"], "room_id": res["room_id"],
                "password": res["guest_password"]}

    return _make


@pytest.fixture
def active_stay(make_active_stay):
    return make_active_stay()
