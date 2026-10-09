"""CLI chat: gõ câu -> Agent trả lời. Cần .env cấu hình provider."""
import sys
import uuid

from agent import guardrail, llm_client, trace
from agent.agent import Agent
from agent.memory import Memory
from agent.prompts import build_system_prompt
from agent.schema import init_db
from agent.tools import build_tools

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def build_agent():
    return Agent(llm=llm_client.chat_with_tools, tools=build_tools(),
                 system_prompt=build_system_prompt(), memory=Memory(), tracer=trace.log,
                 guardrail=guardrail.check)


def main():
    if not llm_client.is_configured():
        print("⚠️  Chưa cấu hình .env (LLM_BASE_URL/LLM_API_KEY/LLM_MODEL).")
        return
    init_db()
    agent = build_agent()
    session_id = "cli-" + uuid.uuid4().hex[:8]
    print("Chatbot Khaifrost Resort. Gõ 'quit' để thoát.")
    while True:
        try:
            text = input("\nBạn: ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if text.lower() in {"quit", "exit"}:
            break
        if not text:
            continue
        print("Bot:", agent.handle(session_id, text)["reply"])


if __name__ == "__main__":
    main()
