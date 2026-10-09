"""Route /api/chat — bọc thẳng Agent.handle(). Chỉ 1 việc điều chỉnh: show_photos_tool trả
image_path là đường dẫn file local trên server — ở đây đổi thành URL /images/... để trình duyệt tải
được qua HTTP. Không thêm logic nghiệp vụ nào khác."""
import json
import os

from fastapi import APIRouter, Depends

from agent import photos

from api.agent_singleton import get_agent
from api.ratelimit import rate_limit
from api.schemas import ChatRequest, ChatResponse

router = APIRouter()


def _to_web_tool_results(tool_calls, tool_results):
    out = []
    for call, result in zip(tool_calls, tool_results):
        if call.get("name") != "show_photos_tool":
            out.append(result)
            continue
        try:
            payload = json.loads(result)
        except (TypeError, ValueError):
            out.append(result)
            continue
        path = payload.get("image_path")
        if path:
            payload["image_path"] = photos.photo_url(path)
        out.append(json.dumps(payload, ensure_ascii=False))
    return out


@router.post("/api/chat", response_model=ChatResponse,
             dependencies=[Depends(rate_limit("chat", 20, 60))])   # mỗi tin tốn tiền LLM
def chat(body: ChatRequest, agent=Depends(get_agent)):
    out = agent.handle(body.session_id, body.message)
    tool_calls = out["trace"]["tool_calls"]
    tool_results = _to_web_tool_results(tool_calls, out["trace"]["tool_results"])
    return ChatResponse(reply=out["reply"], tool_calls=tool_calls, tool_results=tool_results)
