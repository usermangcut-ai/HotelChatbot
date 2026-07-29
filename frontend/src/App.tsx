import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import BookingPage from "./pages/BookingPage";
import GuestAccountPage from "./pages/GuestAccountPage";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import ServiceRequestPage from "./pages/ServiceRequestPage";
import StaffPage from "./pages/StaffPage";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dat-phong" element={<BookingPage />} />
        <Route path="/dich-vu" element={<ServiceRequestPage />} />
        <Route path="/dang-nhap" element={<LoginPage />} />
        <Route
          path="/tai-khoan"
          element={
            <ProtectedRoute role="guest">
              <GuestAccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/nhan-vien"
          element={
            <ProtectedRoute role="staff">
              <StaffPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quan-tri"
          element={
            <ProtectedRoute role="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
