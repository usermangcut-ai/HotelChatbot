"""Nguồn DUY NHẤT cho "bây giờ"/"hôm nay" của nghiệp vụ, theo múi giờ APP_TZ (mặc định giờ Việt Nam).

Máy chủ cloud thường chạy UTC — dùng date.today()/datetime.now() trực tiếp sẽ lệch 1 ngày trong khoảng
0h-7h sáng giờ VN (kiểm tra phòng trống, chặn ngày quá khứ, trả phòng tự động đều sai). Mọi code
nghiệp vụ gọi qua module này thay vì gọi thẳng datetime.
"""
from datetime import date, datetime
from zoneinfo import ZoneInfo

from agent.config import APP_TZ

_TZ = ZoneInfo(APP_TZ)


def now() -> datetime:
    """Thời điểm hiện tại, có tzinfo = APP_TZ."""
    return datetime.now(_TZ)


def today() -> date:
    return now().date()


def now_iso() -> str:
    """Timestamp để lưu DB: ISO tới giây, giờ APP_TZ, KHÔNG kèm offset — khớp định dạng dữ liệu cũ và
    so sánh chuỗi được trực tiếp với các timestamp khác cùng định dạng."""
    return now().replace(tzinfo=None).isoformat(timespec="seconds")
