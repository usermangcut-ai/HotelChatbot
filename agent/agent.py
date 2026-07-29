"""Agent tool-use: dựng messages, gọi LLM có tools, thực thi tool, lặp tới câu cuối."""
import json
from datetime import date

from agent.config import MAX_TOOL_ITERS


class Agent:
    def __init__(self, llm, tools, system_prompt, memory, tracer=None, max_iters=MAX_TOOL_ITERS,
                 guardrail=None):
        self.llm = llm
        self.tools = tools                      # name -> (schema, fn)
        self.system_prompt = system_prompt
        self.memory = memory
        self.tracer = tracer
        self.max_iters = max_iters
        self.guardrail = guardrail              # callable(text, history) -> (allowed, refusal_msg)
        self._schemas = [schema for schema, _ in tools.values()]

    def _dispatch(self, name, args):
        entry = self.tools.get(name)
        if entry is None:
            return f"LỖI: không có tool tên '{name}'."
        _, fn = entry
        return fn(args)

    def handle(self, session_id, text):
        if self.guardrail:
            allowed, refusal = self.guardrail(text, self.memory.get(session_id))
            if not allowed:
                self.memory.append(session_id, "user", text)
                self.memory.append(session_id, "assistant", refusal)
                trace = {"session_id": session_id, "input": text, "tool_calls": [],
                          "tool_results": [], "reply": refusal, "blocked": True}
                if self.tracer:
                    self.tracer(trace)
                return {"reply": refusal, "trace": trace}

        today_note = (
            f"\n\n# Ngày hiện tại\nHôm nay là {date.today().isoformat()} (YYYY-MM-DD) — dùng mốc "
            f"này để tính các ngày tương đối khách nhắc tới (vd \"ngày mai\", \"2 ngày tới\", "
            f"\"cuối tuần này\"). Luôn truyền check_in/check_out cho tool ở định dạng YYYY-MM-DD, "
            f"tính đúng từ ngày hôm nay — không dùng năm cũ hay ngày tự đoán.")
        messages = [{"role": "system", "content": self.system_prompt + today_note}]
        messages += self.memory.get(session_id)
        messages.append({"role": "user", "content": text})

        tool_calls_log, results_log, reply = [], [], None

        for _ in range(self.max_iters):
            msg = self.llm(messages, tools=self._schemas or None)
            messages.append(msg)
            calls = msg.get("tool_calls")
            if not calls:
                reply = msg.get("content") or ""
                break
            for call in calls:
                name = call["function"]["name"]
                args = json.loads(call["function"].get("arguments") or "{}")
                result = self._dispatch(name, args)
                tool_calls_log.append({"name": name, "args": args})
                results_log.append(result)
                messages.append({"role": "tool", "tool_call_id": call["id"], "content": result})

        if reply is None:
            msg = self.llm(messages, tools=None)
            reply = msg.get("content") or "Xin lỗi, tôi chưa xử lý được yêu cầu này."

        self.memory.append(session_id, "user", text)
        self.memory.append(session_id, "assistant", reply)

        trace = {"session_id": session_id, "input": text,
                 "tool_calls": tool_calls_log, "tool_results": results_log, "reply": reply}
        if self.tracer:
            self.tracer(trace)
        return {"reply": reply, "trace": trace}
