import { describe, expect, it } from "vitest";
import { DEPOSIT_PER_NIGHT, addDaysIso, bookingTotals, dateError, defaultStay, givenName, homeForRole, parseBookingQuery, stayProgress, transferNote, validateContact } from "./booking";

describe("bookingTotals", () => {
  it("computes nights, room total and deposit", () => {
    expect(bookingTotals(3900000, "2026-10-20", "2026-10-22")).toEqual({ nights: 2, total: 7800000, deposit: 2 * DEPOSIT_PER_NIGHT });
  });
  it("returns zero nights for invalid ranges", () => {
    expect(bookingTotals(3900000, "2026-10-22", "2026-10-20").nights).toBe(0);
  });
});

describe("validateContact", () => {
  it("accepts a complete contact", () => {
    expect(validateContact({ name: "Nguyễn Minh Anh", phone: "0901 234 567", email: "a@b.vn" })).toEqual({});
  });
  it("reports each missing or malformed field in Vietnamese", () => {
    expect(validateContact({ name: " ", phone: "12", email: "abc" })).toEqual({
      name: "Nhập họ và tên.", phone: "Số điện thoại chưa đúng.", email: "Email chưa đúng.",
    });
  });
});

describe("parseBookingQuery", () => {
  it("reads prefilled values from the URL", () => {
    expect(parseBookingQuery("?room_type=Deluxe+Queen&check_in=2026-10-20&check_out=2026-10-22&num_guests=2"))
      .toEqual({ roomType: "Deluxe Queen", checkIn: "2026-10-20", checkOut: "2026-10-22", numGuests: 2 });
  });
  it("ignores malformed values", () => {
    expect(parseBookingQuery("?check_in=20/10&num_guests=abc")).toEqual({ roomType: null, checkIn: null, checkOut: null, numGuests: null });
  });
});

describe("homeForRole", () => {
  it("maps roles to their home page", () => {
    expect(homeForRole("guest")).toBe("/tai-khoan");
    expect(homeForRole("staff")).toBe("/nhan-vien");
    expect(homeForRole("admin")).toBe("/quan-tri");
  });
});

describe("transferNote", () => {
  it("strips diacritics and uppercases", () => {
    expect(transferNote("Nguyễn Minh Anh")).toBe("SR NGUYEN MINH ANH");
    expect(transferNote("  Đặng   thị  Ánh ")).toBe("SR DANG THI ANH");
  });
  it("shortens long names at a word boundary", () => {
    expect(transferNote("Nguyễn Thị Phương Hoàng Yến Nhi")).toBe("SR NGUYEN THI PHUONG");
  });
  it("falls back when the name is empty or symbols only", () => {
    expect(transferNote("")).toBe("SR DAT PHONG");
    expect(transferNote("@@")).toBe("SR DAT PHONG");
  });
});

describe("dates", () => {
  it("adds days in local time across month ends", () => {
    expect(addDaysIso(new Date(2026, 9, 30), 2)).toBe("2026-11-01");
  });
  it("defaults to tomorrow + 9 days for two nights", () => {
    expect(defaultStay(new Date(2026, 9, 7))).toEqual({ checkIn: "2026-10-17", checkOut: "2026-10-19" });
  });
  it("validates the stay range", () => {
    expect(dateError("2026-10-17", "2026-10-19", "2026-10-08")).toBeNull();
    expect(dateError("2026-10-07", "2026-10-09", "2026-10-08")).toBe("Ngày nhận phòng từ ngày mai trở đi.");
    expect(dateError("2026-10-17", "2026-10-17", "2026-10-08")).toBe("Ngày trả phòng phải sau ngày nhận phòng.");
    expect(dateError("", "2026-10-17", "2026-10-08")).toBe("Chọn ngày nhận và trả phòng.");
  });
});

describe("givenName", () => {
  it("takes the part after the last space", () => {
    expect(givenName("Nguyễn Minh Anh")).toBe("Anh");
    expect(givenName("Lan")).toBe("Lan");
    expect(givenName(null)).toBe("");
    expect(givenName("  ")).toBe("");
  });
});

describe("stayProgress", () => {
  it("counts the day of the stay and nights left", () => {
    expect(stayProgress("2026-10-16", "2026-10-18", "2026-10-17")).toEqual({ total: 2, passed: 1, left: 1, day: 2 });
    expect(stayProgress("2026-10-16", "2026-10-18", "2026-10-16")).toEqual({ total: 2, passed: 0, left: 2, day: 1 });
    expect(stayProgress("2026-10-16", "2026-10-18", "2026-10-18")).toEqual({ total: 2, passed: 2, left: 0, day: 3 });
  });
  it("clamps days outside the stay", () => {
    expect(stayProgress("2026-10-16", "2026-10-18", "2026-10-10").passed).toBe(0);
    expect(stayProgress("2026-10-16", "2026-10-18", "2026-10-25").left).toBe(0);
  });
});
