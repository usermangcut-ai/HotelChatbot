from fastapi.testclient import TestClient

from api.agent_singleton import get_agent
from api.main import app


class FakeAgent:
    def handle(self, session_id, text):
        return {"reply": "Chào anh/chị!",
                "trace": {"tool_calls": [], "tool_results": []}}


def test_chat_endpoint_returns_agent_reply():
    app.dependency_overrides[get_agent] = lambda: FakeAgent()
    client = TestClient(app)
    resp = client.post("/api/chat", json={"session_id": "s1", "message": "xin chào"})
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
    resp = client.post("/api/chat", json={"session_id": "s1", "message": "còn phòng ko"})
    app.dependency_overrides.clear()
    data = resp.json()
    assert data["tool_calls"] == [{"name": "availability_tool", "args": {}}]
    assert data["tool_results"] == ["{\"Deluxe Queen\": 3}"]
