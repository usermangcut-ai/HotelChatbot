"""Load knowledge.json + registry TOÀN CÂY (hotel/room/catalog/info).

Retrieval = LLM tự đọc danh sách node (title + summary) rồi chọn `title`; tool chỉ fetch đúng node.
Không keyword-scoring, không bỏ dấu — mọi việc "chọn mục" giao cho LLM.
"""
import json

from agent.config import KNOWLEDGE_PATH

_cache = None
_nodes = None


def load(path=KNOWLEDGE_PATH):
    global _cache
    if _cache is None:
        with open(path, encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache


def rooms_catalog_text(path=KNOWLEDGE_PATH):
    """Bảng nén tất cả hạng phòng + index tiện ích->hạng + synonyms (cho LLM tự lọc/so/đếm)."""
    kb = load(path)
    lines = ["Bảng hạng phòng (giá VND/đêm · diện tích · tối đa khách · hướng · giường · tiện ích):"]
    for r in kb["rooms"]["types"]:
        f = r["fields"]
        price = f"{f['price_vnd']:,}".replace(",", ".")   # định dạng VN: 3.150.000
        lines.append(f"- {r['title']}: {price}đ · {f['size_m2']}m² · tối đa "
                     f"{f['max_occupancy']} · {f['view']} · {f['bed_type']} · "
                     f"tiện ích [{', '.join(f['amenities'])}]")
    lines.append("\nTiện ích → các hạng có tiện ích đó:")
    for am, rooms in kb["amenities"]["amenity_to_rooms"].items():
        lines.append(f"- {am}: {', '.join(rooms)}")
    syn = kb["amenities"]["synonyms"]
    lines.append("\nKhách nói tắt → tên chuẩn: " + "; ".join(f"{k}→{v}" for k, v in syn.items()))
    return "\n".join(lines)


def all_nodes(path=KNOWLEDGE_PATH):
    """Registry phẳng mọi node text: hotel + 8 phòng + 1 catalog + 8 info = 18 node."""
    global _nodes
    if _nodes is not None:
        return _nodes
    kb = load(path)
    nodes = []
    # KHÔNG thêm node `hotel` (blurb ngắn) — trùng ý với mục info "Thông tin chung" (đầy đủ hơn:
    # vị trí, quy mô, LIÊN HỆ, đánh giá). Bớt node trùng để LLM chọn node không nhầm lẫn.
    for r in kb["rooms"]["types"]:
        nodes.append({"id": r["id"], "title": r["title"], "kind": "room", "text": r["text"],
                      "fields": r.get("fields", {}),
                      "summary": f"Mô tả & thông số hạng phòng {r['title']}."})
    nodes.append({"id": "rooms_catalog", "title": "Danh sách hạng phòng", "kind": "catalog",
                  "text": rooms_catalog_text(path), "fields": None,
                  "summary": "Bảng tất cả hạng phòng + bản đồ tiện ích→hạng (để lọc/so sánh/đếm)."})
    for s in kb["info"]:
        nodes.append({"id": s["id"], "title": s["title"], "kind": "info", "text": s["text"],
                      "fields": None, "summary": s.get("summary", "")})
    _nodes = nodes
    return nodes


def get_node_by_title(title, path=KNOWLEDGE_PATH):
    t = (title or "").strip().lower()
    for n in all_nodes(path):
        if n["title"].lower() == t:
            return n
    return None


def node_titles(path=KNOWLEDGE_PATH):
    return [n["title"] for n in all_nodes(path)]


def node_menu(path=KNOWLEDGE_PATH):
    """Dòng 'title: summary' của mọi node — để LLM đọc và chọn."""
    return [f"{n['title']}: {n['summary']}" for n in all_nodes(path)]


def amenity_vocab(path=KNOWLEDGE_PATH):
    return load(path)["amenities"]["vocab"]


def room_titles(path=KNOWLEDGE_PATH):
    """Danh sách 8 tên hạng phòng theo đúng thứ tự trong knowledge.json (cho UI chọn hạng)."""
    return [r["title"] for r in load(path)["rooms"]["types"]]


def room_price(title, path=KNOWLEDGE_PATH):
    """Giá phòng/đêm (VND) theo tên hạng — dùng tính tổng tiền phiếu đặt phòng. None nếu không có."""
    for r in load(path)["rooms"]["types"]:
        if r["title"] == title:
            return r["fields"]["price_vnd"]
    return None
