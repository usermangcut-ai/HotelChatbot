import threading

from agent.memory import Memory


def test_history_empty_for_new_session():
    assert Memory(turns=2).get("s1") == []


def test_append_and_get():
    m = Memory(turns=2)
    m.append("s1", "user", "còn phòng hướng biển ko")
    m.append("s1", "assistant", "còn Deluxe Ocean View")
    assert m.get("s1") == [
        {"role": "user", "content": "còn phòng hướng biển ko"},
        {"role": "assistant", "content": "còn Deluxe Ocean View"},
    ]


def test_get_trims_to_last_n_turns():
    m = Memory(turns=1)
    for i in range(3):
        m.append("s1", "user", f"u{i}")
        m.append("s1", "assistant", f"a{i}")
    assert m.get("s1") == [
        {"role": "user", "content": "u2"},
        {"role": "assistant", "content": "a2"},
    ]


def test_sessions_isolated():
    m = Memory(turns=2)
    m.append("s1", "user", "x")
    assert m.get("s2") == []


class FakeClock:
    """Đồng hồ giả để test thời gian không hoạt động mà không phải chờ thật."""
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


def test_idle_session_is_forgotten():
    clock = FakeClock()
    m = Memory(turns=2, idle_seconds=60, now=clock)
    m.append("s1", "user", "hi")
    clock.t = 61
    assert m.get("s1") == []
    assert len(m) == 0


def test_session_with_recent_message_survives():
    clock = FakeClock()
    m = Memory(turns=2, idle_seconds=60, now=clock)
    m.append("s1", "user", "hi")
    clock.t = 50
    m.append("s1", "assistant", "chào")
    clock.t = 100   # 50s kể từ tin nhắn cuối
    assert len(m.get("s1")) == 2


def test_reading_does_not_extend_session():
    clock = FakeClock()
    m = Memory(turns=2, idle_seconds=60, now=clock)
    m.append("s1", "user", "hi")
    clock.t = 50
    assert m.get("s1") != []
    clock.t = 61
    assert m.get("s1") == []


def test_least_recently_active_session_evicted_over_capacity():
    clock = FakeClock()
    m = Memory(turns=2, idle_seconds=3600, max_sessions=2, now=clock)
    m.append("s1", "user", "a")
    clock.t = 1
    m.append("s2", "user", "b")
    clock.t = 2
    m.append("s1", "user", "c")   # s1 hoạt động lại → s2 thành cũ nhất
    clock.t = 3
    m.append("s3", "user", "d")
    assert len(m) == 2
    assert m.get("s2") == []
    assert m.get("s1") != [] and m.get("s3") != []


def test_stored_messages_trimmed_to_last_turns():
    m = Memory(turns=1)
    for i in range(3):
        m.append("s1", "user", f"u{i}")
        m.append("s1", "assistant", f"a{i}")
    assert len(m._store["s1"]["msgs"]) == 2


def test_concurrent_appends_keep_every_message():
    m = Memory(turns=0)   # turns=0 → không cắt, để đếm đủ

    def worker(n):
        for i in range(200):
            m.append("shared", "user", f"{n}-{i}")
            m.append(f"own-{n}", "user", str(i))

    threads = [threading.Thread(target=worker, args=(n,)) for n in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(m.get("shared")) == 8 * 200
    assert len(m) == 9
