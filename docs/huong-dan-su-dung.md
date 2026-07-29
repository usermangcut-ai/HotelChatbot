# Hướng dẫn sử dụng theo vai trò

Tài liệu này mô tả luồng sử dụng thực tế của từng vai trò trong hệ thống — dùng để hiểu nghiệp vụ,
không phải tài liệu kỹ thuật (xem [README.md](../README.md) cho kiến trúc).

## Khách vãng lai (chưa đăng nhập)

1. Vào trang chủ, trò chuyện với lễ tân ảo để hỏi thông tin resort, hạng phòng, giá, tiện ích, giờ
   giấc, nội quy...
2. Khi hỏi đặt phòng, chatbot kiểm tra phòng còn trống theo khoảng ngày, rồi mở một **phiếu đặt
   phòng** ngay trên giao diện chat (không tự động ghi nhận).
3. Khách điền thông tin liên hệ, xem mã QR thanh toán (demo), bấm **xác nhận** — lúc này hệ thống mới
   thật sự ghi đặt phòng vào cơ sở dữ liệu, gán một phòng vật lý cụ thể, và **tự động cấp tài khoản
   khách lưu trú** (mật khẩu ngẫu nhiên hiển thị đúng một lần trên màn hình — cần lưu lại ngay).

## Khách đang lưu trú (đã đăng nhập bằng số phòng + mật khẩu)

1. Đăng nhập bằng số phòng và mật khẩu được cấp ở bước trên.
2. Trang "Tài khoản" cho phép gửi nhanh các yêu cầu hỗ trợ thường gặp (dọn phòng, gọi nhân viên, báo
   hỏng thiết bị...) mà không cần nhập lại tên/số phòng, kèm xem lại lịch sử yêu cầu và trạng thái xử
   lý.
3. Trang "Nhà hàng & Spa" cho phép đặt dịch vụ ăn uống/spa trực tiếp trên giao diện (không cần hỏi
   qua chatbot) — chỉ vai trò này mới đặt được, khách vãng lai vào sẽ bị chặn.

## Nhân viên

1. Đăng nhập bằng tên đăng nhập + mật khẩu do quản trị viên cấp.
2. Trang "Hàng đợi xử lý" gộp chung yêu cầu dịch vụ (nhà hàng/spa) và yêu cầu hỗ trợ phòng, có thể lọc
   theo đang chờ / đã xử lý.
3. Đánh dấu một yêu cầu là đã xử lý xong bằng một nút bấm.
4. Có thể tự đổi mật khẩu của chính mình bất cứ lúc nào qua nút "Đổi mật khẩu" trên cùng trang.

## Quản trị viên

1. Đăng nhập bằng tên đăng nhập + mật khẩu (tài khoản khởi tạo lần đầu: `admin` / `admin123` — nên
   đổi ngay sau lần đăng nhập đầu).
2. Trang "Bảng quản trị" có 3 khu vực:
   - **Đặt phòng**: xem toàn bộ đặt phòng, hủy hoặc xóa.
   - **Yêu cầu dịch vụ**: xem toàn bộ yêu cầu nhà hàng/spa, hủy hoặc xóa.
   - **Tài khoản**: tạo tài khoản nhân viên/quản trị viên mới, xóa tài khoản, và tự đổi mật khẩu của
     chính mình.
3. Quản trị viên có toàn quyền trên dữ liệu đặt phòng/dịch vụ, không giới hạn như nhân viên (chỉ đánh
   dấu xử lý).
