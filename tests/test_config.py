import os
from agent import config


def test_paths_point_to_existing_data():
    assert os.path.exists(config.KNOWLEDGE_PATH)
    assert os.path.exists(config.DB_PATH)


def test_constants():
    assert config.HISTORY_TURNS == 6
    assert config.MAX_TOOL_ITERS == 5
    assert config.MAX_INPUT_CHARS == 500
