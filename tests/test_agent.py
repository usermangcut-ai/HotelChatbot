from agent import clock
from agent.agent import Agent
from agent.memory import Memory


def make_llm(script):
    calls = {"i": 0}

    def llm(messages, tools=None, tool_choice="auto"):
        msg = script[calls["i"]]
        calls["i"] += 1
        return msg

    llm.calls = calls
    return llm


def test_direct_answer_no_tool():
    agent = Agent(llm=make_llm([{"role": "assistant", "content": "Chào anh/chị!"}]),
                  tools={}, system_prompt="sys", memory=Memory())
    out = agent.handle("s1", "hi")
    assert out["reply"] == "Chào anh/chị!"
    assert out["trace"]["tool_calls"] == []


def test_calls_tool_then_answers():
    script = [
        {"role": "assistant", "content": None, "tool_calls": [
            {"id": "c1", "type": "function",
             "function": {"name": "echo", "arguments": "{\"x\": \"phòng\"}"}}]},
        {"role": "assistant", "content": "Kết quả: phòng"},
    ]
    seen = {}

    def echo(args):
        seen.update(args)
        return "phòng"

    tools = {"echo": ({"type": "function", "function": {"name": "echo", "parameters": {}}}, echo)}
    agent = Agent(llm=make_llm(script), tools=tools, system_prompt="sys", memory=Memory())
    out = agent.handle("s1", "tra phòng")
    assert seen == {"x": "phòng"}
    assert out["reply"] == "Kết quả: phòng"
    assert out["trace"]["tool_calls"] == [{"name": "echo", "args": {"x": "phòng"}}]


def test_stops_at_max_iters():
    loop_msg = {"role": "assistant", "content": None, "tool_calls": [
        {"id": "c", "type": "function", "function": {"name": "echo", "arguments": "{}"}}]}
    final = {"role": "assistant", "content": "Xin lỗi, chưa xử lý được."}
    tools = {"echo": ({"type": "function", "function": {"name": "echo", "parameters": {}}},
                      lambda args: "x")}
    agent = Agent(llm=make_llm([loop_msg] * 5 + [final]), tools=tools,
                  system_prompt="sys", memory=Memory(), max_iters=5)
    out = agent.handle("s1", "loop")
    assert "chưa xử lý được" in out["reply"]


def test_saves_history():
    mem = Memory()
    agent = Agent(llm=make_llm([{"role": "assistant", "content": "ok"}]),
                  tools={}, system_prompt="sys", memory=mem)
    agent.handle("s1", "câu 1")
    assert mem.get("s1") == [
        {"role": "user", "content": "câu 1"},
        {"role": "assistant", "content": "ok"},
    ]


def test_system_message_includes_current_date():
    seen = {}

    def llm(messages, tools=None, tool_choice="auto"):
        seen["system"] = messages[0]["content"]
        return {"role": "assistant", "content": "ok"}

    agent = Agent(llm=llm, tools={}, system_prompt="sys", memory=Memory())
    agent.handle("s1", "hi")
    assert clock.today().isoformat() in seen["system"]
    assert "sys" in seen["system"]


def test_guardrail_blocks_discards_speculative_llm_result():
    # Agent chạy song song guardrail + lượt gọi LLM đầu tiên (để cắt latency khi được phép) — khi
    # guardrail chặn, LLM chính CÓ THỂ vẫn được gọi (chạy nền, không chờ), nhưng kết quả của nó không
    # bao giờ được dùng: reply luôn là câu từ chối, không tool nào được dispatch.
    def llm(messages, tools=None, tool_choice="auto"):
        return {"role": "assistant", "content": None, "tool_calls": [
            {"id": "c1", "type": "function", "function": {"name": "echo", "arguments": "{}"}}]}

    def guardrail(text, history):
        return False, "Ngoài phạm vi hỗ trợ ạ."

    agent = Agent(llm=llm, tools={}, system_prompt="sys", memory=Memory(), guardrail=guardrail)
    out = agent.handle("s1", "1 + 1 bằng mấy")
    assert out["reply"] == "Ngoài phạm vi hỗ trợ ạ."
    assert out["trace"]["blocked"] is True
    assert out["trace"]["tool_calls"] == []


def test_guardrail_allows_normal_flow():
    def guardrail(text, history):
        return True, None

    agent = Agent(llm=make_llm([{"role": "assistant", "content": "Chào anh/chị!"}]),
                  tools={}, system_prompt="sys", memory=Memory(), guardrail=guardrail)
    out = agent.handle("s1", "hi")
    assert out["reply"] == "Chào anh/chị!"
    assert "blocked" not in out["trace"]


def test_second_turn_sees_history():
    seen = {}
    script = [
        {"role": "assistant", "content": "Còn Deluxe Ocean View ạ."},
        {"role": "assistant", "content": "Deluxe Ocean View Twin cũng còn ạ."},
    ]
    calls = {"i": 0}

    def llm(messages, tools=None, tool_choice="auto"):
        seen[calls["i"]] = [m["content"] for m in messages if m["role"] in ("user", "assistant")]
        msg = script[calls["i"]]
        calls["i"] += 1
        return msg

    agent = Agent(llm=llm, tools={}, system_prompt="sys", memory=Memory())
    agent.handle("s1", "còn phòng hướng biển ko")
    agent.handle("s1", "thế loại twin thì sao")
    assert "còn phòng hướng biển ko" in seen[1]
    assert "Còn Deluxe Ocean View ạ." in seen[1]
    assert "thế loại twin thì sao" in seen[1]
