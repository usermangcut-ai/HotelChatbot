from agent import guardrail
from api import agent_singleton
from api.agent_singleton import get_agent


def test_get_agent_returns_same_instance_across_calls():
    a1 = get_agent()
    a2 = get_agent()
    assert a1 is a2


def test_agent_uses_guardrail_when_enabled(monkeypatch):
    monkeypatch.setattr(agent_singleton, "_agent", None)
    monkeypatch.setattr(agent_singleton, "GUARDRAIL_ENABLED", True)
    assert agent_singleton.get_agent().guardrail is guardrail.check


def test_agent_skips_guardrail_when_disabled(monkeypatch):
    monkeypatch.setattr(agent_singleton, "_agent", None)
    monkeypatch.setattr(agent_singleton, "GUARDRAIL_ENABLED", False)
    assert agent_singleton.get_agent().guardrail is None
