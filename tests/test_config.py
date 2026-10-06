import importlib
import os

from agent import config


def test_static_paths_point_to_repo_data():
    assert os.path.exists(config.KNOWLEDGE_PATH)
    assert os.path.isdir(config.IMAGES_DIR)


def test_storage_paths_follow_env(monkeypatch, tmp_path):
    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    monkeypatch.delenv("DB_PATH", raising=False)
    monkeypatch.delenv("LOG_PATH", raising=False)
    try:
        cfg = importlib.reload(config)
        assert cfg.DB_PATH == os.path.join(str(tmp_path), "hotel.db")
        assert cfg.LOG_PATH == os.path.join(str(tmp_path), "logs", "traces.jsonl")
    finally:
        monkeypatch.undo()
        importlib.reload(config)


def test_env_bool(monkeypatch):
    monkeypatch.setenv("X_FLAG", "true")
    assert config._env_bool("X_FLAG", False) is True
    monkeypatch.setenv("X_FLAG", "0")
    assert config._env_bool("X_FLAG", True) is False
    monkeypatch.delenv("X_FLAG")
    assert config._env_bool("X_FLAG", True) is True


def test_constants():
    assert config.HISTORY_TURNS == 6
    assert config.MAX_TOOL_ITERS == 5
    assert config.MAX_INPUT_CHARS == 500
