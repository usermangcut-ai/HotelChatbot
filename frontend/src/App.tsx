import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import BookingPage from "./features/booking/BookingPage";
import ChatDrawer from "./features/chat/ChatDrawer";
import ChatLauncher from "./features/chat/ChatLauncher";
import { ChatProvider, useChat } from "./features/chat/ChatProvider";
import { RequireRole } from "./lib/auth";
import ComingSoon from "./pages/ComingSoon";
import GuestAccount from "./pages/GuestAccount";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Staff from "./pages/Staff";

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
        <Route path="/dat-phong" element={<Public><BookingPage /></Public>} />
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/tai-khoan" element={<RequireRole roles={["guest"]}><GuestAccount /></RequireRole>} />
        <Route path="/nhan-vien" element={<RequireRole roles={["staff", "admin"]}><Staff /></RequireRole>} />
        <Route path="/quan-tri" element={<RequireRole roles={["admin"]}><ComingSoon title="Quản trị" /></RequireRole>} />
        <Route path="*" element={<Public><ComingSoon title="Không tìm thấy trang" /></Public>} />
      </Routes>
    </ChatProvider>
  );
}
