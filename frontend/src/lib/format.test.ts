import { describe, expect, it } from "vitest";
import { formatDate, formatVnd, nightsBetween, toIsoDate } from "./format";

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
