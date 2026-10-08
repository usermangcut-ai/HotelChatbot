import { describe, expect, it } from "vitest";
import { checkinsWithin, mergeQueue, nightsByRoomType, occupancyOn, roomRevenueForMonth } from "./ops";

const B = (id: number, room_type: string, check_in: string, check_out: string, status: "paid" | "completed" | "cancelled") =>
  ({ id, room_type, check_in, check_out, status, guest_name: "", guest_phone: "", guest_email: "", num_guests: 2, created_at: "", room_id: "201" });
const bookings = [
  B(1, "Deluxe Queen", "2026-10-06", "2026-10-09", "paid"),
  B(2, "Deluxe Queen", "2026-10-07", "2026-10-08", "cancelled"),
  B(3, "Villa 3 Bedroom Beachfront", "2026-10-10", "2026-10-12", "paid"),
  B(4, "Deluxe Twin", "2026-09-28", "2026-10-02", "completed"),
];

describe("ops stats", () => {
  it("counts paid bookings occupying a night", () => {
    expect(occupancyOn("2026-10-07", bookings)).toBe(1);   // #2 bị hủy không tính
    expect(occupancyOn("2026-10-09", bookings)).toBe(0);   // ngày trả phòng không tính đêm
  });
  it("sums room revenue for bookings checking in that month (paid + completed)", () => {
    const price = { "Deluxe Queen": 3150000, "Villa 3 Bedroom Beachfront": 18000000, "Deluxe Twin": 3150000 };
    expect(roomRevenueForMonth("2026-10", bookings, price)).toBe(3 * 3150000 + 2 * 18000000);
  });
  it("counts paid check-ins after today within N days", () => {
    expect(checkinsWithin("2026-10-07", 7, bookings)).toBe(1);
  });
  it("ranks room types by nights booked (not cancelled)", () => {
    expect(nightsByRoomType(bookings)).toEqual([["Deluxe Twin", 4], ["Deluxe Queen", 3], ["Villa 3 Bedroom Beachfront", 2]]);
  });
});

describe("mergeQueue", () => {
  it("merges service and support requests newest first with a common shape", () => {
    const rows = mergeQueue(
      [{ id: 5, service_type: "spa", guest_name: "A", guest_phone: "090", requested_at: "2026-10-07 16:30", party_size: 2, note: "", status: "received", created_at: "2026-10-07T14:50:00", room_id: "504", reservation_id: 1 }],
      [{ id: 9, room_id: "402", request_type: "Thêm khăn / đồ dùng", note: "2 khăn", status: "done", created_at: "2026-10-07T15:10:00" }],
    );
    expect(rows.map(r => [r.key, r.kind, r.room])).toEqual([["support-9", "support", "402"], ["service-5", "spa", "504"]]);
  });
});
