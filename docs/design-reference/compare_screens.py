"""Chụp mockup và app thật cùng kích thước để so sánh độ giống thiết kế (công cụ dev, không chạy trong CI).

Dùng:  python docs/design-reference/compare_screens.py landing http://127.0.0.1:8010/
Ảnh ra: docs/design-reference/mockups/build/compare/<tên>-<cảnh>-{mockup,app}.png
Cần: đã build mockup (mockups/build.py <tên>) và app đang chạy ở URL truyền vào.
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent
SIZES = {"desktop": (1440, 900), "mobile": (390, 844)}
# cảnh: (tên, hành động) — hành động nhận page, dùng selector chung data-open-chat / id có ở cả mockup lẫn app
SCENES = [
    ("top", lambda p: None),
    ("rooms", lambda p: p.evaluate("document.getElementById('phong').scrollIntoView()")),
    ("chat", lambda p: p.locator("[data-open-chat]:visible").first.click()),
]


def shoot(page, url, out, hide_note):
    for scene, act in SCENES:
        page.goto(url)
        page.wait_for_load_state("networkidle")
        if hide_note:
            page.add_style_tag(content=".note{display:none!important}")
        act(page)
        page.wait_for_timeout(600)   # hết hiệu ứng mở ngăn kéo (400ms)
        page.screenshot(path=str(out / f"{scene}.png"))


def main(name, app_url):
    mock = (ROOT / "mockups" / "build" / f"{name}.html").resolve().as_uri()
    out_dir = ROOT / "mockups" / "build" / "compare"
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for size, (w, h) in SIZES.items():
            for label, url, hide in (("mockup", mock, True), ("app", app_url, False)):
                page = browser.new_page(viewport={"width": w, "height": h})
                tmp = out_dir / f"{name}-{size}-{label}"
                tmp.mkdir(parents=True, exist_ok=True)
                shoot(page, url, tmp, hide)
                page.close()
        browser.close()
    print("Ảnh ở", out_dir)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
