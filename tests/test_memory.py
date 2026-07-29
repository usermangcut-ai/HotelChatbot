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
