# Trạng thái dự án — Khaifrost Resort (cập nhật 2026-10-08)

Tài liệu bàn giao. Đọc file này là đủ để nắm dự án đang ở đâu và bước tiếp theo là gì, kể cả khi
chưa đọc lịch sử trò chuyện hay commit. Xem thêm: [README.md](../README.md) (kiến trúc, cách chạy),
[huong-dan-su-dung.md](huong-dan-su-dung.md) (luồng nghiệp vụ theo vai trò),
[AGENT_KNOWLEDGE.md](AGENT_KNOWLEDGE.md) (kiến thức của agent), [design-reference/](design-reference/)
(thiết kế giao diện).

---

## 1. Dự án là gì

Web app cho một resort hư cấu tên **Khaifrost Resort**. Trọng tâm là **lễ tân AI tiếng Việt** (chatbot
có gọi tool) giúp khách hỏi thông tin và đặt phòng. Mục tiêu: bản **demo/portfolio "như thật"** cho
doanh nghiệp nhỏ, và là bài tập để học quy trình CI/CD + deploy. Chưa có khách hàng thật.

Đã chốt và không bàn lại:

- **SQLite + volume**, không dùng Postgres. Một instance, một worker.
- **Không có thanh toán thật.** Mã QR đặt cọc chỉ để demo.
- Danh sách phòng là file tĩnh `data/rooms.json`. Dữ liệu thay đổi (DB, log) nằm trong `storage/`.
- **Hủy/đổi đặt phòng và quên mật khẩu → gọi hotline lễ tân.** Bot không tự hủy.
- Chat chỉ dùng để hỏi thông tin và đặt phòng.
- Lịch sử chat **chỉ nằm trong RAM** ở server. Trình duyệt giữ bản sao trong `sessionStorage`: F5 vẫn
  còn, đóng tab là mất. Server tự xóa phiên sau 60 phút không hoạt động.
- Spec/plan chi tiết ở `docs/superpowers/` **không commit** (bị gitignore, chỉ có trên máy dev).

## 2. Kiến trúc

```
Trình duyệt (React SPA)
   │  fetch /api/*  (cookie phiên đăng nhập)
   ▼
FastAPI  api/main.py ── phục vụ luôn frontend/dist và /images
   ├── api/routes/*        REST: chat, bookings, auth, guest, staff, admin, service_requests
   ├── agent/agent.py      vòng lặp agent: LLM ⇄ tool (tối đa 5 vòng/lượt)
   │     ├── guardrail.py  1 lời gọi LLM phân loại "đúng chủ đề?", chạy SONG SONG lần gọi đầu
   │     ├── tools.py      knowledge / availability / open_booking_form / show_photos
   │     ├── memory.py     lịch sử chat trong RAM (OrderedDict, TTL, trần số phiên, lock)
   │     └── llm_client.py gọi API kiểu OpenAI qua urllib (KHÔNG streaming)
   └── agent/db.py         tầng truy cập SQLite (schema/migration ở agent/schema.py)
```

- **Backend:** Python, FastAPI, SQLite (WAL). Migration đánh số theo `PRAGMA user_version` (v1 schema
  gốc, v2 hardening). `init_db()` chạy trong `lifespan`, không chạy lúc import. Mật khẩu băm bcrypt,
  phiên đăng nhập bằng cookie, phân quyền 3 vai trò: khách lưu trú / nhân viên / admin. "Hôm nay" tính
  theo `APP_TZ` (`agent/clock.py`).
- **LLM:** bất kỳ provider nào tương thích OpenAI và hỗ trợ function calling (`LLM_BASE_URL`,
  `LLM_API_KEY`, `LLM_MODEL`). Đưa 6 lượt hội thoại gần nhất vào context.
- **Frontend:** React 19 + TypeScript + Vite + React Router 7. Style bằng **CSS Modules** chép từ
  mockup (đã bỏ Tailwind). Test bằng Vitest, lint bằng oxlint.
- **Docker:** build nhiều giai đoạn (build frontend → image Python). Volume tại `/app/storage`, có
  healthcheck. Đã chạy thử được với storage trống và với storage thật.

## 3. Tính năng theo trang

| Trang | Đường dẫn | Có gì |
|---|---|---|
| Trang chủ | `/` | Ảnh tràn màn hình, logo KR ở giữa, giới thiệu, 8 hạng phòng, ẩm thực/spa/bãi biển, dịch vụ, chính sách. Nút chat tròn ("AI") mở khung chat bên phải, **không làm mờ trang**. |
| Chat | (khung nổi) | Hỏi đáp, thẻ ảnh, thẻ phòng trống, **phiếu đặt phòng ngay trong chat** (điền liên hệ → QR demo → xác nhận). |
| Đặt phòng | `/dat-phong` | Đặt phòng không cần chat: chọn ngày → xem phòng trống → điền thông tin → QR → xác nhận, nhận mã booking + mật khẩu (hiện đúng 1 lần). |
| Đăng nhập | `/dang-nhap` | Chung cho khách (số phòng/mã booking + mật khẩu) và nhân viên. Báo lỗi cụ thể khi chưa tới ngày nhận phòng. |
| Tài khoản khách | `/tai-khoan` | Thông tin kỳ lưu trú, gửi nhanh yêu cầu (dọn phòng, báo hỏng…), xem lịch sử yêu cầu, đổi mật khẩu. |
| Nhân viên | `/nhan-vien` | Hàng đợi yêu cầu dịch vụ: nhận → xong / hủy. |
| Admin | `/quan-tri` | Tổng quan, đặt phòng (đã trả / hủy / hoàn tất), yêu cầu dịch vụ, danh sách tài khoản nhân viên (thu hồi), tạo tài khoản. |

Tên resort ở mọi trang đều là link về trang chủ.

### API (tóm tắt)

```
POST /api/chat                         GET  /api/rooms        GET /api/availability
POST /api/bookings                     POST /api/service-requests
POST /api/auth/login|logout|change-password     GET /api/auth/me
GET  /api/me/stay   GET|POST /api/me/requests   GET /api/me/service-requests
GET  /api/staff/requests|service-requests       PATCH .../{id}
GET  /api/admin/bookings|service-requests|staff-accounts   PATCH/DELETE .../{id}   POST staff-accounts
```

Quy ước quan trọng: `session_id` của chat phải khớp `^[A-Za-z0-9_-]{8,64}$`. PATCH trạng thái chỉ nhận
`paid|cancelled|completed` (booking) và `received|done|cancelled` (yêu cầu). Phiên khách tự hết hạn khi
hết kỳ lưu trú; frontend coi 401 là đã đăng xuất.

## 4. Chạy, cấu hình, kiểm thử

```bash
cp .env.example .env            # điền LLM_*; các biến khác có mặc định
pip install -r requirements.txt
cd frontend && npm ci && npm run build && cd ..
uvicorn api.main:app --port 8000    # http://localhost:8000
# hoặc: docker compose up --build
```

Biến môi trường chính (xem `.env.example`): `STORAGE_DIR`, `APP_TZ` (mặc định Asia/Ho_Chi_Minh),
`ADMIN_USERNAME`/`ADMIN_PASSWORD` (chỉ seed khi DB chưa có tài khoản), `COOKIE_SECURE`,
`GUARDRAIL_ENABLED`, `CHAT_IDLE_MINUTES` (60), `CHAT_MAX_SESSIONS` (1000), `GUEST_LOGIN_ANYTIME`.

- `GUEST_LOGIN_ANYTIME=true` cho phép khách đăng nhập ngoài kỳ lưu trú, **chỉ để test/demo**.
  `conftest.py` khóa giá trị này là `false` khi chạy test.

Kiểm thử (trạng thái lúc viết):

- `pytest` → **189 passed** (dùng DB tạm, không gọi LLM thật).
- `cd frontend && npm test` → **46 passed** (Vitest). Có thêm `npm run lint` và `npm run build`.
- `eval/run_eval.py` có 25 câu đơn (`golden.jsonl`) và 17 hội thoại nhiều lượt
  (`golden_multi.jsonl`). Bộ này **gọi LLM thật**, tốn tiền và kết quả không ổn định, nên không đưa
  vào CI như test thường.
- So mockup với app thật: `docs/design-reference/compare_screens.py`. Cần Playwright, cài riêng vì
  không có trong requirements.

## 5. Thiết kế và nội dung

- Phong cách tối giản, sang. Màu ngà/mực/ô-liu/đồng. Thang cỡ chữ 12/14/16/18/21/28/40/60. Nguồn
  gốc: `docs/design-reference/` (DESIGN_SPEC.md, design-tokens.json, mockups/).
- Chữ trên trang chủ chỉ lấy từ dữ liệu có thật trong `data/knowledge.json`, không thêm chi tiết bịa.
  Hằng số chung (hotline, email, dịch vụ, chính sách) để ở `frontend/src/content.ts`.
- Ảnh trong `data/images/`. Ảnh nguồn và tác giả ghi ở `CREDITS.md`, file gốc để trong `_source/`
  (gitignore). Ảnh resort lấy từ AI và Unsplash. **8 ảnh phòng là ảnh AI, mới có bản 512px.**
- Chống cache cũ: middleware gắn `Cache-Control: no-cache` cho mọi thứ ngoài `/api`, còn `/assets`
  (có hash trong tên file) dùng immutable. URL ảnh có `?v=` (theo mtime file hoặc build id).

## 6. Việc còn treo

| Việc | Ghi chú |
|---|---|
| Ảnh phòng độ phân giải cao | Hiện 512px, mờ trên màn lớn. |
| Bot lặp lại thông tin khi đã có thẻ | Đã hiện bảng phòng trống mà câu trả lời vẫn liệt kê lại từng hạng → thêm quy tắc vào prompt, cập nhật eval. |
| Làm sạch eval | Một số case dùng ngày cố định đã qua. Case "hủy phòng mã 45" còn kỳ vọng theo logic cũ (giờ là đưa hotline). |
| Rate limit | `/api/chat` và đăng nhập chưa giới hạn. Ai đó có thể tạo 1000 `session_id` giả để đẩy hết phiên thật ra khỏi RAM. |
| Cấu hình khi deploy | `COOKIE_SECURE=true`, `GUEST_LOGIN_ANYTIME=false`, đặt `ADMIN_PASSWORD` mạnh. |
| Quyền volume trên PaaS | Volume thường được mount với quyền root, trong khi container chạy bằng uid 1000 → cần entrypoint `chown` hoặc cấu hình UID. |
| Dọn file trên máy dev | `storage/hotel.db.before-v2` (bản DB cũ, chứa mật khẩu dạng plaintext, không có trong git) và `image.png` ở thư mục gốc (chưa track, chưa rõ dùng làm gì). |

## 7. Hướng tiếp theo

Thứ tự đã thống nhất: **agent trước, CI/CD làm cuối.**

### 7.1 Agent — giảm độ trễ (latency)

Ý tưởng: áp dụng một phương pháp tên **"jev"** mà chủ dự án mới nghe tới. Nếu dùng được cho cả việc
**gọi tool** thì càng tốt. **Chưa xác định "jev" cụ thể là gì**, cần tìm nguồn/tên đầy đủ trước khi
thiết kế, không làm theo phỏng đoán.

Các điểm gây chậm đã biết trong code hiện tại (dùng làm baseline để so sánh):

1. **Không có streaming.** `llm_client.chat_with_tools` chờ toàn bộ câu trả lời rồi mới trả về, nên
   người dùng thấy màn hình đứng im cho tới chữ cuối cùng.
2. **Vòng lặp tool chạy tuần tự.** Mỗi lần gọi tool cần thêm ít nhất một lượt LLM nữa (tối đa 5 vòng).
   Câu hỏi đặt phòng thường cần 2–3 lượt LLM.
3. **Guardrail là một lời gọi LLM riêng.** Đã chạy song song với lần gọi đầu nên không cộng dồn thời
   gian, nhưng vẫn tốn token. Có thể tắt bằng `GUARDRAIL_ENABLED=false` khi đo đạc.
4. **System prompt và schema tool gửi lại nguyên vẹn ở mỗi lượt**, kèm 6 lượt lịch sử. Kiểm tra provider
   có hỗ trợ prompt caching không.

Bước đầu tiên dù chọn phương pháp nào: **đo trước**. Ghi thời gian từng lần gọi LLM và tool vào trace
(`agent/trace.py`), chạy bộ eval để có số liệu p50/p95, rồi mới so trước/sau.

### 7.2 CI/CD + deploy (làm cuối)

GitHub Actions chạy pytest + vitest + lint + build Docker → deploy lên PaaS (Railway hoặc Render) có
volume cho `/app/storage`. Trước khi deploy phải xử lý hết các mục "Cấu hình khi deploy", "Quyền
volume" và "Rate limit" ở mục 6. Eval gọi LLM thật để chạy tay hoặc chạy theo lịch, không chặn merge.

## 8. Đánh giá mức độ hiện tại

**Đã tốt:**

- Luồng nghiệp vụ trọn vẹn cho cả 3 vai trò. Đặt phòng có giao dịch DB, gán phòng vật lý, cấp tài
  khoản khách.
- Có lớp bảo mật cơ bản đúng cách: bcrypt, cookie phiên, phân quyền, kiểm tra đầu vào bằng Literal và
  regex.
- Cấu hình hoàn toàn qua biến môi trường, có Docker. Test dày (235 test) và chạy nhanh.
- Giao diện được thiết kế có chủ đích, có mockup làm chuẩn. Nội dung không bịa.

**Còn ở mức demo:**

- Chỉ chạy được 1 instance, chat mất khi restart. Chấp nhận được với demo, nhưng là giới hạn kiến trúc
  thật.
- Chưa có rate limit, chưa có giám sát (monitoring), chưa có backup tự động cho file SQLite.
- Chất lượng agent mới được đo bằng 42 case eval chạy tay. Chưa có số liệu độ trễ.
- Thanh toán, email xác nhận, quên mật khẩu đều chưa có (có chủ đích).

Tóm lại: **portfolio tốt, sẵn sàng demo**, sau khi làm xong các mục ở 6 và 7.2 thì đưa lên mạng được.
Chưa phải sản phẩm để giao cho doanh nghiệp thật vận hành; để làm được việc đó cần thêm thanh toán,
backup, giám sát và nhiều instance.
