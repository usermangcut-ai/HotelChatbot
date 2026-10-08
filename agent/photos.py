"""Ánh xạ subject ('hotel' hoặc tên hạng phòng) -> đường dẫn file ảnh trong data/images/."""
import os

from agent import knowledge
from agent.config import IMAGES_DIR

HOTEL_SUBJECT = "hotel"
_EXTS = (".jpg", ".jpeg", ".png", ".webp")


def valid_subjects():
    """'hotel' + đúng 8 tên hạng phòng — dùng làm enum cho show_photos_tool."""
    return [HOTEL_SUBJECT] + knowledge.room_titles()


def _slug_for(subject):
    if subject == HOTEL_SUBJECT:
        return "hotel"
    node = knowledge.get_node_by_title(subject)
    return node["id"] if node else None


def photo_path(subject, images_dir=IMAGES_DIR):
    """Trả đường dẫn file ảnh đầu tiên tồn tại cho subject, None nếu chưa có ảnh/subject sai."""
    slug = _slug_for(subject)
    if not slug:
        return None
    for ext in _EXTS:
        path = os.path.join(images_dir, slug + ext)
        if os.path.exists(path):
            return path
    return None


def photo_url(path):
    """Đường dẫn web của file ảnh, kèm ?v=<thời điểm sửa file>: thay ảnh (giữ nguyên tên) thì URL đổi
    → trình duyệt buộc tải bản mới thay vì dùng bản cũ trong cache."""
    return f"/images/{os.path.basename(path)}?v={int(os.path.getmtime(path))}"
