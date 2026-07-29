from api.agent_singleton import get_agent


def test_get_agent_returns_same_instance_across_calls():
    a1 = get_agent()
    a2 = get_agent()
    assert a1 is a2
