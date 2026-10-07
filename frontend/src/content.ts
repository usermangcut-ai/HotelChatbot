// Chữ tĩnh trang chủ. Số liệu lấy từ data/knowledge.json — đổi ở đó thì sửa cả ở đây.
export const HOTLINE = "+84-999-1234567";
export const EMAIL = "contact@shanghairesort.com";

export const FACTS = [
  { label: "Nhận phòng", value: "từ 15:00" },
  { label: "Trả phòng", value: "trước 12:00" },
  { label: "Đánh giá", value: "8.9 / 10" },
  { label: "Sân bay quốc tế", value: "~25 km" },
];

export const AMENITIES = [
  { no: "01", title: "Nhà hàng & quầy bar", text: "Bốn nhà hàng Orchid, Beachcomber, Lotus và buffet — món Việt, Á, quốc tế. Ba quầy bar, trong đó Seaview Lounge có nhạc piano trực tiếp.", hours: "Room service 24/24" },
  { no: "02", title: "Spa & sức khỏe", text: "Massage, tẩy tế bào chết, facial, sauna, phòng gym và sân tennis.", hours: "Đặt lịch qua tài khoản khách" },
  { no: "03", title: "Biển & hồ bơi", text: "Bãi biển riêng dài 700 m với thể thao dưới nước, khu lặn biển, hồ bơi ngoài trời có cầu trượt cho trẻ em.", hours: "Hồ bơi 06:00 – 22:00" },
  { no: "04", title: "Buffet sáng", text: "Món Âu, Á, Trung Hoa và Continental, đã gồm trong hầu hết hạng phòng.", hours: "06:00 – 10:30" },
];

/** Câu gửi vào chat khi bấm nút nhanh. */
export const QUICK_ASKS: Record<string, string> = {
  "Còn phòng trống?": "Hôm nay còn phòng trống không?",
  "Xem hạng phòng": "Resort có những hạng phòng nào?",
  "Đặt phòng": "Mình muốn đặt phòng",
  "Chính sách hủy": "Chính sách hủy đặt phòng thế nào?",
  "Giờ buffet sáng": "Buffet sáng phục vụ mấy giờ?",
};
