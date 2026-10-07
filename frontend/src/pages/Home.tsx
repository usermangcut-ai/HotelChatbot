import { useState } from "react";
import ui from "../components/ui.module.css";
import { AMENITIES, EMAIL, FACTS, HOTLINE } from "../content";
import ChatInvite from "../features/chat/ChatInvite";
import { useChat } from "../features/chat/ChatProvider";
import { formatVnd } from "../lib/format";
import { useRooms } from "../lib/useRooms";
import s from "./Home.module.css";

type Filter = "all" | "sea" | "villa";
const FILTERS: { key: Filter; label: string }[] = [{ key: "all", label: "Tất cả" }, { key: "sea", label: "Hướng biển" }, { key: "villa", label: "Villa" }];

export default function Home() {
  const { open } = useChat();
  const { rooms, error } = useRooms();
  const [filter, setFilter] = useState<Filter>("all");
  const shown = (rooms ?? []).filter(r =>
    filter === "all" || (filter === "sea" ? r.view.toLowerCase().includes("biển") : r.room_type.startsWith("Villa")));

  return (
    <main>
      <section className={s.hero}>
        <div className="wrap">
          <div className={s["hero-frame"]}>
            <img src="/images/hotel.jpg" alt="Toàn cảnh Shanghai Resort nhìn ra biển" />
            <div className={s["hero-copy"]}>
              <div className={s.eyebrow}>Khu nghỉ dưỡng 5 sao · Ven biển</div>
              <h1>533 phòng hướng về một bãi biển riêng</h1>
              <p className={s.lead}>Nhận phòng từ 15:00, buffet sáng 06:00 – 10:30, lễ tân trực 24/24. Cần gì, nhắn cho chúng tôi.</p>
              <div className={s["hero-actions"]}>
                <button type="button" className={`${ui.btn} ${ui["btn-primary"]} ${s["hero-primary"]}`} data-open-chat onClick={() => open()}>Trò chuyện với lễ tân</button>
                <a className={`${ui.btn} ${ui["btn-text"]} ${s["hero-text"]}`} href="#phong">Xem hạng phòng <span>→</span></a>
              </div>
            </div>
            <ChatInvite />
          </div>
        </div>
      </section>

      <div className="wrap">
        <dl className={s.facts}>
          {FACTS.map(f => <div key={f.label} className={s.fact}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
        </dl>
      </div>

      <section className={s.block} id="phong">
        <div className="wrap">
          <div className={s["sec-head"]}>
            <div>
              <div className={s.eyebrow} style={{ color: "var(--muted)" }}>{rooms ? `${rooms.length} hạng phòng` : "Hạng phòng"}</div>
              <h2>Từ phòng đôi ấm cúng đến villa có hồ bơi riêng</h2>
            </div>
            <p>Giá theo đêm, đã gồm buffet sáng. Muốn biết còn phòng cho ngày cụ thể, hỏi lễ tân trong khung chat — em kiểm tra ngay.</p>
          </div>
          <div className={s.filters} role="group" aria-label="Lọc theo hướng nhìn">
            {FILTERS.map(f => <button key={f.key} type="button" className={ui.chip} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>)}
          </div>
          {error && <p style={{ color: "var(--muted)" }}>Chưa tải được danh sách phòng. Tải lại trang hoặc hỏi lễ tân trong khung chat.</p>}
          <div className={s.rooms}>
            {rooms === null && !error && Array.from({ length: 8 }, (_, i) => (
              <article key={i} className={s.room} aria-hidden="true"><div className={`${s["room-img"]} ${s.loading}`} /></article>
            ))}
            {shown.map(r => (
              <article key={r.room_type} className={s.room}>
                <div className={s["room-img"]}>{r.image_url && <img src={r.image_url} alt={`Phòng ${r.room_type}`} loading="lazy" />}</div>
                <div className={s["room-meta"]}>{r.view} · {r.bed_type}</div>
                <h3>{r.room_type}</h3>
                <div className={s["room-spec"]}>{r.size_m2} m² · tối đa {r.max_occupancy} khách</div>
                <div className={s["room-foot"]}>
                  <span className={s.price}>{formatVnd(r.price_vnd)} <small>/ đêm</small></span>
                  <button type="button" data-open-chat onClick={() => open(`Hạng ${r.room_type} còn phòng trống không?`)}>Hỏi phòng trống</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={s.block} id="tien-ich">
        <div className="wrap">
          <div className={s["sec-head"]}>
            <div>
              <div className={s.eyebrow} style={{ color: "var(--muted)" }}>Tiện ích</div>
              <h2>Mọi thứ cho một ngày không cần rời resort</h2>
            </div>
            <p>Tiện ích chung mở cho khách ở mọi hạng phòng. Khách đang lưu trú đặt bàn nhà hàng hoặc spa ngay trong trang tài khoản.</p>
          </div>
          <div className={s.amen}>
            {AMENITIES.map(a => (
              <article key={a.no} className={s["amen-item"]}>
                <span className={s["amen-no"]}>{a.no}</span>
                <div><h3>{a.title}</h3><p>{a.text}</p><span className={s.hours}>{a.hours}</span></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={s.block} id="lien-he">
        <div className={`wrap ${s.split}`}>
          <div className={s.panel}>
            <h3>Liên hệ lễ tân</h3>
            <ul>
              <li><span>Hotline 24/24</span><span className={s.copyable}>{HOTLINE}</span></li>
              <li><span>Email</span><span className={s.copyable}>{EMAIL}</span></li>
              <li><span>Vị trí</span><span>Ven biển, trung tâm thành phố</span></li>
            </ul>
          </div>
          <div className={s.panel}>
            <h3>Hủy và đổi đặt phòng</h3>
            <ul>
              <li><span>Hủy trước 3 ngày</span><span>Hoàn 100% tiền cọc</span></li>
              <li><span>Hủy trong 3 ngày</span><span>Mất tiền cọc (kể cả không đến)</span></li>
              <li><span>Cách thực hiện</span><span>Gọi hotline hoặc gửi email lễ tân</span></li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
