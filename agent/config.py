"""Đường dẫn & hằng số dùng chung.

- Dữ liệu TĨNH (data/: knowledge.json, rooms.json, images/) đi cùng code, đóng vào Docker image.
- Dữ liệu ĐỘNG (STORAGE_DIR: hotel.db, logs) nằm trên volume — cấu hình qua biến môi trường để cloud
  trỏ tới ổ đĩa cố định mà không phải sửa code.
"""
import os

try:  # nạp .env nếu có (không ghi đè biến môi trường đã đặt sẵn)
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _env_bool(name, default):
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_int(name, default):
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


_HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(_HERE)

# ---------- dữ liệu tĩnh (trong repo/image) ----------
DATA_DIR = os.path.join(ROOT, "data")
KNOWLEDGE_PATH = os.path.join(DATA_DIR, "knowledge.json")
IMAGES_DIR = os.path.join(DATA_DIR, "images")
ROOMS_PATH = os.path.join(DATA_DIR, "rooms.json")   # danh sách phòng vật lý (số phòng, hạng, tầng)

# ---------- dữ liệu động (volume) ----------
STORAGE_DIR = os.getenv("STORAGE_DIR") or os.path.join(ROOT, "storage")
DB_PATH = os.getenv("DB_PATH") or os.path.join(STORAGE_DIR, "hotel.db")
LOG_PATH = os.getenv("LOG_PATH") or os.path.join(STORAGE_DIR, "logs", "traces.jsonl")

# ---------- vận hành ----------
APP_TZ = os.getenv("APP_TZ", "Asia/Ho_Chi_Minh")   # múi giờ NGHIỆP VỤ — không phụ thuộc giờ máy chủ
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")   # trống → không tự tạo admin
COOKIE_SECURE = _env_bool("COOKIE_SECURE", False)  # bật trên production (HTTPS)
GUARDRAIL_ENABLED = _env_bool("GUARDRAIL_ENABLED", True)
CHAT_IDLE_MINUTES = _env_int("CHAT_IDLE_MINUTES", 60)     # phiên chat im lặng quá lâu → xóa khỏi RAM
CHAT_MAX_SESSIONS = _env_int("CHAT_MAX_SESSIONS", 1000)   # trần số phiên trong RAM

HISTORY_TURNS = 6        # số lượt (mỗi lượt = 1 user + 1 assistant) đưa vào context
MAX_TOOL_ITERS = 5       # trần số vòng gọi tool trong một lượt chat
MAX_INPUT_CHARS = 500    # ~150-200 token tiếng Việt — đủ cho câu hỏi thật dài nhất, chặn wall-of-text
AGENT_EXECUTOR_WORKERS = 8   # luồng chạy song song guardrail + lượt gọi LLM đầu tiên mỗi request
