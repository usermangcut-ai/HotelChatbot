import { Route, Routes } from "react-router-dom";
import ComingSoon from "./pages/ComingSoon";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ComingSoon title="Trang chủ" />} />
      <Route path="/dat-phong" element={<ComingSoon title="Đặt phòng" />} />
      <Route path="/dang-nhap" element={<ComingSoon title="Đăng nhập" />} />
      <Route path="/tai-khoan" element={<ComingSoon title="Tài khoản khách" />} />
      <Route path="/nhan-vien" element={<ComingSoon title="Nhân viên" />} />
      <Route path="/quan-tri" element={<ComingSoon title="Quản trị" />} />
      <Route path="*" element={<ComingSoon title="Không tìm thấy trang" />} />
    </Routes>
  );
}
