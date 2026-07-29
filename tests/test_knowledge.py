from agent import knowledge


def test_all_nodes_covers_tree():
    nodes = knowledge.all_nodes()
    assert {n["kind"] for n in nodes} == {"room", "catalog", "info"}
    assert len(nodes) == 15   # 8 phòng + 1 catalog + 6 info (bỏ node hotel trùng)


def test_room_node_has_fields():
    r = knowledge.get_node_by_title("Villa 3 Bedroom Beachfront")
    assert r is not None and r["kind"] == "room"
    assert r["fields"]["price_vnd"] == 18000000


def test_catalog_node_lists_rooms_and_amenity_index():
    c = knowledge.get_node_by_title("Danh sách hạng phòng")
    assert c is not None and c["kind"] == "catalog"
    assert "Deluxe Queen" in c["text"] and "Villa 3 Bedroom Beachfront" in c["text"]
    assert "Hồ bơi riêng" in c["text"]
    assert "3.150.000" in c["text"]


def test_get_node_unknown_returns_none():
    assert knowledge.get_node_by_title("không tồn tại") is None


def test_node_titles_and_menu():
    assert len(knowledge.node_titles()) == 15
    assert "Danh sách hạng phòng" in knowledge.node_titles()
    assert "Thông tin chung" in knowledge.node_titles()
    menu = knowledge.node_menu()
    assert len(menu) == 15 and all(":" in ln for ln in menu)


def test_amenity_vocab():
    assert "Hồ bơi riêng" in knowledge.amenity_vocab()


def test_room_titles_has_8():
    assert len(knowledge.room_titles()) == 8
    assert "Deluxe Queen" in knowledge.room_titles()


def test_room_price():
    assert knowledge.room_price("Villa 3 Bedroom Beachfront") == 18000000
    assert knowledge.room_price("không tồn tại") is None
