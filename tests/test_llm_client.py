import io
import json

from agent import llm_client


class _FakeResp(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()


def test_sends_tools_and_parses_tool_calls(monkeypatch):
    captured = {}

    def fake_urlopen(req, timeout=0):
        captured["body"] = json.loads(req.data.decode("utf-8"))
        payload = {"choices": [{"message": {
            "role": "assistant", "content": None,
            "tool_calls": [{"id": "c1", "type": "function",
                            "function": {"name": "availability_tool", "arguments": "{}"}}]}}]}
        return _FakeResp(json.dumps(payload).encode("utf-8"))

    monkeypatch.setenv("LLM_BASE_URL", "https://x/v1")
    monkeypatch.setenv("LLM_API_KEY", "k")
    monkeypatch.setenv("LLM_MODEL", "m")
    monkeypatch.setattr(llm_client.urllib.request, "urlopen", fake_urlopen)

    tools = [{"type": "function", "function": {"name": "availability_tool", "parameters": {}}}]
    msg = llm_client.chat_with_tools([{"role": "user", "content": "hi"}], tools=tools)
    assert captured["body"]["tools"] == tools
    assert captured["body"]["tool_choice"] == "auto"
    assert msg["tool_calls"][0]["function"]["name"] == "availability_tool"


def test_without_tools_omits_field(monkeypatch):
    captured = {}

    def fake_urlopen(req, timeout=0):
        captured["body"] = json.loads(req.data.decode("utf-8"))
        payload = {"choices": [{"message": {"role": "assistant", "content": "chào anh/chị"}}]}
        return _FakeResp(json.dumps(payload).encode("utf-8"))

    monkeypatch.setenv("LLM_BASE_URL", "https://x/v1")
    monkeypatch.setenv("LLM_API_KEY", "k")
    monkeypatch.setenv("LLM_MODEL", "m")
    monkeypatch.setattr(llm_client.urllib.request, "urlopen", fake_urlopen)

    msg = llm_client.chat_with_tools([{"role": "user", "content": "hi"}])
    assert "tools" not in captured["body"]
    assert msg["content"] == "chào anh/chị"
