import { useEffect, useState } from "react";
import { useChat } from "./ChatProvider";
import s from "./ChatFab.module.css";

const SEEN_KEY = "vsf-greet-seen";

// Bóng chào chỉ hiện 1 lần mỗi phiên trình duyệt (nhớ bằng sessionStorage; lỗi lưu trữ thì vẫn hiện).
function takeGreetOnce(): boolean {
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch { /* trình duyệt chặn lưu trữ */ }
  return true;
}

export default function ChatFab() {
  const { open } = useChat();
  const [showGreet, setShowGreet] = useState(takeGreetOnce);
  useEffect(() => {
    if (!showGreet) return;
    const t = setTimeout(() => setShowGreet(false), 6000);
    return () => clearTimeout(t);
  }, [showGreet]);

  return (
    <div className={s["fab-wrap"]}>
      <div className={`${s.greet} ${showGreet ? "" : s.hide}`} aria-hidden={!showGreet}>
        <button type="button" aria-label="Ẩn lời chào" tabIndex={showGreet ? 0 : -1} onClick={() => setShowGreet(false)}>×</button>
        <b>Xin chào!</b> Em là lễ tân AI — hỏi em về phòng trống hay đặt phòng nhé.
      </div>
      <button type="button" className={s.fab} data-open-chat aria-label="Trò chuyện với lễ tân AI" onClick={() => { setShowGreet(false); open(); }}>
        <svg className={s.robot} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4v4" /><circle cx="16" cy="3.5" r="1.3" fill="currentColor" stroke="none" /><rect x="6" y="8" width="20" height="16" rx="6" /><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" /><circle cx="20" cy="15" r="1.6" fill="currentColor" stroke="none" /><path d="M12.5 19.5c2 1.3 5 1.3 7 0" /><path d="M3 15v4M29 15v4" /></svg>
        <span className={s.ai}>AI</span>
      </button>
    </div>
  );
}
