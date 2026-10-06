import json
from datetime import timedelta

from agent import clock, tools


def test_build_tools_has_both():
    t = tools.build_tools()
    assert "knowledge_tool" in t and "availability_tool" in t


def test_knowledge_schema_title_enum():
    schema = tools.build_tools()["knowledge_tool"][0]
    enum = schema["function"]["parameters"]["properties"]["title"]["enum"]
    assert "Danh sách hạng phòng" in enum and "Nội quy & Chính sách" in enum
    assert len(enum) == 15
    assert "Điểm tham quan lân cận" not in enum
    assert "Cách di chuyển ra đảo" not in enum


def test_knowledge_room_returns_fields():
    _, fn = tools.build_tools()["knowledge_tool"]
    out = fn({"title": "Villa 3 Bedroom Beachfront"})
    assert "18" in out and "Thông số" in out


def test_knowledge_catalog():
    _, fn = tools.build_tools()["knowledge_tool"]
    out = fn({"title": "Danh sách hạng phòng"})
    assert "Deluxe Queen" in out and "Hồ bơi riêng" in out


def test_knowledge_info():
    _, fn = tools.build_tools()["knowledge_tool"]
    out = fn({"title": "Nội quy & Chính sách"})
    assert "thú cưng" in out.lower()


def test_knowledge_booking_policy_covers_process_and_cancellation():
    _, fn = tools.build_tools()["knowledge_tool"]
    out = fn({"title": "Nội quy & Chính sách"})
    low = out.lower()
    assert "quy trình đặt phòng" in low
    assert "hủy" in low and "cọc" in low
    assert "đổi ngày" in low


def test_knowledge_amenities_states_common_facilities_apply_to_all_room_types():
    _, fn = tools.build_tools()["knowledge_tool"]
    out = fn({"title": "Tiện ích & Dịch vụ"})
    assert "mọi hạng phòng" in out


def test_knowledge_unknown_title_lists_menu():
    _, fn = tools.build_tools()["knowledge_tool"]
    out = fn({"title": "xyz không có"})
    assert "Danh sách hạng phòng" in out


def test_availability_schema_array():
    props = tools.build_tools()["availability_tool"][0]["function"]["parameters"]["properties"]
    assert props["room_types"]["type"] == "array"


def test_availability_all():
    _, fn = tools.build_tools()["availability_tool"]
    out = json.loads(fn({"check_in": "2030-01-01", "check_out": "2030-01-02"}))
    assert sum(out.values()) == 22


def test_availability_by_type():
    _, fn = tools.build_tools()["availability_tool"]
    out = json.loads(fn({"room_types": ["Deluxe Park Suite"], "check_in": "2030-01-01",
                          "check_out": "2030-01-02"}))
    assert out["Deluxe Park Suite"] == 2


def test_availability_schema_has_date_params():
    props = tools.build_tools()["availability_tool"][0]["function"]["parameters"]["properties"]
    assert "check_in" in props and "check_out" in props


def test_availability_tool_with_dates_uses_room_total():
    _, fn = tools.build_tools()["availability_tool"]
    out = json.loads(fn({"room_types": ["Deluxe Park Suite"], "check_in": "2030-01-01",
                          "check_out": "2030-01-02"}))
    assert out["Deluxe Park Suite"] == 2   # tổng phòng hạng, chưa ai đặt ngày xa tương lai này


def test_open_booking_form_tool_returns_marker():
    _, fn = tools.build_tools()["open_booking_form_tool"]
    check_in = (clock.today() + timedelta(days=1)).isoformat()
    check_out = (clock.today() + timedelta(days=3)).isoformat()
    out = json.loads(fn({"room_type": "Deluxe Queen", "check_in": check_in,
                         "check_out": check_out, "num_guests": 2}))
    assert out["action"] == "open_booking_form"
    assert out["room_type"] == "Deluxe Queen"


def test_open_booking_form_tool_rejects_unknown_room_type():
    _, fn = tools.build_tools()["open_booking_form_tool"]
    out = fn({"room_type": "Phòng Không Tồn Tại", "check_in": "2026-08-01",
              "check_out": "2026-08-03", "num_guests": 2})
    assert "không nhận diện được hạng phòng" in out.lower()
    assert "action" not in out


def test_open_booking_form_tool_rejects_past_check_in():
    _, fn = tools.build_tools()["open_booking_form_tool"]
    out = fn({"room_type": "Deluxe Queen", "check_in": "2020-01-01",
              "check_out": "2020-01-03", "num_guests": 2})
    assert "sau ngày hiện tại" in out.lower()
    assert "action" not in out


def test_open_booking_form_tool_rejects_today():
    _, fn = tools.build_tools()["open_booking_form_tool"]
    out = fn({"room_type": "Deluxe Queen", "check_in": clock.today().isoformat(),
              "check_out": (clock.today() + timedelta(days=1)).isoformat(), "num_guests": 2})
    assert "sau ngày hiện tại" in out.lower()
    assert "action" not in out


def test_open_booking_form_tool_rejects_malformed_date():
    _, fn = tools.build_tools()["open_booking_form_tool"]
    out = fn({"room_type": "Deluxe Queen", "check_in": "01/08/2026",
              "check_out": "2026-08-03", "num_guests": 2})
    assert "yyyy-mm-dd" in out.lower()
    assert "action" not in out


def test_open_booking_form_tool_allows_missing_optional_fields():
    _, fn = tools.build_tools()["open_booking_form_tool"]
    out = json.loads(fn({}))
    assert out["action"] == "open_booking_form"
    assert out["room_type"] is None


def test_show_photos_schema_enum_has_hotel_and_rooms():
    schema = tools.build_tools()["show_photos_tool"][0]
    enum = schema["function"]["parameters"]["properties"]["subject"]["enum"]
    assert "hotel" in enum and "Deluxe Queen" in enum


def test_show_photos_tool_rejects_unknown_subject():
    _, fn = tools.build_tools()["show_photos_tool"]
    out = fn({"subject": "không tồn tại"})
    assert "không nhận diện được" in out.lower()
    assert "action" not in out


def test_show_photos_tool_no_file_returns_friendly_message(monkeypatch):
    # Giả lập chưa có file ảnh cho subject này, không phụ thuộc trạng thái data/images/ thật trên đĩa.
    monkeypatch.setattr(tools.photos, "photo_path", lambda subject, images_dir=None: None)
    _, fn = tools.build_tools()["show_photos_tool"]
    out = fn({"subject": "Deluxe Queen"})
    assert "chưa có ảnh" in out.lower()
    assert "action" not in out


def test_build_tools_has_four_tools():
    t = tools.build_tools()
    assert set(t.keys()) == {"knowledge_tool", "availability_tool", "open_booking_form_tool",
                              "show_photos_tool"}
