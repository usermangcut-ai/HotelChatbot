"""Bộ nhớ hội thoại in-process theo session_id (chỉ lưu text user/assistant)."""
from agent.config import HISTORY_TURNS


class Memory:
    def __init__(self, turns=HISTORY_TURNS):
        self.turns = turns
        self._store = {}

    def append(self, session_id, role, content):
        self._store.setdefault(session_id, []).append({"role": role, "content": content})

    def get(self, session_id):
        msgs = self._store.get(session_id, [])
        return msgs[-self.turns * 2:] if self.turns > 0 else list(msgs)
