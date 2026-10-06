"""Agent tool-use: dựng messages, gọi LLM có tools, thực thi tool, lặp tới câu cuối."""
import concurrent.futures
import json

from agent import clock
from agent.config import AGENT_EXECUTOR_WORKERS, MAX_TOOL_ITERS


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
        # dùng chung cho mọi request — I/O-bound (network call) nên threads chạy song song thật dù
        # có GIL; sống suốt vòng đời Agent (singleton), không tạo/hủy pool mỗi request
        self._executor = concurrent.futures.ThreadPoolExecutor(max_workers=AGENT_EXECUTOR_WORKERS)

    def _dispatch(self, name, args):
        entry = self.tools.get(name)
        if entry is None:
            return f"LỖI: không có tool tên '{name}'."
        _, fn = entry
        return fn(args)

    def handle(self, session_id, text):
        history = self.memory.get(session_id)
        today_note = (
            f"\n\n# Ngày hiện tại\nHôm nay là {clock.today().isoformat()} (YYYY-MM-DD) — dùng mốc "
            f"này để tính các ngày tương đối khách nhắc tới (vd \"ngày mai\", \"2 ngày tới\", "
            f"\"cuối tuần này\"). Luôn truyền check_in/check_out cho tool ở định dạng YYYY-MM-DD, "
            f"tính đúng từ ngày hôm nay — không dùng năm cũ hay ngày tự đoán.")
        messages = [{"role": "system", "content": self.system_prompt + today_note}]
        messages += history
        messages.append({"role": "user", "content": text})

        # Chạy SONG SONG guardrail + lượt gọi LLM đầu tiên của Agent chính (thay vì chờ guardrail
        # xong mới bắt đầu) — cắt 1 round-trip khỏi tổng latency của case ĐƯỢC PHÉP (đa số). Nếu
        # guardrail chặn, kết quả speculative này bị vứt — KHÔNG bao giờ gọi .result() lại nên
        # tool_calls của nó (nếu có) không bao giờ được dispatch, giữ nguyên đảm bảo "lượt bị chặn
        # không thực thi tool nào". Đánh đổi: lượt bị chặn giờ vẫn tốn 1 lệnh gọi LLM chính (lãng phí
        # so với trước), đổi lấy lượt được phép nhanh hơn hẳn.
        # provider mạng có thể timeout/lỗi bất cứ lúc nào (đã gặp thật: DNS sai, read timeout) —
        # KHÔNG để exception văng thẳng lên API thành 500 thô; fail-open cho guardrail (nhất quán với
        # guardrail.classify() đã tự fail-open on_topic khi lỗi), fail-safe cho Agent chính (trả lời
        # xin lỗi thay vì crash).
        prefetched_msg = None
        if self.guardrail:
            guardrail_future = self._executor.submit(self.guardrail, text, history)
            agent_future = self._executor.submit(self.llm, messages, tools=self._schemas or None)
            try:
                allowed, refusal = guardrail_future.result()
            except Exception:
                allowed, refusal = True, None
            if not allowed:
                self.memory.append(session_id, "user", text)
                self.memory.append(session_id, "assistant", refusal)
                trace = {"session_id": session_id, "input": text, "tool_calls": [],
                          "tool_results": [], "reply": refusal, "blocked": True}
                if self.tracer:
                    self.tracer(trace)
                return {"reply": refusal, "trace": trace}
            try:
                prefetched_msg = agent_future.result()
            except Exception:
                prefetched_msg = None   # rơi về gọi lại bình thường (đồng bộ) trong loop bên dưới

        tool_calls_log, results_log, reply = [], [], None
        errored = False

        try:
            for i in range(self.max_iters):
                msg = prefetched_msg if i == 0 and prefetched_msg is not None else \
                    self.llm(messages, tools=self._schemas or None)
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
        except Exception:
            errored = True
            reply = ("Dạ hệ thống đang gặp sự cố kết nối, anh/chị vui lòng thử lại sau ít phút giúp "
                      "em ạ.")

        self.memory.append(session_id, "user", text)
        self.memory.append(session_id, "assistant", reply)

        trace = {"session_id": session_id, "input": text,
                 "tool_calls": tool_calls_log, "tool_results": results_log, "reply": reply}
        if errored:
            trace["error"] = True
        if self.tracer:
            self.tracer(trace)
        return {"reply": reply, "trace": trace}
