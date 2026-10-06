from fastapi.testclient import TestClient

from api.agent_singleton import get_agent
from api.main import app

VALID_SID = "test-session-0001"


class FakeAgent:
    def handle(self, session_id, text):
        return {"reply": "Chào anh/chị!",
                "trace": {"tool_calls": [], "tool_results": []}}


def test_chat_endpoint_returns_agent_reply():
    app.dependency_overrides[get_agent] = lambda: FakeAgent()
    client = TestClient(app)
    resp = client.post("/api/chat", json={"session_id": VALID_SID, "message": "xin chào"})
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["reply"] == "Chào anh/chị!"


def test_chat_endpoint_returns_tool_calls_from_trace():
    class ToolAgent:
        def handle(self, session_id, text):
            return {"reply": "Còn phòng ạ.",
                    "trace": {"tool_calls": [{"name": "availability_tool", "args": {}}],
                              "tool_results": ["{\"Deluxe Queen\": 3}"]}}

    app.dependency_overrides[get_agent] = lambda: ToolAgent()
    client = TestClient(app)
    resp = client.post("/api/chat", json={"session_id": VALID_SID, "message": "còn phòng ko"})
    app.dependency_overrides.clear()
    data = resp.json()
    assert data["tool_calls"] == [{"name": "availability_tool", "args": {}}]
    assert data["tool_results"] == ["{\"Deluxe Queen\": 3}"]


def test_chat_rejects_malformed_session_id():
    app.dependency_overrides[get_agent] = lambda: FakeAgent()
    client = TestClient(app)
    try:
        for bad in ["s1", "có dấu cách và ký tự lạ!", "x" * 65]:
            resp = client.post("/api/chat", json={"session_id": bad, "message": "hi"})
            assert resp.status_code == 422, bad
    finally:
        app.dependency_overrides.clear()


def test_chat_accepts_uuid_session_id():
    app.dependency_overrides[get_agent] = lambda: FakeAgent()
    client = TestClient(app)
    try:
        resp = client.post("/api/chat", json={
            "session_id": "3f2b8c1e-9a4d-4e6f-b1c2-7d8e9f0a1b2c", "message": "hi"})
        assert resp.status_code == 200
    finally:
        app.dependency_overrides.clear()
