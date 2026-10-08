import { useCallback, useEffect, useRef, useState } from "react";

/** Thông báo nổi tự tắt sau 2,6 giây. Dùng với <Toast text={text} />. */
export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((t: string) => {
    setText(t); clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { text, show };
}
