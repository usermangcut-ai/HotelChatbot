import { useState } from "react";
import type { RequestStatus } from "../lib/api";
import { formatWhen } from "../lib/format";
import type { QueueRow } from "../lib/ops";
import { ICONS } from "./opsIcons";
import ops from "./ops.module.css";
import s from "./QueuePanel.module.css";

export type QueueView = "all" | "service" | "support";
type StatusFilter = RequestStatus | "all";

const KIND_LABEL: Record<QueueRow["kind"], string> = { restaurant: "Nhà hàng", spa: "Spa", support: "Hỗ trợ" };
const STATUS_LABEL: Record<RequestStatus, string> = { received: "Đang chờ", done: "Hoàn thành", cancelled: "Đã hủy" };
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "received", label: "Đang chờ" }, { key: "done", label: "Hoàn thành" }, { key: "all", label: "Tất cả" },
];

type Props = {
  rows: QueueRow[] | null;
  view: QueueView;
  today: string;
  fresh: Set<string>;
  onAct: (row: QueueRow, status: RequestStatus) => void;
  onDelete?: (row: QueueRow) => void;   // chỉ admin; yêu cầu hỗ trợ phòng không có API xóa
};

export default function QueuePanel({ rows, view, today, fresh, onAct, onDelete }: Props) {
  const [status, setStatus] = useState<StatusFilter>("received");
  const [q, setQ] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const needle = q.trim().toLowerCase();
  const list = (rows ?? []).filter(r =>
    (view === "all" || (view === "service") === (r.kind !== "support"))
    && (status === "all" || r.status === status)
    && (!needle || `${r.room ?? ""} ${r.guest ?? ""}`.toLowerCase().includes(needle)));

  return (
    <>
      <div className={ops.toolbar}>
        <div className={ops.seg} role="group" aria-label="Lọc trạng thái">
          {FILTERS.map(f => <button key={f.key} type="button" aria-pressed={status === f.key} onClick={() => setStatus(f.key)}>{f.label}</button>)}
        </div>
        <label htmlFor="queue-q" hidden>Tìm theo phòng hoặc tên khách</label>
        <input className={s.search} id="queue-q" placeholder="Tìm phòng, tên khách…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      <div className={s["table-wrap"]}>
        <table className={s.table}>
          <thead><tr><th>Loại</th><th>Yêu cầu</th><th>Phòng / khách</th><th>Hẹn lúc</th><th>Gửi lúc</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {list.length === 0 && (
              <tr className={s.empty}><td colSpan={7}>
                {rows === null ? "Đang tải…" : `Không có yêu cầu nào ${status === "received" ? "đang chờ — hàng đợi đã sạch" : "khớp bộ lọc"}.`}
              </td></tr>
            )}
            {list.map(r => (
              <tr key={r.key} className={fresh.has(r.key) && r.status === "received" ? s.fresh : ""}>
                <td className={s["c-type"]}><span className={s.type}><i>{ICONS[r.kind]}</i>{KIND_LABEL[r.kind]}</span></td>
                <td className={s["c-req"]}><span className={s.t}>{r.title}</span><span className={s.n}>{r.note || "—"}</span></td>
                <td className={s["c-who"]}>
                  <span className={s.num}>{r.room ? `Phòng ${r.room}` : "Chưa rõ phòng"}</span>
                  <span className={s.n}>{r.guest ? `${r.guest}${r.phone ? ` · ${r.phone}` : ""}` : "Khách đang lưu trú"}</span>
                </td>
                <td className={`${s["c-when"]} ${s.num}`}>{r.when ? formatWhen(r.when, today) : "Càng sớm càng tốt"}</td>
                <td className={`${s["c-sent"]} ${s.num}`}>{formatWhen(r.created_at, today)}</td>
                <td className={s["c-status"]}><span className={`${s.pill} ${s[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                <td className={s["c-act"]}>
                  <div className={s["row-actions"]}>
                    {confirmKey === r.key ? (
                      <>
                        <span className={s.confirm}>Xóa hẳn yêu cầu này?</span>
                        <button type="button" className={s["danger-solid"]} onClick={() => { setConfirmKey(null); onDelete?.(r); }}>Xóa</button>
                        <button type="button" onClick={() => setConfirmKey(null)}>Thôi</button>
                      </>
                    ) : (
                      <>
                        {r.status === "received" ? (
                          <>
                            <button type="button" className={s["done-btn"]} onClick={() => onAct(r, "done")}>Hoàn thành</button>
                            <button type="button" onClick={() => onAct(r, "cancelled")}>Hủy</button>
                          </>
                        ) : (
                          <button type="button" className={s.undo} onClick={() => onAct(r, "received")}>Mở lại</button>
                        )}
                        {onDelete && r.kind !== "support" && <button type="button" className={s.danger} onClick={() => setConfirmKey(r.key)}>Xóa</button>}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
