import json
from agent import trace


def test_log_appends_jsonl(tmp_path):
    path = tmp_path / "traces.jsonl"
    trace.log({"turn": 1, "input": "hi", "reply": "chào"}, path=str(path))
    trace.log({"turn": 2, "input": "bye", "reply": "tạm biệt"}, path=str(path))
    lines = path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 2
    assert json.loads(lines[0])["input"] == "hi"
    assert json.loads(lines[1])["reply"] == "tạm biệt"
