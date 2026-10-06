"""Agent dùng chung cho toàn bộ API — 1 instance sống suốt vòng đời process, giữ Memory theo
session_id. Guardrail bật mặc định; đặt GUARDRAIL_ENABLED=false để tắt khi cần đo latency."""
from agent import guardrail, llm_client, trace
from agent.agent import Agent
from agent.config import GUARDRAIL_ENABLED
from agent.memory import Memory
from agent.prompts import build_system_prompt
from agent.tools import build_tools

_agent = None


def get_agent():
    global _agent
    if _agent is None:
        _agent = Agent(llm=llm_client.chat_with_tools, tools=build_tools(),
                       system_prompt=build_system_prompt(), memory=Memory(), tracer=trace.log,
                       guardrail=guardrail.check if GUARDRAIL_ENABLED else None)
    return _agent
