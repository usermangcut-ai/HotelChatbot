from datetime import date, datetime, timezone

from agent import clock


def _freeze_utc(monkeypatch, utc_dt):
    """Giả lập đồng hồ máy chủ đang ở thời điểm utc_dt (UTC)."""
    class FrozenDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return utc_dt.astimezone(tz) if tz else utc_dt.replace(tzinfo=None)

    monkeypatch.setattr(clock, "datetime", FrozenDatetime)


def test_today_uses_business_timezone_not_server_utc(monkeypatch):
    # 23:30 UTC ngày 6/10 = 06:30 sáng 7/10 giờ Việt Nam
    _freeze_utc(monkeypatch, datetime(2026, 10, 6, 23, 30, tzinfo=timezone.utc))
    assert clock.today() == date(2026, 10, 7)


def test_now_is_timezone_aware():
    assert clock.now().utcoffset() is not None


def test_now_iso_is_local_time_to_seconds_without_offset(monkeypatch):
    _freeze_utc(monkeypatch, datetime(2026, 10, 6, 23, 30, 15, 999, tzinfo=timezone.utc))
    assert clock.now_iso() == "2026-10-07T06:30:15"
