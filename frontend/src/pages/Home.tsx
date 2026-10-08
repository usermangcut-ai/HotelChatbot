import type { SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { AMENITIES, EMAIL, HOTLINE, POLICY } from "../content";
import { formatVnd } from "../lib/format";
import { useRooms } from "../lib/useRooms";
import s from "./Home.module.css";
import { imageUrl } from "../lib/assets";

/** Ảnh lỗi thì thử đúng một lần ảnh dự phòng. */
function withFallback(fallback: string) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset.fb) return;
    img.dataset.fb = "1";
    img.src = fallback;
  };
}

export default function Home() {
  const { rooms, error } = useRooms();

  return (
    <main>
      <section className={s.hero} id="hero"><img src={imageUrl("hotel.jpg")} alt="Toàn cảnh Shanghai Resort nhìn ra biển" /></section>

      <section className={`wrap ${s.intro}`}>
        <h1>Shanghai Resort — nghỉ dưỡng bên bờ biển riêng</h1>
        <p className={s.sub}>Khu nghỉ dưỡng 5 sao ven biển · 533 phòng và villa</p>
        <p className={s.body}>Trải dài bên bãi biển riêng 700 mét, Shanghai Resort đón ngày mới bằng buffet sáng bên hồ bơi và khép lại buổi tối ở Seaview Lounge cùng tiếng piano. Từ phòng đôi ấm cúng đến villa ba phòng ngủ có hồ bơi riêng, mỗi không gian đều hướng về biển hoặc khu vườn xanh.</p>
        <p className={s.body}>Lễ tân luôn sẵn sàng 24/24 — kể cả qua tin nhắn. Hỏi phòng trống, xem ảnh phòng hay đặt phòng, chỉ cần chạm vào nút trò chuyện ở góc màn hình.</p>
      </section>

      <div className="wrap">
        <div className={s.feature}>
          <img src={imageUrl("feature.jpg")} alt="Villa sát biển có hồ bơi riêng" onError={withFallback(imageUrl("room_villa_3_bedroom_beachfront.jpg"))} />
        </div>
      </div>

      <section className={s.block} id="phong">
        <div className="wrap">
          <div className={s["sec-head"]}><h2>Hạng phòng</h2><p>Giá theo đêm, đã gồm buffet sáng.</p></div>
          <div className={s.rooms}>
            {error && <p className={s.err}>Chưa tải được danh sách phòng. Tải lại trang hoặc hỏi lễ tân trong khung chat.</p>}
            {rooms === null && !error && Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={s.room} aria-hidden="true"><div className={`${s["room-img"]} ${s.loading}`} /></div>
            ))}
            {(rooms ?? []).map(r => (
              <Link key={r.room_type} className={s.room} to={`/dat-phong?room_type=${encodeURIComponent(r.room_type)}`}>
                <div className={s["room-img"]}>{r.image_url && <img src={r.image_url} alt={`Phòng ${r.room_type}`} loading="lazy" />}</div>
                <h3>{r.room_type}</h3>
                <div className={s.spec}>{r.size_m2} m² · {r.bed_type} · {r.view}</div>
                <div className={s.price}>từ {formatVnd(r.price_vnd)} / đêm</div>
                <span className={s.more}>Đặt phòng</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={s.block} id="tien-ich">
        <div className="wrap">
          <div className={s["sec-head"]}><h2>Tiện ích</h2><p>Mở cho khách ở mọi hạng phòng.</p></div>
          <div className={s.amen}>
            {AMENITIES.map(a => (
              <article key={a.title} className={s["amen-row"]}>
                <div className={s["amen-img"]}><img src={a.img} alt={a.alt} loading="lazy" onError={withFallback(a.fallback)} /></div>
                <div className={s["amen-text"]}>
                  <span className={s.k}>{a.k}</span>
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                  {a.hours && <div className={s.hours}>{a.hours}</div>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`wrap ${s.contact}`} id="lien-he">
        <h2>Liên hệ</h2>
        <div className={s.lines}><span>{HOTLINE}</span><span>{EMAIL}</span></div>
        <p className={s.policy}>{POLICY}</p>
      </section>
    </main>
  );
}
