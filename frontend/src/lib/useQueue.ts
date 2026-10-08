import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, deleteServiceRequest, getStaffRequests, getStaffServiceRequests, setServiceRequestStatus,
  setStaffRequestStatus, type RequestStatus } from "./api";
import { useAuth } from "./auth";
import { mergeQueue, type QueueRow } from "./ops";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Chưa kết nối được tới hệ thống. Thử lại giúp em.");

/** Hàng đợi yêu cầu (nhà hàng/spa + hỗ trợ phòng): tự làm mới 30 giây, đổi trạng thái lạc quan. */
export function useQueue(scope: "staff" | "admin") {
  const { refresh } = useAuth();
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const [service, support] = await Promise.all([getStaffServiceRequests(), getStaffRequests()]);
      const merged = mergeQueue(service, support);
      const before = seen.current;
      if (before) {
        const added = merged.filter(r => !before.has(r.key)).map(r => r.key);
        if (added.length) setFresh(f => new Set([...f, ...added]));
      }
      seen.current = new Set(merged.map(r => r.key));
      setRows(merged); setUpdatedAt(new Date()); setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { refresh(); return; }
      setError(msg(e));
    }
  }, [refresh]);

  useEffect(() => {
    void load();
    const t = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const patch = (key: string, status: RequestStatus) =>
    setRows(rs => rs && rs.map(r => (r.key === key ? { ...r, status } : r)));

  /** Trả về thông báo lỗi (đã hoàn tác) hoặc null nếu thành công. */
  const act = useCallback(async (row: QueueRow, status: RequestStatus): Promise<string | null> => {
    const previous = row.status;
    patch(row.key, status);
    try {
      if (row.kind === "support") await setStaffRequestStatus(row.id, status);
      else await setServiceRequestStatus(row.id, status, scope);
      return null;
    } catch (e) {
      patch(row.key, previous);
      return msg(e);
    }
  }, [scope]);

  const remove = useCallback(async (row: QueueRow): Promise<string | null> => {
    try {
      await deleteServiceRequest(row.id);
      setRows(rs => rs && rs.filter(r => r.key !== row.key));
      return null;
    } catch (e) { return msg(e); }
  }, []);

  return { rows, fresh, updatedAt, error, reload: load, act, remove };
}
