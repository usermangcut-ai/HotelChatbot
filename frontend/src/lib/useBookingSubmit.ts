import { useState } from "react";
import { ApiError, createBooking, type BookingRequest, type BookingResponse } from "./api";

export type SubmitState =
  | { status: "idle" } | { status: "submitting" }
  | { status: "done"; result: BookingResponse }
  | { status: "error"; message: string; soldOut: boolean };

/** `initial` — khôi phục trạng thái đã lưu (phiếu trong chat được dựng lại khi đổi trang). */
export function useBookingSubmit(initial: SubmitState = { status: "idle" }) {
  const [state, setState] = useState<SubmitState>(initial);
  /** Trả về booking vừa tạo, hoặc null nếu lỗi (lỗi nằm trong `state`). */
  const submit = async (body: BookingRequest): Promise<BookingResponse | null> => {
    setState({ status: "submitting" });
    try {
      const result = await createBooking(body);
      setState({ status: "done", result });
      return result;
    } catch (e) {
      const soldOut = e instanceof ApiError && e.status === 409;
      const message = soldOut ? "Vừa có khách đặt mất phòng cuối cùng cho khoảng ngày này. Chọn ngày hoặc hạng phòng khác giúp em."
        : e instanceof ApiError ? e.message : "Em chưa kết nối được tới hệ thống. Anh/chị thử lại giúp em.";
      setState({ status: "error", message, soldOut });
      return null;
    }
  };
  return { state, submit, reset: () => setState({ status: "idle" }) };
}
