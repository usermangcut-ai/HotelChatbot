export interface ChatToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ChatResponse {
  reply: string;
  tool_calls: ChatToolCall[];
  tool_results: string[];
}

export async function postChat(sessionId: string, message: string): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });
  if (!res.ok) throw new Error("Không kết nối được với trợ lý.");
  return res.json();
}

export interface RoomOption {
  room_type: string;
  price_vnd: number;
}

export async function fetchRooms(): Promise<RoomOption[]> {
  const res = await fetch("/api/rooms");
  if (!res.ok) throw new Error("Không tải được danh sách hạng phòng.");
  return res.json();
}

export interface BookingPayload {
  room_type: string;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  num_guests: number;
}

export interface BookingResult {
  id: number;
  room_type: string;
  check_in: string;
  check_out: string;
  status: string;
  room_id?: string | null;
  guest_password?: string | null;
}

export async function postBooking(payload: BookingPayload): Promise<BookingResult> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) {
    const err = await res.json();
    throw new Error(err.detail || "Đã hết phòng trong khoảng ngày này.");
  }
  if (!res.ok) throw new Error("Không tạo được đặt phòng.");
  return res.json();
}

export interface ServiceRequestPayload {
  service_type: "restaurant" | "spa";
  requested_at: string;
  party_size: number;
  note?: string;
}

export interface ServiceRequestResult {
  id: number;
  service_type: string;
  status: string;
}

export async function postServiceRequest(
  payload: ServiceRequestPayload
): Promise<ServiceRequestResult> {
  const res = await fetch("/api/service-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Không gửi được yêu cầu dịch vụ.");
  return res.json();
}

// ---------- Auth ----------

export interface Identity {
  identity_type: string;
  identity_id: string;
  role: "admin" | "staff" | "guest";
}

export async function fetchMe(): Promise<Identity | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  return res.json();
}

export async function loginStaff(username: string, password: string): Promise<Identity> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_type: "staff", username, password }),
  });
  if (!res.ok) throw new Error("Sai tên đăng nhập hoặc mật khẩu.");
  return res.json();
}

export async function loginGuest(roomId: string, password: string): Promise<Identity> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_type: "guest", room_id: roomId, password }),
  });
  if (!res.ok) throw new Error("Sai số phòng hoặc mật khẩu.");
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  if (res.status === 401) throw new Error("Mật khẩu hiện tại không đúng.");
  if (!res.ok) throw new Error("Không đổi được mật khẩu.");
}

// ---------- Admin ----------

export interface ReservationRecord {
  id: number;
  room_type: string;
  check_in: string;
  check_out: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  num_guests: number | null;
  status: string;
  created_at: string;
  room_id: string | null;
}

export interface ServiceRequestRecord {
  id: number;
  service_type: string;
  guest_name: string | null;
  guest_phone: string | null;
  requested_at: string | null;
  party_size: number | null;
  note: string | null;
  status: string;
  created_at: string;
}

export interface StaffRequestRecord {
  id: number;
  room_id: string | null;
  request_type: string;
  note: string | null;
  status: string;
  created_at: string;
}

export interface StaffAccountRecord {
  username: string;
  role: "staff" | "admin";
  created_at: string;
}

export async function fetchStaffAccounts(): Promise<StaffAccountRecord[]> {
  const res = await fetch("/api/admin/staff-accounts");
  if (!res.ok) throw new Error("Không tải được danh sách tài khoản.");
  return res.json();
}

export async function createStaffAccount(
  username: string,
  password: string,
  role: "staff" | "admin"
): Promise<StaffAccountRecord> {
  const res = await fetch("/api/admin/staff-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  if (res.status === 409) throw new Error("Tên đăng nhập đã tồn tại.");
  if (!res.ok) throw new Error("Không tạo được tài khoản.");
  return res.json();
}

export async function deleteStaffAccount(username: string): Promise<void> {
  const res = await fetch(`/api/admin/staff-accounts/${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Không xóa được tài khoản.");
}

export async function fetchAdminBookings(): Promise<ReservationRecord[]> {
  const res = await fetch("/api/admin/bookings");
  if (!res.ok) throw new Error("Không tải được danh sách đặt phòng.");
  return res.json();
}

export async function updateAdminBooking(id: number, status: string): Promise<void> {
  const res = await fetch(`/api/admin/bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Không cập nhật được đặt phòng.");
}

export async function deleteAdminBooking(id: number): Promise<void> {
  const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Không xóa được đặt phòng.");
}

export async function fetchAdminServiceRequests(): Promise<ServiceRequestRecord[]> {
  const res = await fetch("/api/admin/service-requests");
  if (!res.ok) throw new Error("Không tải được danh sách yêu cầu dịch vụ.");
  return res.json();
}

export async function updateAdminServiceRequest(id: number, status: string): Promise<void> {
  const res = await fetch(`/api/admin/service-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Không cập nhật được yêu cầu dịch vụ.");
}

export async function deleteAdminServiceRequest(id: number): Promise<void> {
  const res = await fetch(`/api/admin/service-requests/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Không xóa được yêu cầu dịch vụ.");
}

// ---------- Staff ----------

export async function fetchStaffServiceRequests(): Promise<ServiceRequestRecord[]> {
  const res = await fetch("/api/staff/service-requests");
  if (!res.ok) throw new Error("Không tải được hàng đợi dịch vụ.");
  return res.json();
}

export async function markStaffServiceRequest(id: number, status: string): Promise<void> {
  const res = await fetch(`/api/staff/service-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Không cập nhật được yêu cầu.");
}

export async function fetchStaffRequests(): Promise<StaffRequestRecord[]> {
  const res = await fetch("/api/staff/requests");
  if (!res.ok) throw new Error("Không tải được hàng đợi hỗ trợ.");
  return res.json();
}

export async function markStaffRequest(id: number, status: string): Promise<void> {
  const res = await fetch(`/api/staff/requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Không cập nhật được yêu cầu.");
}

// ---------- Guest (đã đăng nhập) ----------

export async function fetchMyRequests(): Promise<StaffRequestRecord[]> {
  const res = await fetch("/api/me/requests");
  if (!res.ok) throw new Error("Không tải được lịch sử yêu cầu.");
  return res.json();
}

export async function postMyRequest(requestType: string, note: string): Promise<StaffRequestRecord> {
  const res = await fetch("/api/me/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request_type: requestType, note }),
  });
  if (!res.ok) throw new Error("Không gửi được yêu cầu.");
  return res.json();
}
