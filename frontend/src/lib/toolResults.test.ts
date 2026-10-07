import { describe, expect, it } from "vitest";
import { bookingHref, extractAttachments } from "./toolResults";

const photo = (s: string) => JSON.stringify({ action: "show_photos", subject: s, image_path: `/images/${s}.jpg` });
const form = JSON.stringify({ action: "open_booking_form", room_type: "Deluxe Queen", check_in: "2026-10-16", check_out: "2026-10-18", num_guests: 2 });

describe("extractAttachments", () => {
  it("shows a photo only when exactly one photo was returned", () => {
    expect(extractAttachments([photo("a")])).toEqual([{ kind: "photo", subject: "a", imageUrl: "/images/a.jpg" }]);
    expect(extractAttachments([photo("a"), photo("b")])).toEqual([]);
  });
  it("reads a booking form payload", () => {
    expect(extractAttachments([form])).toEqual([
      { kind: "booking", roomType: "Deluxe Queen", checkIn: "2026-10-16", checkOut: "2026-10-18", numGuests: 2 },
    ]);
  });
  it("ignores plain text, availability counts and tool error strings", () => {
    expect(extractAttachments(["# Deluxe Queen\nmô tả", '{"Deluxe Queen": 3}', "Ngày 2026-01-01 phải sau ngày hiện tại."])).toEqual([]);
  });
  it("keeps photo before booking card", () => {
    expect(extractAttachments([form, photo("a")]).map(a => a.kind)).toEqual(["photo", "booking"]);
  });
});

describe("bookingHref", () => {
  it("builds the booking page URL with only known fields", () => {
    expect(bookingHref({ kind: "booking", roomType: "Deluxe Queen", checkIn: "2026-10-16", checkOut: null, numGuests: 2 }))
      .toBe("/dat-phong?room_type=Deluxe+Queen&check_in=2026-10-16&num_guests=2");
  });
});
