import { useEffect, useState } from "react";
import { getRooms, type Room } from "./api";

let cache: Promise<Room[]> | null = null;   // trang chủ và thẻ phiếu trong chat dùng chung 1 lần gọi

export function useRooms() {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    cache ??= getRooms();
    cache.then(r => alive && setRooms(r)).catch(() => { cache = null; if (alive) setError(true); });
    return () => { alive = false; };
  }, []);
  return { rooms, error };
}
