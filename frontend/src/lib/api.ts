import type { Role } from "./booking";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const FALLBACK = "Có lỗi xảy ra, vui lòng thử lại.";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    let message = FALLBACK;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") message = body.detail;
      else if (Array.isArray(body?.detail) && typeof body.detail[0]?.msg === "string") message = body.detail[0].msg;
    } catch { /* body không phải JSON — giữ thông báo chung */ }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export type Room = {
  room_type: string;
  price_vnd: number;
  size_m2: number;
  max_occupancy: number;
  view: string;
  bed_type: string;
  image_url: string | null;
  total_rooms: number;
};

export type ChatResponse = {
  reply: string;
  tool_calls: { name: string; args: Record<string, unknown> }[];
  tool_results: string[];
};

export const getRooms = () => apiFetch<Room[]>("/api/rooms");

export const postChat = (sessionId: string, message: string) =>
  apiFetch<ChatResponse>("/api/chat", { method: "POST", body: JSON.stringify({ session_id: sessionId, message }) });

export type Me = { identity_type: string; identity_id: string; role: Role; room_id: string | null };
export type BookingRequest = { room_type: string; check_in: string; check_out: string; guest_name: string;
  guest_phone: string; guest_email: string; num_guests: number };
export type BookingResponse = { id: number; room_type: string; check_in: string; check_out: string;
  status: string; room_id: string | null; guest_password: string | null };
export type Stay = { reservation_id: number; room_id: string; room_type: string; check_in: string;
  check_out: string; num_guests: number | null; guest_name: string | null };
export type RequestStatus = "received" | "done" | "cancelled";
export type StaffRequest = { id: number; room_id: string | null; request_type: string; note: string | null; status: RequestStatus; created_at: string };
export type ServiceRequest = { id: number; service_type: "restaurant" | "spa"; guest_name: string | null; guest_phone: string | null;
  requested_at: string | null; party_size: number | null; note: string | null; status: RequestStatus; created_at: string;
  room_id: string | null; reservation_id: number | null };

export const getMe = () => apiFetch<Me>("/api/auth/me");
export const login = (body: { identity_type: "guest"; room_id: string; password: string } | { identity_type: "staff"; username: string; password: string }) =>
  apiFetch<Me>("/api/auth/login", { method: "POST", body: JSON.stringify(body) });
export const logout = () => apiFetch<{ message: string }>("/api/auth/logout", { method: "POST" });
export const getAvailability = (roomType: string, checkIn: string, checkOut: string) =>
  apiFetch<{ available: number }>(`/api/availability?${new URLSearchParams({ room_type: roomType, check_in: checkIn, check_out: checkOut })}`);
export const createBooking = (body: BookingRequest) => apiFetch<BookingResponse>("/api/bookings", { method: "POST", body: JSON.stringify(body) });
export const getStay = () => apiFetch<Stay>("/api/me/stay");
export const getMyRequests = () => apiFetch<StaffRequest[]>("/api/me/requests");
export const getMyServiceRequests = () => apiFetch<ServiceRequest[]>("/api/me/service-requests");
export const createStaffRequest = (request_type: string, note: string) =>
  apiFetch<StaffRequest>("/api/me/requests", { method: "POST", body: JSON.stringify({ request_type, note }) });
export const createServiceRequest = (body: { service_type: "restaurant" | "spa"; requested_at: string; party_size: number; note: string }) =>
  apiFetch<{ id: number }>("/api/service-requests", { method: "POST", body: JSON.stringify(body) });

export type BookingStatus = "paid" | "cancelled" | "completed";
export type Booking = { id: number; room_type: string; check_in: string; check_out: string; guest_name: string | null;
  guest_phone: string | null; guest_email: string | null; num_guests: number | null; status: BookingStatus; created_at: string;
  room_id: string | null };
export type StaffAccount = { username: string; role: "staff" | "admin"; created_at: string };

const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const getStaffServiceRequests = () => apiFetch<ServiceRequest[]>("/api/staff/service-requests");
export const getStaffRequests = () => apiFetch<StaffRequest[]>("/api/staff/requests");
export const setServiceRequestStatus = (id: number, status: RequestStatus, scope: "staff" | "admin") =>
  apiFetch<unknown>(`/api/${scope}/service-requests/${id}`, json("PATCH", { status }));
export const setStaffRequestStatus = (id: number, status: RequestStatus) =>
  apiFetch<unknown>(`/api/staff/requests/${id}`, json("PATCH", { status }));
export const getAdminBookings = () => apiFetch<Booking[]>("/api/admin/bookings");
export const setBookingStatus = (id: number, status: BookingStatus) =>
  apiFetch<unknown>(`/api/admin/bookings/${id}`, json("PATCH", { status }));
export const deleteBooking = (id: number) => apiFetch<unknown>(`/api/admin/bookings/${id}`, json("DELETE"));
export const deleteServiceRequest = (id: number) => apiFetch<unknown>(`/api/admin/service-requests/${id}`, json("DELETE"));
export const getStaffAccounts = () => apiFetch<StaffAccount[]>("/api/admin/staff-accounts");
export const createStaffAccount = (username: string, password: string, role: "staff" | "admin") =>
  apiFetch<StaffAccount>("/api/admin/staff-accounts", json("POST", { username, password, role }));
export const deleteStaffAccount = (username: string) =>
  apiFetch<unknown>(`/api/admin/staff-accounts/${encodeURIComponent(username)}`, json("DELETE"));
export const changePassword = (oldPassword: string, newPassword: string) =>
  apiFetch<unknown>("/api/auth/change-password", json("POST", { old_password: oldPassword, new_password: newPassword }));
