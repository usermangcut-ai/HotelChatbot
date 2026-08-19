"""Agent dùng chung cho toàn bộ API — 1 instance sống suốt vòng đời process, giữ Memory theo
session_id."""
from agent import llm_client, trace
from agent.agent import Agent
from agent.memory import Memory
from agent.prompts import build_system_prompt
from agent.tools import build_tools

_agent = None


def get_agent():
    global _agent
    if _agent is None:
        _agent = Agent(llm=llm_client.chat_with_tools, tools=build_tools(),
                        system_prompt=build_system_prompt(), memory=Memory(), tracer=trace.log)
        # TẠM tắt guardrail để test latency không qua lớp guardrail. Muốn bật lại: thêm
        # "from agent import guardrail" vào import ở đầu file, rồi thêm tham số
        # guardrail=guardrail.check vào lệnh khởi tạo Agent ở trên.
    return _agent
