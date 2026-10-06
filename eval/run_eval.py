"""Chạy 2 golden dataset (single + multi-turn) qua Agent thật; in tỉ lệ gọi đúng tool & reply khớp."""
import json
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from agent import guardrail, llm_client, trace  # noqa: E402
from agent.agent import Agent  # noqa: E402
from agent.memory import Memory  # noqa: E402
from agent.prompts import build_system_prompt  # noqa: E402
from agent.schema import init_db  # noqa: E402
from agent.tools import build_tools  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name):
    with open(os.path.join(HERE, name), encoding="utf-8") as f:
        return [json.loads(ln) for ln in f if ln.strip()]


def _check(turn, out):
    used = [t["name"] for t in out["trace"]["tool_calls"]]
    exp = turn.get("expect_tool", [])
    if exp == "any":                      # gọi tool hay tái dùng context đều chấp nhận
        t_ok = True
    else:
        t_ok = all(e in used for e in exp) if exp else (len(used) == 0)
    forbid = turn.get("forbid_tool", [])  # tool tuyệt đối không được gọi (vd ngoài phạm vi)
    if forbid and any(f in used for f in forbid):
        t_ok = False
    c_ok = turn.get("expect_contains", "") in out["reply"]
    return t_ok, c_ok, used


def main():
    if not llm_client.is_configured():
        print("⚠️  Chưa cấu hình .env."); return
    init_db()
    agent = Agent(llm=llm_client.chat_with_tools, tools=build_tools(),
                  system_prompt=build_system_prompt(), memory=Memory(), tracer=trace.log,
                  guardrail=guardrail.check)

    tool_ok = contains_ok = total = 0
    fails = []

    for c in _load("golden.jsonl"):                          # single-turn
        out = agent.handle("eval-s-" + uuid.uuid4().hex[:6], c["input"])
        t_ok, c_ok, used = _check(c, out)
        tool_ok += t_ok; contains_ok += c_ok; total += 1
        if not (t_ok and c_ok):
            fails.append((c["input"], c.get("expect_tool", []), used,
                          c.get("expect_contains", ""), out["reply"]))

    for conv in _load("golden_multi.jsonl"):                 # multi-turn: mỗi hội thoại 1 session
        sid = "eval-m-" + uuid.uuid4().hex[:6]
        for i, turn in enumerate(conv["conversation"]):
            out = agent.handle(sid, turn["input"])
            t_ok, c_ok, used = _check(turn, out)
            tool_ok += t_ok; contains_ok += c_ok; total += 1
            if not (t_ok and c_ok):
                fails.append((f"[{conv.get('note','')}] L{i+1}: {turn['input']}",
                              turn.get("expect_tool", []), used,
                              turn.get("expect_contains", ""), out["reply"]))

    print(f"\nTOOL đúng : {tool_ok}/{total}")
    print(f"REPLY khớp: {contains_ok}/{total}")
    for inp, exp, used, ec, rep in fails:
        print(f"\n• {inp!r}\n   expect_tool={exp} used={used} expect_contains={ec!r}\n   reply={rep!r}")


if __name__ == "__main__":
    main()
