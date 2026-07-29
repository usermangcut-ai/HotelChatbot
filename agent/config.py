"""Đường dẫn & hằng số dùng chung."""
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(_HERE)
DATA_DIR = os.path.join(ROOT, "data")

KNOWLEDGE_PATH = os.path.join(DATA_DIR, "knowledge.json")
DB_PATH = os.path.join(DATA_DIR, "hotel.db")
IMAGES_DIR = os.path.join(DATA_DIR, "images")
LOG_PATH = os.path.join(ROOT, "logs", "traces.jsonl")

HISTORY_TURNS = 6        # số lượt (mỗi lượt = 1 user + 1 assistant) đưa vào context
MAX_TOOL_ITERS = 5       # trần số vòng gọi tool trong một lượt chat
MAX_INPUT_CHARS = 500    # ~150-200 token tiếng Việt — đủ cho câu hỏi thật dài nhất, chặn wall-of-text
