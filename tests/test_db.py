from datetime import timedelta

import pytest

from agent import clock, db


def test_total_available_matches_physical_inventory_far_future():
    counts = db.available_counts(check_in="2030-01-01", check_out="2030-01-02")
    assert sum(counts.values()) == 22   # tổng số phòng vật lý (2+3+3+2+3+4+3+2), chưa ai đặt ngày này


def test_by_type_includes_requested_zero():
    c = db.available_counts(["Deluxe Park Suite", "Hạng Không Tồn Tại"],
                             check_in="2030-01-01", check_out="2030-01-02")
    assert c["Deluxe Park Suite"] == 2
    assert c["Hạng Không Tồn Tại"] == 0


def test_no_dates_defaults_to_today():
    today = clock.today().isoformat()
    tomorrow = (clock.today() + timedelta(days=1)).isoformat()
    assert db.available_counts() == db.available_counts(check_in=today, check_out=tomorrow)


def test_readonly_cannot_write():
    with pytest.raises(Exception):
        db._connect().execute("UPDATE rooms SET floor=0")
