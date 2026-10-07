import { describe, expect, it } from "vitest";
import { parseRich } from "./richText";

describe("parseRich", () => {
  it("keeps plain text as one paragraph", () => {
    expect(parseRich("Dạ còn phòng ạ.")).toEqual([{ type: "p", parts: [{ text: "Dạ còn phòng ạ.", bold: false }] }]);
  });
  it("splits paragraphs on blank lines and groups bullet lines into a list", () => {
    expect(parseRich("Các tiện ích:\n\n- Wifi miễn phí\n- **Minibar**\n\nCần gì cứ gọi em.")).toEqual([
      { type: "p", parts: [{ text: "Các tiện ích:", bold: false }] },
      { type: "ul", items: [[{ text: "Wifi miễn phí", bold: false }], [{ text: "Minibar", bold: true }]] },
      { type: "p", parts: [{ text: "Cần gì cứ gọi em.", bold: false }] },
    ]);
  });
  it("renders **bold** inside a sentence", () => {
    expect(parseRich("Giá **3.900.000đ**/đêm")).toEqual([{ type: "p", parts: [
      { text: "Giá ", bold: false }, { text: "3.900.000đ", bold: true }, { text: "/đêm", bold: false }] }]);
  });
  it("accepts • and numbered list markers", () => {
    expect(parseRich("• A\n1. B")).toEqual([{ type: "ul", items: [[{ text: "A", bold: false }], [{ text: "B", bold: false }]] }]);
  });
});
