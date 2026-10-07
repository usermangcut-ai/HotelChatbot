export type PhotoAttachment = { kind: "photo"; subject: string; imageUrl: string };
export type BookingDraft = {
  kind: "booking";
  roomType: string | null;
  checkIn: string | null;
  checkOut: string | null;
  numGuests: number | null;
};
export type AvailabilityCard = {
  kind: "availability";
  checkIn: string | null;   // null = bot kiểm tra cho hôm nay (không truyền ngày)
  checkOut: string | null;
  rooms: { roomType: string; available: number }[];
};
export type Attachment = PhotoAttachment | AvailabilityCard | BookingDraft;
export type ToolCall = { name: string; args: Record<string, unknown> };

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Đọc tool_results của /api/chat. Chỉ tin payload có `action` (tool trả chuỗi lỗi → bỏ qua).
 *  Ảnh: chỉ hiện khi bot gửi đúng MỘT ảnh — nhiều ảnh cùng lúc dễ gây hiểu nhầm (giữ luật cũ). */
export function extractAttachments(toolResults: string[], toolCalls: ToolCall[] = []): Attachment[] {
  const photos: PhotoAttachment[] = [];
  let availability: AvailabilityCard | null = null;
  let booking: BookingDraft | null = null;
  toolResults.forEach((raw, i) => {
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return; }
    if (!parsed || typeof parsed !== "object") return;
    const o = parsed as Record<string, unknown>;
    if (o.action === "show_photos" && typeof o.image_path === "string") {
      photos.push({ kind: "photo", subject: String(o.subject ?? ""), imageUrl: o.image_path });
    } else if (o.action === "open_booking_form") {
      booking = {
        kind: "booking", roomType: str(o.room_type), checkIn: str(o.check_in), checkOut: str(o.check_out),
        numGuests: typeof o.num_guests === "number" ? o.num_guests : null,
      };
    } else if (toolCalls[i]?.name === "availability_tool" && Object.values(o).every(v => typeof v === "number")) {
      // availability_tool trả {hạng phòng: số phòng trống}; ngày lấy từ tham số bot đã truyền
      const args = toolCalls[i].args;
      availability = {
        kind: "availability", checkIn: str(args.check_in), checkOut: str(args.check_out),
        rooms: Object.entries(o).map(([roomType, n]) => ({ roomType, available: n as number })),
      };
    }
  });
  const out: Attachment[] = [];
  if (photos.length === 1) out.push(photos[0]);
  if (availability) out.push(availability);
  if (booking) out.push(booking);
  return out;
}

export function bookingHref(d: BookingDraft): string {
  const p = new URLSearchParams();
  if (d.roomType) p.set("room_type", d.roomType);
  if (d.checkIn) p.set("check_in", d.checkIn);
  if (d.checkOut) p.set("check_out", d.checkOut);
  if (d.numGuests) p.set("num_guests", String(d.numGuests));
  const q = p.toString();
  return q ? `/dat-phong?${q}` : "/dat-phong";
}
