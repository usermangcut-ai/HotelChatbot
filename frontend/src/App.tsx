import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import ChatDrawer from "./features/chat/ChatDrawer";
import ChatLauncher from "./features/chat/ChatLauncher";
import { ChatProvider, useChat } from "./features/chat/ChatProvider";
import { RequireRole } from "./lib/auth";
import ComingSoon from "./pages/ComingSoon";
import Home from "./pages/Home";
import Login from "./pages/Login";

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
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/tai-khoan" element={<RequireRole roles={["guest"]}><ComingSoon title="Tài khoản khách" /></RequireRole>} />
        <Route path="/nhan-vien" element={<RequireRole roles={["staff", "admin"]}><ComingSoon title="Nhân viên" /></RequireRole>} />
        <Route path="/quan-tri" element={<RequireRole roles={["admin"]}><ComingSoon title="Quản trị" /></RequireRole>} />
        <Route path="*" element={<Public><ComingSoon title="Không tìm thấy trang" /></Public>} />
      </Routes>
    </ChatProvider>
  );
}
