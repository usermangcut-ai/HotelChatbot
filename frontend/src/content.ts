import { imageUrl } from "./lib/assets";
// Chữ tĩnh trang chủ. Số liệu lấy từ data/knowledge.json — đổi ở đó thì sửa cả ở đây.
export const HOTLINE = "+84-999-1234567";
export const EMAIL = "contact@shanghairesort.com";

export const SERVICES = "Đưa đón sân bay (có phụ phí), giữ xe miễn phí, đặt tour và vé, giặt ủi, trông trẻ — cứ gọi hoặc nhắn lễ tân.";

export const POLICY = "Nhận phòng từ 15:00 · trả phòng trước 12:00. Hủy trước 3 ngày so với ngày nhận phòng được hoàn 100% tiền cọc; muốn hủy hoặc đổi ngày, vui lòng gọi lễ tân.";

export const AMENITIES = [
  { k: "Ẩm thực", title: "Nhà hàng & quầy bar", text: "Bốn nhà hàng cho mọi bữa trong ngày — Orchid, Beachcomber, Lotus và nhà hàng buffet, với món Việt, món Á và món quốc tế. Ba quầy bar — bên hồ bơi, ngoài bãi biển và Seaview Lounge với tiếng piano chơi trực tiếp — dành cho những buổi tối thong thả.", hours: "Room service 24/24", img: imageUrl("dining.jpg"), fallback: imageUrl("hotel.jpg"), alt: "Nhà hàng bên biển" },
  { k: "Thư giãn", title: "Spa & sức khỏe", text: "Spa với các liệu trình massage, tẩy tế bào chết và chăm sóc da mặt, cùng phòng xông hơi khô. Muốn vận động thì có phòng gym và sân tennis; muốn một ngày dài hơn ngoài trời thì có sân golf 18 hố. Khách đang lưu trú đặt lịch spa ngay trong trang tài khoản.", hours: "", img: imageUrl("spa.jpg"), fallback: imageUrl("room_deluxe_park_suite.jpg"), alt: "Spa" },
  { k: "Biển & hồ bơi", title: "Bãi biển riêng 700 mét", text: "Dải cát riêng dài 700 mét với nhiều môn thể thao dưới nước và khu lặn biển. Hồ bơi ngoài trời có cầu trượt cho trẻ em, cùng kids' club, khu vui chơi và mini-golf — để cả nhà, lớn hay nhỏ, đều có một ngày trọn vẹn.", hours: "Hồ bơi 06:00 – 22:00 · Buffet sáng 06:00 – 10:30", img: imageUrl("beach.jpg"), fallback: imageUrl("room_villa_3_bedroom_ocean_view.jpg"), alt: "Biển và hồ bơi" },
];
