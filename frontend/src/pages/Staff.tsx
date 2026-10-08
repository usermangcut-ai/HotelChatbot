import { useState } from "react";
import ops from "../components/ops.module.css";
import { ICONS } from "../components/opsIcons";
import OpsLayout from "../components/OpsLayout";
import QueuePanel, { type QueueView } from "../components/QueuePanel";
import Toast from "../components/Toast";
import { useAuth } from "../lib/auth";
import type { RequestStatus } from "../lib/api";
import { formatDate, toIsoDate } from "../lib/format";
import type { QueueRow } from "../lib/ops";
import { weekdayVi } from "../lib/ops";
import { useQueue } from "../lib/useQueue";
import { useToast } from "../lib/useToast";
import s from "./Staff.module.css";

const TITLES: Record<QueueView, string> = { all: "Hàng đợi yêu cầu", service: "Nhà hàng & Spa", support: "Hỗ trợ phòng" };
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default function Staff() {
  const { me } = useAuth();
  const q = useQueue(me?.role === "admin" ? "admin" : "staff");
  const toast = useToast();
  const [today] = useState(() => toIsoDate(new Date()));
  const [view, setView] = useState<QueueView>("all");

  const rows = q.rows ?? [];
  const pending = rows.filter(r => r.status === "received");
  const pendingService = pending.filter(r => r.kind !== "support").length;
  const pendingSupport = pending.length - pendingService;
  const todayService = rows.filter(r => r.kind !== "support" && r.when?.startsWith(today)).length;
  const doneToday = rows.filter(r => r.status === "done" && r.created_at.startsWith(today)).length;

  const act = async (row: QueueRow, status: RequestStatus) => {
    const err = await q.act(row, status);
    if (err) toast.show(err);
  };

  const nav = [
    { key: "all", label: "Hàng đợi", icon: ICONS.queue, count: pending.length },
    { key: "service", label: "Nhà hàng & Spa", icon: ICONS.restaurant, count: pendingService },
    { key: "support", label: "Hỗ trợ phòng", icon: ICONS.support, count: pendingSupport },
  ];

  return (
    <OpsLayout subtitle="Bảng điều phối nhân viên" nav={nav} active={view} onSelect={k => setView(k as QueueView)} mobile="bar">
      <div className={ops.head}>
        <div><h1>{TITLES[view]}</h1><p>{weekdayVi(today)}, {formatDate(today)}</p></div>
        <div className={s.refresh}>
          <span className={s.live} />
          <span>Tự cập nhật mỗi 30 giây{q.updatedAt ? ` · lúc ${hhmm(q.updatedAt)}` : ""}</span>
          <button type="button" onClick={() => { void q.reload(); }}>Làm mới</button>
        </div>
      </div>

      {q.error && <div className={s["error-line"]} role="alert">{q.error}</div>}

      <div className={ops.tiles}>
        <div className={`${ops.tile} ${ops.attn}`}><small>Đang chờ xử lý</small><b>{pending.length}</b><span>cần người nhận ngay</span></div>
        <div className={ops.tile}><small>Nhà hàng & spa hôm nay</small><b>{todayService}</b><span>theo giờ khách hẹn</span></div>
        <div className={ops.tile}><small>Hỗ trợ phòng đang chờ</small><b>{pendingSupport}</b><span>dọn phòng, đồ dùng, sửa chữa</span></div>
        <div className={ops.tile}><small>Đã hoàn thành hôm nay</small><b>{doneToday}</b><span>tính cả 2 loại</span></div>
      </div>

      <QueuePanel rows={q.rows} view={view} today={today} fresh={q.fresh} onAct={act} />
      <Toast text={toast.text} />
    </OpsLayout>
  );
}
