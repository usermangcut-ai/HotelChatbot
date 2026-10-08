"""Ghép dữ liệu thật (knowledge.json) + ảnh base64 vào các mockup để mở xem trong trình duyệt.

Chạy từ gốc repo:  python docs/design-reference/mockups/build.py landing login booking guest staff admin
Kết quả ở docs/design-reference/mockups/build/<tên>.html (gitignore — chỉ template là bản gốc)."""
import base64, json, pathlib, re, sys
d = pathlib.Path(__file__).parent
img = lambda n: "data:image/jpeg;base64," + base64.b64encode(pathlib.Path(f"data/images/{n}.jpg").read_bytes()).decode()
kb = json.load(open("data/knowledge.json", encoding="utf-8"))
rooms = [{"title": r["title"], "price": r["fields"]["price_vnd"], "size": r["fields"]["size_m2"],
          "guests": r["fields"]["max_occupancy"], "view": r["fields"]["view"], "bed": r["fields"]["bed_type"],
          "tags": " ".join(t for t, ok in (("sea", "biển" in r["fields"]["view"].lower()), ("villa", r["title"].startswith("Villa"))) if ok),
          "img": img(r["id"])} for r in kb["rooms"]["types"]]
for name in sys.argv[1:]:
    t = (d / f"{name}.template.html").read_text(encoding="utf-8").replace("{{ROOMS_JSON}}", json.dumps(rooms, ensure_ascii=False))
    t = re.sub(r"\{\{IMG_([a-z0-9_]+)\}\}", lambda m: img(m[1]), t)   # mọi {{IMG_<tên file>}}
    assert "{{" not in t, name
    # bọc giống skeleton của trang artifact (nơi user đã duyệt mockup): doctype, viewport, body margin 0
    t = ('<!doctype html><html lang="vi"><head><meta charset="utf-8">'
         '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
         '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
         + t + "</body></html>")
    (d / "build").mkdir(exist_ok=True)
    (d / "build" / f"{name}.html").write_text(t, encoding="utf-8"); print(name, len(t) // 1024, "KB")
