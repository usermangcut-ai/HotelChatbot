import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { postChat } from "../../lib/api";
import { clearChat, loadChat, saveChat, type ChatMessage, type ChatState } from "../../lib/chatStorage";
import { extractAttachments, type BookingDraft } from "../../lib/toolResults";

type ChatCtx = {
  isOpen: boolean;
  open: (ask?: string) => void;
  close: () => void;
  messages: ChatMessage[];
  pending: boolean;
  send: (text: string) => void;
  reset: () => void;
  /** Thêm một phiếu đặt phòng mới vào cuối luồng (tin bot không chữ, chỉ có phiếu) — không gọi API chat. */
  addBookingDraft: (draft: BookingDraft) => void;
  /** Thêm một dòng chữ của bot chỉ ở frontend (vd "Đã giữ phòng …") — không gọi API chat. */
  addBotMessage: (text: string) => void;
};

const Ctx = createContext<ChatCtx | null>(null);
const id = () => crypto.randomUUID();
const NETWORK_ERROR = "Em chưa kết nối được tới lễ tân. Anh/chị thử gửi lại giúp em nhé.";

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>(loadChat);
  const [isOpen, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => saveChat(state), [state]);
  // html[data-chat="open"] để CSS co trang (≥1200px) và ẩn thẻ mời khi chat đang mở
  useEffect(() => {
    if (isOpen) document.documentElement.dataset.chat = "open";
    else delete document.documentElement.dataset.chat;
  }, [isOpen]);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    setState(s => ({ ...s, messages: [...s.messages, { id: id(), role: "user", text }] }));
    setPending(true);
    postChat(state.sessionId, text)
      .then(res => setState(s => ({ ...s, messages: [...s.messages,
        { id: id(), role: "bot", text: res.reply, attachments: extractAttachments(res.tool_results, res.tool_calls) }] })))
      .catch(() => setState(s => ({ ...s, messages: [...s.messages, { id: id(), role: "bot", text: NETWORK_ERROR, error: true }] })))
      .finally(() => setPending(false));
  }, [pending, state.sessionId]);

  const open = useCallback((ask?: string) => { setOpen(true); if (ask) send(ask); }, [send]);
  const close = useCallback(() => setOpen(false), []);
  const reset = useCallback(() => setState(clearChat()), []);
  const addBookingDraft = useCallback((draft: BookingDraft) =>
    setState(s => ({ ...s, messages: [...s.messages, { id: id(), role: "bot", text: "", attachments: [draft] }] })), []);
  const addBotMessage = useCallback((text: string) =>
    setState(s => ({ ...s, messages: [...s.messages, { id: id(), role: "bot", text }] })), []);

  return <Ctx.Provider value={{ isOpen, open, close, messages: state.messages, pending, send, reset, addBookingDraft, addBotMessage }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react/only-export-components -- hook đi kèm provider
export function useChat(): ChatCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChat phải nằm trong <ChatProvider>");
  return c;
}
