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
