import { describe, expect, it } from "vitest";
import { formatDate, formatVnd, formatWhen, nightsBetween, toIsoDate } from "./format";

describe("format", () => {
  it("formats VND with dot separators", () => {
    expect(formatVnd(3150000)).toBe("3.150.000đ");
    expect(formatVnd(0)).toBe("0đ");
  });
  it("formats ISO date as dd/mm/yyyy", () => {
    expect(formatDate("2026-10-16")).toBe("16/10/2026");
  });
  it("counts nights between ISO dates", () => {
    expect(nightsBetween("2026-10-16", "2026-10-18")).toBe(2);
    expect(nightsBetween("2026-10-31", "2026-11-01")).toBe(1);
  });
  it("converts a local Date to ISO date without timezone shift", () => {
    expect(toIsoDate(new Date(2026, 9, 7, 0, 30))).toBe("2026-10-07");
  });
});

describe("formatWhen", () => {
  it("labels today, yesterday and tomorrow relative to the given day", () => {
    expect(formatWhen("2026-10-17T09:42:10", "2026-10-17")).toBe("Hôm nay 09:42");
    expect(formatWhen("2026-10-16 16:20", "2026-10-17")).toBe("Hôm qua 16:20");
    expect(formatWhen("2026-10-18 19:00", "2026-10-17")).toBe("Ngày mai 19:00");
  });
  it("falls back to day/month for other days", () => {
    expect(formatWhen("2026-10-20 15:00", "2026-10-17")).toBe("20/10 15:00");
    expect(formatWhen("2026-10-20", "2026-10-17")).toBe("20/10");
  });
});
