import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import Admin from "./pages/Admin";
import BookingPage from "./features/booking/BookingPage";
import ChatDrawer from "./features/chat/ChatDrawer";
import ChatFab from "./features/chat/ChatFab";
import { ChatProvider } from "./features/chat/ChatProvider";
import { RequireRole } from "./lib/auth";
import ComingSoon from "./pages/ComingSoon";
import GuestAccount from "./pages/GuestAccount";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Staff from "./pages/Staff";

function Public({ children, overlay }: { children: ReactNode; overlay?: boolean }) {
  return (
    <PublicLayout overlay={overlay}>
      {children}
      <ChatFab />
      <ChatDrawer />
    </PublicLayout>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <Routes>
        <Route path="/" element={<Public overlay><Home /></Public>} />
        <Route path="/dat-phong" element={<Public><BookingPage /></Public>} />
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/tai-khoan" element={<RequireRole roles={["guest"]}><GuestAccount /></RequireRole>} />
        <Route path="/nhan-vien" element={<RequireRole roles={["staff", "admin"]}><Staff /></RequireRole>} />
        <Route path="/quan-tri" element={<RequireRole roles={["admin"]}><Admin /></RequireRole>} />
        <Route path="*" element={<Public><ComingSoon title="Không tìm thấy trang" /></Public>} />
      </Routes>
    </ChatProvider>
  );
}
