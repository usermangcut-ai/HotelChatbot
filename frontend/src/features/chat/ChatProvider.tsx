import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { postChat } from "../../lib/api";
import { clearChat, loadChat, saveChat, type ChatMessage, type ChatState } from "../../lib/chatStorage";
import { extractAttachments } from "../../lib/toolResults";

type ChatCtx = {
  isOpen: boolean;
  open: (ask?: string) => void;
  close: () => void;
  messages: ChatMessage[];
  pending: boolean;
  send: (text: string) => void;
  reset: () => void;
};

const Ctx = createContext<ChatCtx | null>(null);
const id = () => crypto.randomUUID();
const NETWORK_ERROR = "Em chưa kết nối được tới lễ tân. Anh/chị thử gửi lại giúp em nhé.";

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ChatState>(loadChat);
  const [isOpen, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => saveChat(state), [state]);

  const send = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || pending) return;
    setState(s => ({ ...s, messages: [...s.messages, { id: id(), role: "user", text }] }));
    setPending(true);
    postChat(state.sessionId, text)
      .then(res => setState(s => ({ ...s, messages: [...s.messages,
        { id: id(), role: "bot", text: res.reply, attachments: extractAttachments(res.tool_results) }] })))
      .catch(() => setState(s => ({ ...s, messages: [...s.messages, { id: id(), role: "bot", text: NETWORK_ERROR, error: true }] })))
      .finally(() => setPending(false));
  }, [pending, state.sessionId]);

  const open = useCallback((ask?: string) => { setOpen(true); if (ask) send(ask); }, [send]);
  const close = useCallback(() => setOpen(false), []);
  const reset = useCallback(() => setState(clearChat()), []);

  return <Ctx.Provider value={{ isOpen, open, close, messages: state.messages, pending, send, reset }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react/only-export-components -- hook đi kèm provider
export function useChat(): ChatCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChat phải nằm trong <ChatProvider>");
  return c;
}
