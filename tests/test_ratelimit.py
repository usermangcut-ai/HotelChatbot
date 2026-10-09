from fastapi.testclient import TestClient

from agent import config
from api import ratelimit
from api.main import app
from api.ratelimit import SlidingWindow


class FakeClock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


def test_sliding_window_blocks_after_max_then_recovers():
    clock = FakeClock()
    w = SlidingWindow(2, 60, clock=clock)
    assert w.hit("a") is None
    assert w.hit("a") is None
    assert w.hit("a") == 60          # lần 3 trong cùng cửa sổ → phải chờ
    assert w.hit("b") is None        # IP khác không bị ảnh hưởng
    clock.t += 60
    assert w.hit("a") is None        # hết cửa sổ → được gọi lại


def test_sliding_window_prunes_when_full(monkeypatch):
    monkeypatch.setattr(ratelimit, "MAX_KEYS", 3)
    clock = FakeClock()
    w = SlidingWindow(1, 10, clock=clock)
    for k in "abc":
        w.hit(k)
    clock.t += 11                    # 3 key cũ đã hết hạn → bị dọn khi có key mới
    assert w.hit("d") is None
    assert set(w._hits) == {"d"}


def test_client_ip_uses_last_forwarded_entry_only_when_trusted(monkeypatch):
    class Req:
        headers = {"x-forwarded-for": "6.6.6.6, 203.0.113.9"}
        client = type("C", (), {"host": "10.0.0.1"})()

    monkeypatch.setattr(config, "TRUST_PROXY", False)
    assert ratelimit.client_ip(Req()) == "10.0.0.1"
    monkeypatch.setattr(config, "TRUST_PROXY", True)
    assert ratelimit.client_ip(Req()) == "203.0.113.9"


def test_login_endpoint_returns_429_when_limit_hit(monkeypatch):
    monkeypatch.setattr(config, "RATE_LIMIT_ENABLED", True)
    client = TestClient(app)
    body = {"identity_type": "staff", "username": "khongcoai", "password": "sai"}
    codes = [client.post("/api/auth/login", json=body).status_code for _ in range(11)]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429
    resp = client.post("/api/auth/login", json=body)
    assert resp.status_code == 429
    assert int(resp.headers["retry-after"]) >= 1
    assert "thử lại" in resp.json()["detail"]


def test_health_ok():
    resp = TestClient(app).get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
