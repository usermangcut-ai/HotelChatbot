# Deploy lên Railway

Mỗi khi `main` có commit mới, GitHub Actions chạy CI (`.github/workflows/ci.yml`): test backend, test
và lint frontend, build Docker, gọi thử `/api/health`. Khi tất cả xanh, job `deploy` dùng Railway CLI
(`railway up`) đẩy code lên Railway, nên **không cần cài app GitHub của Railway**. Toàn bộ dữ liệu
(`hotel.db`, log) nằm trên **Volume** cắm vào `/app/storage`, nên deploy lại không mất đặt phòng.

```
git push main ──► GitHub Actions: test ─► build ─► deploy (railway up) ──► Railway chạy container
                                                                              │
                                                                Volume /app/storage (hotel.db)
```
git push main ──► GitHub Actions (CI) ──xanh──► Railway build Dockerfile ──► chạy container
                                                         │
                                                Volume /app/storage (hotel.db)
```

## Cài đặt lần đầu (chỉ làm một lần)

1. Vào **railway.com**, đăng nhập bằng GitHub, chọn **New Project → Deploy from GitHub repo →
   HotelChatbot**. Railway tự đọc `railway.json`: build bằng Dockerfile, kiểm tra sức khỏe qua
   `/api/health`.
2. Mở service → tab **Variables**, thêm các biến sau:

   | Biến | Giá trị |
   |---|---|
   | `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | giống trong `.env` ở máy |
   | `ADMIN_USERNAME` | ví dụ `admin` |
   | `ADMIN_PASSWORD` | mật khẩu mạnh. Chỉ dùng **lần đầu** để tạo tài khoản admin, sau đó đổi trong app |
   | `COOKIE_SECURE` | `true` |
   | `TRUST_PROXY` | `true` |
   | `GUEST_LOGIN_ANYTIME` | `false` |
   | `APP_TZ` | `Asia/Ho_Chi_Minh` |

   Không cần đặt `PORT` vì Railway tự cấp. Không đặt `STORAGE_DIR` vì Dockerfile đã đặt sẵn.
3. Thêm **Volume** cho service, **Mount path** là `/app/storage`.
4. Vào **Settings → Networking → Generate Domain** để lấy địa chỉ `*.up.railway.app`.
5. Tạo **Project Token**: **Project Settings → Tokens**, môi trường `production`. Sau đó vào GitHub repo
   → **Settings → Secrets and variables → Actions → New repository secret**, tên `RAILWAY_TOKEN`,
   dán token vào. Nếu tạo service mới thì sửa `SVC_ID` trong `ci.yml` (lấy trong URL của service,
   đoạn sau `/service/`).

## Kiểm tra sau khi deploy

- Mở `https://<domain>/api/health`, phải thấy `{"status":"ok"}`.
- Đăng nhập admin bằng `ADMIN_PASSWORD` → **đổi mật khẩu ngay**.
- Đặt thử một phòng, rồi bấm **Redeploy** trên Railway. Đặt phòng phải vẫn còn, nghĩa là Volume hoạt
  động.
- Kiểm tra rate limit nhận đúng IP: dùng điện thoại (4G) nhập sai mật khẩu 11 lần, lần thứ 11 phải
  báo "thao tác quá nhanh". Ngay sau đó đăng nhập từ máy tính (wifi khác) **phải vẫn được**. Nếu máy
  tính cũng bị chặn thì app đang đọc nhầm IP của proxy, cần xem lại `client_ip()` trong
  `api/ratelimit.py`.

## Ghi chú vận hành

- **Một instance duy nhất.** Đừng tăng số replica: lịch sử chat và bộ đếm rate limit nằm trong RAM,
  còn SQLite chỉ chịu một tiến trình ghi.
- Restart hoặc deploy lại thì các cuộc chat đang dở bị mất. Đặt phòng không mất.
- **Backup:** tải `hotel.db` từ Volume định kỳ (dùng tính năng backup volume của Railway nếu gói đang
  dùng có hỗ trợ).
- Chạy giống production ngay trên máy: `docker compose up --build`.
