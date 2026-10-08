import { imageUrl } from "./lib/assets";
// Chữ tĩnh trang chủ. Số liệu lấy từ data/knowledge.json — đổi ở đó thì sửa cả ở đây.
export const HOTLINE = "+84-999-1234567";
export const EMAIL = "contact@shanghairesort.com";

export const POLICY = "Nhận phòng từ 15:00 · trả phòng trước 12:00. Hủy trước 3 ngày so với ngày nhận phòng được hoàn 100% tiền cọc; muốn hủy hoặc đổi ngày, vui lòng gọi lễ tân.";

export const AMENITIES = [
  { k: "Ẩm thực", title: "Nhà hàng & quầy bar", text: "Bốn nhà hàng Orchid, Beachcomber, Lotus và buffet — món Việt, Á, quốc tế. Ba quầy bar, trong đó Seaview Lounge có nhạc piano trực tiếp.", hours: "Room service 24/24", img: imageUrl("dining.jpg"), fallback: imageUrl("hotel.jpg"), alt: "Nhà hàng bên biển" },
  { k: "Thư giãn", title: "Spa & sức khỏe", text: "Massage, tẩy tế bào chết, facial, sauna, phòng gym và sân tennis. Khách đang lưu trú đặt lịch ngay trong trang tài khoản.", hours: "", img: imageUrl("spa.jpg"), fallback: imageUrl("room_deluxe_park_suite.jpg"), alt: "Spa" },
  { k: "Biển & hồ bơi", title: "Bãi biển riêng 700 mét", text: "Thể thao dưới nước, khu lặn biển và hồ bơi ngoài trời có cầu trượt cho trẻ em.", hours: "Hồ bơi 06:00 – 22:00 · Buffet sáng 06:00 – 10:30", img: imageUrl("beach.jpg"), fallback: imageUrl("room_villa_3_bedroom_ocean_view.jpg"), alt: "Biển và hồ bơi" },
];
