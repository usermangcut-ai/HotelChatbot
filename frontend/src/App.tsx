import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import ChatDrawer from "./features/chat/ChatDrawer";
import ChatLauncher from "./features/chat/ChatLauncher";
import { ChatProvider, useChat } from "./features/chat/ChatProvider";
import ComingSoon from "./pages/ComingSoon";
import Home from "./pages/Home";

function Public({ children }: { children: ReactNode }) {
  const { open } = useChat();
  return (
    <PublicLayout onOpenChat={() => open()}>
      {children}
      <ChatLauncher />
      <ChatDrawer />
    </PublicLayout>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <Routes>
        <Route path="/" element={<Public><Home /></Public>} />
        <Route path="/dat-phong" element={<Public><ComingSoon title="Đặt phòng" /></Public>} />
        <Route path="/dang-nhap" element={<ComingSoon title="Đăng nhập" />} />
        <Route path="/tai-khoan" element={<ComingSoon title="Tài khoản khách" />} />
        <Route path="/nhan-vien" element={<ComingSoon title="Nhân viên" />} />
        <Route path="/quan-tri" element={<ComingSoon title="Quản trị" />} />
        <Route path="*" element={<Public><ComingSoon title="Không tìm thấy trang" /></Public>} />
      </Routes>
    </ChatProvider>
  );
}
