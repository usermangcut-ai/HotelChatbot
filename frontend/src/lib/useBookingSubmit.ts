import { useState } from "react";
import { ApiError, createBooking, type BookingRequest, type BookingResponse } from "./api";

export type SubmitState =
  | { status: "idle" } | { status: "submitting" }
  | { status: "done"; result: BookingResponse }
  | { status: "error"; message: string; soldOut: boolean };

export function useBookingSubmit() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const submit = async (body: BookingRequest) => {
    setState({ status: "submitting" });
    try {
      setState({ status: "done", result: await createBooking(body) });
    } catch (e) {
      const soldOut = e instanceof ApiError && e.status === 409;
      const message = soldOut ? "Vừa có khách đặt mất phòng cuối cùng cho khoảng ngày này. Chọn ngày hoặc hạng phòng khác giúp em."
        : e instanceof ApiError ? e.message : "Em chưa kết nối được tới hệ thống. Anh/chị thử lại giúp em.";
      setState({ status: "error", message, soldOut });
    }
  };
  return { state, submit, reset: () => setState({ status: "idle" }) };
}
