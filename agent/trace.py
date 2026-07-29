"""Ghi trace mỗi lượt chat ra JSONL để debug."""
import json
import os

from agent.config import LOG_PATH


def log(entry, path=LOG_PATH):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
