"""Schema + hàm thực thi các tool; build_tools() gom lại."""
import json
from datetime import date

from agent import db, knowledge, photos

SERVICE_TYPES = ("restaurant", "spa")


def _parse_date(s):
    """Trả date hoặc None nếu s rỗng/sai định dạng YYYY-MM-DD."""
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except ValueError:
        return "invalid"


# ---------- knowledge_tool ----------

def _knowledge_schema():
    menu = "\n".join(f"- {line}" for line in knowledge.node_menu())
    return {
        "type": "function",
        "function": {
            "name": "knowledge_tool",
            "description": (
                "Lấy MỘT mục thông tin tĩnh của resort. Đọc danh sách mục dưới đây và chọn `title` "
                "sát nhất với câu hỏi. Muốn lọc/so sánh/đếm nhiều phòng, hoặc hỏi 'hạng nào có X' → "
                "chọn 'Danh sách hạng phòng'. Các mục:\n" + menu),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "enum": knowledge.node_titles(),
                              "description": "Tên mục cần lấy — chọn đúng từ danh sách trong mô tả."},
                },
                "required": ["title"],
            },
        },
    }


def _format_node(node):
    out = f"# {node['title']}\n{node['text']}"
    if node["kind"] == "room" and node.get("fields"):
        f = node["fields"]
        am = ", ".join(f.get("amenities", []))
        price = f"{f['price_vnd']:,}".replace(",", ".")   # định dạng VN: 3.150.000
        out += ("\n\nThông số: giá {price}đ/đêm · {size}m² · tối đa {occ} khách · giường {bed} · "
                "hướng {view} · ăn sáng {bf} · tiện ích: {am}").format(
            price=price, size=f["size_m2"], occ=f["max_occupancy"],
            bed=f["bed_type"], view=f["view"],
            bf="có" if f.get("breakfast_included") else "không", am=am)
    return out


def knowledge_tool(args):
    node = knowledge.get_node_by_title(args.get("title", ""))
    if node:
        return _format_node(node)
    menu = "\n".join(f"- {t}" for t in knowledge.node_titles())
    return "Không có mục đó. Chọn lại `title` từ danh sách:\n" + menu


# ---------- availability_tool ----------

def _availability_schema():
    return {
        "type": "function",
        "function": {
            "name": "availability_tool",
            "description": (
                "Đếm số phòng CÒN TRỐNG theo từng hạng. Nếu khách đã cho ngày nhận/trả phòng, LUÔN "
                "truyền check_in/check_out để đếm đúng theo khoảng ngày đó (trừ các đặt phòng đã có); "
                "nếu khách chưa cho ngày, gọi không kèm ngày sẽ mặc định đếm trống cho HÔM NAY."),
            "parameters": {
                "type": "object",
                "properties": {
                    "room_types": {
                        "type": "array", "items": {"type": "string"},
                        "description": "Danh sách tên hạng phòng cần kiểm tra (đúng tên như trong "
                                       "catalog). Bỏ trống = kiểm tra tất cả các hạng.",
                    },
                    "check_in": {"type": "string",
                                 "description": "Ngày nhận phòng, định dạng YYYY-MM-DD."},
                    "check_out": {"type": "string",
                                  "description": "Ngày trả phòng, định dạng YYYY-MM-DD."},
                },
            },
        },
    }


def availability_tool(args):
    rts = args.get("room_types") or None
    counts = db.available_counts(rts, args.get("check_in"), args.get("check_out"))
    if not counts or sum(counts.values()) == 0:
        return "Hiện không có phòng trống cho yêu cầu này."
    return json.dumps(counts, ensure_ascii=False)


# ---------- open_booking_form_tool ----------

def _open_booking_form_schema():
    return {
        "type": "function",
        "function": {
            "name": "open_booking_form_tool",
            "description": (
                "Mở PHIẾU ĐẶT PHÒNG cho khách điền và thanh toán trên giao diện, khi khách đã chốt ý "
                "định đặt phòng (kể cả chưa đủ hết thông tin — phiếu sẽ hỏi tiếp phần còn thiếu). "
                "KHÔNG tự ghi đặt phòng — việc đặt chỉ hoàn tất khi khách xác nhận trên phiếu."),
            "parameters": {
                "type": "object",
                "properties": {
                    "room_type": {"type": "string",
                                  "description": "Hạng phòng khách muốn đặt, nếu đã biết."},
                    "check_in": {"type": "string",
                                 "description": "Ngày nhận phòng YYYY-MM-DD, nếu đã biết."},
                    "check_out": {"type": "string",
                                  "description": "Ngày trả phòng YYYY-MM-DD, nếu đã biết."},
                    "num_guests": {"type": "integer", "description": "Số khách, nếu đã biết."},
                },
            },
        },
    }


def open_booking_form_tool(args):
    room_type = args.get("room_type")
    if room_type and room_type not in knowledge.room_titles():
        return (f"Không nhận diện được hạng phòng '{room_type}'. Vui lòng chọn lại đúng tên hạng "
                f"phòng trong catalog (dùng knowledge_tool 'Danh sách hạng phòng' nếu cần).")

    for field in ("check_in", "check_out"):
        parsed = _parse_date(args.get(field))
        if parsed == "invalid":
            return f"Ngày '{args.get(field)}' không đúng định dạng YYYY-MM-DD. Vui lòng nhập lại."
        if isinstance(parsed, date) and parsed < date.today():
            return f"Ngày {args.get(field)} đã ở quá khứ. Vui lòng chọn ngày từ hôm nay trở đi."

    payload = {"action": "open_booking_form", "room_type": room_type,
               "check_in": args.get("check_in"), "check_out": args.get("check_out"),
               "num_guests": args.get("num_guests")}
    return json.dumps(payload, ensure_ascii=False)


# ---------- show_photos_tool ----------

def _show_photos_schema():
    return {
        "type": "function",
        "function": {
            "name": "show_photos_tool",
            "description": (
                "Gửi ẢNH minh họa cho khách xem. Gọi kèm khi bạn đang mô tả/giới thiệu MỘT hạng "
                "phòng cụ thể hoặc giới thiệu tổng quan resort — ảnh giúp khách hình dung tốt hơn. "
                "KHÔNG gọi cho câu hỏi hẹp không cần hình ảnh (vd số điện thoại, giờ giấc, chính "
                "sách, so sánh nhiều phòng cùng lúc). subject='hotel' cho toàn cảnh resort, hoặc "
                "đúng tên hạng phòng cho ảnh phòng đó."),
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {"type": "string", "enum": photos.valid_subjects(),
                                "description": "'hotel' hoặc tên hạng phòng cần xem ảnh."},
                },
                "required": ["subject"],
            },
        },
    }


def show_photos_tool(args):
    subject = args.get("subject")
    if subject not in photos.valid_subjects():
        return f"Không nhận diện được '{subject}'. Chọn 'hotel' hoặc đúng tên hạng phòng."
    path = photos.photo_path(subject)
    if not path:
        return f"Xin lỗi, hiện chưa có ảnh cho '{subject}'."
    payload = {"action": "show_photos", "subject": subject, "image_path": path}
    return json.dumps(payload, ensure_ascii=False)


def build_tools():
    """Trả dict: name -> (schema, fn)."""
    return {
        "knowledge_tool": (_knowledge_schema(), knowledge_tool),
        "availability_tool": (_availability_schema(), availability_tool),
        "open_booking_form_tool": (_open_booking_form_schema(), open_booking_form_tool),
        "show_photos_tool": (_show_photos_schema(), show_photos_tool),
    }
