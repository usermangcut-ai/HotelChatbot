"""
LLM client cấu hình được (OpenAI-compatible) cho provider custom.

Đọc cấu hình từ biến môi trường:
  LLM_BASE_URL   ví dụ: https://your-provider/v1   (endpoint chuẩn OpenAI)
  LLM_API_KEY    api key của provider
  LLM_MODEL      tên model, ví dụ: gpt-4o-mini / claude-... / model nội bộ

Chỉ dùng stdlib (urllib) nên không cần cài thêm SDK. Nếu provider của bạn KHÔNG
theo chuẩn OpenAI /chat/completions, chỉ cần sửa hàm `chat()` bên dưới.
"""

import json
import os
import urllib.request
import urllib.error

try:  # nạp .env nếu có python-dotenv (không bắt buộc)
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class LLMNotConfigured(Exception):
    """Ném ra khi thiếu cấu hình provider."""


def is_configured() -> bool:
    return bool(os.getenv("LLM_BASE_URL") and os.getenv("LLM_API_KEY") and os.getenv("LLM_MODEL"))


def chat(messages, temperature=0.0, json_mode=True, timeout=30):
    """Gọi chat completion. Trả về chuỗi nội dung message của assistant."""
    base = os.getenv("LLM_BASE_URL")
    key = os.getenv("LLM_API_KEY")
    model = os.getenv("LLM_MODEL")
    if not (base and key and model):
        raise LLMNotConfigured("Chưa set LLM_BASE_URL / LLM_API_KEY / LLM_MODEL")

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    req = urllib.request.Request(
        url=base.rstrip("/") + "/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"]


def chat_with_tools(messages, tools=None, tool_choice="auto", temperature=0.0, timeout=60):
    """Gọi chat completion có function-calling. Trả NGUYÊN message dict của assistant
    (có thể chứa `tool_calls`)."""
    base = os.getenv("LLM_BASE_URL")
    key = os.getenv("LLM_API_KEY")
    model = os.getenv("LLM_MODEL")
    if not (base and key and model):
        raise LLMNotConfigured("Chưa set LLM_BASE_URL / LLM_API_KEY / LLM_MODEL")

    payload = {"model": model, "messages": messages, "temperature": temperature}
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = tool_choice

    req = urllib.request.Request(
        url=base.rstrip("/") + "/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]
