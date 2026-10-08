import s from "./Toast.module.css";

export default function Toast({ text }: { text: string | null }) {
  return <div className={`${s.toast} ${text ? s.show : ""}`} role="status">{text}</div>;
}
