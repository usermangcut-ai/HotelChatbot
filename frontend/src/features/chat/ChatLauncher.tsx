import { useEffect, useState } from "react";
import { useChat } from "./ChatProvider";
import s from "./chat.module.css";

export default function ChatLauncher() {
  const { open, isOpen } = useChat();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button type="button" className={`${s.launcher} ${show && !isOpen ? s.show : ""}`} data-open-chat onClick={() => open()}>
      <span className={s.dot} />Hỏi lễ tân
    </button>
  );
}
