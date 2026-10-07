import { describe, expect, it } from "vitest";
import { DEPOSIT_PER_NIGHT, bookingTotals, homeForRole, parseBookingQuery, validateContact } from "./booking";

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
