import ui from "../../components/ui.module.css";
import { QUICK_ASKS } from "../../content";
import { useChat } from "./ChatProvider";
import s from "./chat.module.css";

const CHIPS = ["Còn phòng trống?", "Xem hạng phòng", "Đặt phòng", "Chính sách hủy"];

export default function ChatInvite() {
  const { open } = useChat();
  return (
    <aside className={s.invite} aria-label="Lời mời trò chuyện">
      <div className={s["invite-head"]}>
        <span className={s.avatar}>S</span>
        <div><strong>Lễ tân Shanghai Resort</strong><small>Trợ lý trực tuyến · trả lời ngay</small></div>
      </div>
      <p>Chào anh/chị, em có thể giúp gì cho kỳ nghỉ sắp tới?</p>
      <div className={s.chips}>
        {CHIPS.map(c => <button key={c} type="button" className={ui.chip} data-open-chat onClick={() => open(QUICK_ASKS[c])}>{c}</button>)}
      </div>
    </aside>
  );
}
