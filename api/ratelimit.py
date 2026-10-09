"""Giới hạn tần suất request theo IP — chặn spam chat (mỗi tin tốn tiền LLM), dò mật khẩu, đặt phòng ảo.

Đếm trong RAM theo cửa sổ trượt: hợp với kiến trúc 1 instance/1 worker; restart thì bộ đếm về 0 —
chấp nhận được. Dùng như dependency: `Depends(rate_limit("chat", 20, 60))`.
"""
import math
import threading
import time
from collections import deque

from fastapi import HTTPException, Request

from agent import config

MAX_KEYS = 10_000   # trần số IP theo dõi mỗi bucket — chặn bộ đếm tự phình RAM
TOO_MANY = "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút."


class SlidingWindow:
    """Cho tối đa `max_calls` lần trong `window_s` giây cho mỗi key."""

    def __init__(self, max_calls, window_s, clock=time.monotonic):
        self.max_calls = max_calls
        self.window_s = window_s
        self._clock = clock
        self._hits = {}                 # key -> deque[thời điểm]
        self._lock = threading.Lock()

    def hit(self, key):
        """Ghi nhận 1 lần gọi. Trả None nếu được phép, hoặc số giây phải chờ nếu đã vượt trần."""
        now = self._clock()
        with self._lock:
            q = self._hits.get(key)
            if q is None:
                if len(self._hits) >= MAX_KEYS:
                    self._prune(now)
                q = self._hits[key] = deque()
            while q and q[0] <= now - self.window_s:
                q.popleft()
            if len(q) >= self.max_calls:
                return q[0] + self.window_s - now
            q.append(now)
            return None

    def _prune(self, now):
        cutoff = now - self.window_s
        for key in [k for k, q in self._hits.items() if not q or q[-1] <= cutoff]:
            del self._hits[key]
        if len(self._hits) >= MAX_KEYS:   # vẫn đầy (bị dội từ rất nhiều IP) → bỏ hết, thà thả lỏng còn hơn sập
            self._hits.clear()


def client_ip(request: Request):
    """IP thật của khách. Sau proxy của PaaS (Railway), request.client là IP của proxy → đọc
    X-Forwarded-For. Lấy phần tử CUỐI (do proxy của nền tảng thêm vào), không lấy phần tử đầu vì
    khách tự ghi được. Chỉ tin header này khi TRUST_PROXY=true — chạy trần thì ai cũng giả được."""
    if config.TRUST_PROXY:
        forwarded = request.headers.get("x-forwarded-for", "")
        last = forwarded.split(",")[-1].strip()
        if last:
            return last
    return request.client.host if request.client else "unknown"


def rate_limit(name, max_calls, window_s):
    limiter = SlidingWindow(max_calls, window_s)

    def dependency(request: Request):
        if not config.RATE_LIMIT_ENABLED:
            return
        wait = limiter.hit(client_ip(request))
        if wait is not None:
            raise HTTPException(status_code=429, detail=TOO_MANY,
                                headers={"Retry-After": str(max(1, math.ceil(wait)))})

    dependency.__name__ = f"rate_limit_{name}"
    dependency.limiter = limiter
    return dependency
