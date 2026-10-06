"""Bộ nhớ hội thoại trong RAM theo session_id — chỉ sống trong phiên làm việc, KHÔNG lưu DB.

Server không biết khi nào khách đóng tab, nên tự dọn: phiên không có tin nhắn mới quá idle_seconds
bị xóa; vượt max_sessions thì xóa phiên hoạt động cũ nhất. Chỉ đúng khi chạy 1 process (1 instance,
1 worker) — nhiều process sẽ mỗi process nhớ một kiểu."""
import threading
import time
from collections import OrderedDict

from agent.config import CHAT_IDLE_MINUTES, CHAT_MAX_SESSIONS, HISTORY_TURNS


class Memory:
    def __init__(self, turns=HISTORY_TURNS, idle_seconds=CHAT_IDLE_MINUTES * 60,
                 max_sessions=CHAT_MAX_SESSIONS, now=time.monotonic):
        self.turns = turns
        self.idle_seconds = idle_seconds
        self.max_sessions = max_sessions
        self._now = now
        # session_id -> {"msgs": [...], "last": thời điểm có tin nhắn cuối}; hoạt động cũ nhất ở đầu
        self._store = OrderedDict()
        # endpoint đồng bộ của FastAPI chạy trên threadpool → nhiều request ghi cùng lúc
        self._lock = threading.Lock()

    def _purge_idle(self, now):
        while self._store:
            session_id, entry = next(iter(self._store.items()))
            if now - entry["last"] <= self.idle_seconds:
                break
            del self._store[session_id]

    def append(self, session_id, role, content):
        with self._lock:
            now = self._now()
            self._purge_idle(now)
            entry = self._store.pop(session_id, None) or {"msgs": []}
            entry["msgs"].append({"role": role, "content": content})
            if self.turns > 0:
                entry["msgs"] = entry["msgs"][-self.turns * 2:]
            entry["last"] = now
            self._store[session_id] = entry   # đưa xuống cuối = vừa hoạt động
            while len(self._store) > self.max_sessions:
                self._store.popitem(last=False)

    def get(self, session_id):
        """Đọc KHÔNG gia hạn phiên — chỉ tin nhắn mới mới tính là hoạt động."""
        with self._lock:
            self._purge_idle(self._now())
            entry = self._store.get(session_id)
            return [dict(m) for m in entry["msgs"]] if entry else []

    def __len__(self):
        with self._lock:
            return len(self._store)
