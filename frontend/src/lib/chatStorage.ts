import type { Attachment } from "./toolResults";

export type ChatMessage = { id: string; role: "user" | "bot"; text: string; attachments?: Attachment[]; error?: boolean };
export type ChatState = { sessionId: string; messages: ChatMessage[] };

const KEY = "sr-chat-v1";
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;   // khớp kiểm tra của backend (api/schemas.py)

const fresh = (): ChatState => ({ sessionId: crypto.randomUUID(), messages: [] });

/** sessionStorage: sống qua F5, tự xóa khi đóng tab — đúng thiết kế phần C. */
export function loadChat(): ChatState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (typeof s?.sessionId === "string" && SESSION_RE.test(s.sessionId) && Array.isArray(s.messages)) return s;
    }
  } catch { /* storage bị chặn hoặc hỏng — bắt đầu phiên mới */ }
  return fresh();
}

export function saveChat(state: ChatState): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* hết chỗ/bị chặn — chat vẫn chạy trong RAM */ }
}

export function clearChat(): ChatState {
  const next = fresh();
  saveChat(next);
  return next;
}
