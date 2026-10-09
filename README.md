# Khaifrost Resort — Hotel Chatbot

Chatbot lễ tân ảo **tiếng Việt** cho một khu nghỉ dưỡng, đóng vai một quản lý lễ tân thật: trả lời
câu hỏi có căn cứ (không bịa số liệu), nhớ ngữ cảnh nhiều lượt, và có thể **thực hiện hành động thật**
— đặt phòng, đặt dịch vụ nhà hàng/spa — chứ không chỉ trò chuyện suông.

Toàn bộ hệ thống chạy qua một cổng duy nhất: **FastAPI** (`api/`) phục vụ cả API lẫn giao diện
**React** (`frontend/`) đã build, có **đăng nhập phân quyền theo 4 vai trò** (khách vãng lai, khách
đang lưu trú, nhân viên, quản trị viên).

## Tính năng

- **Hỏi–đáp thông tin resort**: hạng phòng, giá, tiện ích, giờ giấc, nội quy, quy trình đặt phòng —
  trả lời dựa trên dữ liệu thật (`data/knowledge.json`), không suy diễn.
- **Đặt phòng theo khoảng ngày**, có kiểm tra phòng trống chống overbook, sinh phiếu đặt phòng + mã
  QR (demo) → khách xác nhận trên giao diện mới thật sự ghi vào cơ sở dữ liệu → tự động cấp tài khoản
  khách lưu trú (mật khẩu ngẫu nhiên, hiển thị đúng một lần).
- **Đặt dịch vụ nhà hàng/spa** — chỉ dành cho khách đang lưu trú (đã đăng nhập), thao tác trực tiếp
  trên giao diện, không đi qua chatbot.
- **Ảnh minh họa phòng/resort** được chatbot tự quyết định gửi kèm khi phù hợp ngữ cảnh.
- **Quản trị (Admin)**: xem/sửa/hủy toàn bộ đặt phòng và yêu cầu dịch vụ; tạo/xóa tài khoản nhân
  viên; tự đổi mật khẩu.
- **Nhân viên (Staff)**: hàng đợi yêu cầu dịch vụ + hỗ trợ phòng, đánh dấu đã xử lý.
- **Khách lưu trú**: gọi nhân viên / yêu cầu hỗ trợ nhanh (dọn phòng, báo hỏng thiết bị...) không
  cần nhập lại thông tin, xem lịch sử yêu cầu.

## Kiến trúc hệ thống

### Agent trả lời — mô hình tool-use, không router cứng

```
Câu khách ─► [guardrail: độ dài + LLM scope-classifier] ─► [Memory: nạp N lượt] ─► [LLM + 4 tool]
                                                                                        │
                              ┌───────────────┬────────────────┬───────────────┐
                              ▼               ▼                ▼               ▼
                       knowledge_tool  availability_tool  open_booking_   show_photos_tool
                         (title)     (room_types?, ngày?)  form_tool        (subject)
                        Thông tin    Phòng CÒN TRỐNG —    Mở phiếu đặt    Gửi ảnh minh
                        TĨNH từ      không ngày = mặc     phòng (marker,  họa phòng/
                        knowledge    định HÔM NAY, luôn   KHÔNG tự ghi    resort (data/
                        .json        tính từ reservations  DB) → UI hiện  images/)
                                                            phiếu + QR giả
```

- LLM tự quyết định gọi tool nào (kể cả nhiều tool trong cùng một lượt) — không có logic if/else định
  tuyến câu hỏi.
- **LLM không bao giờ tự ghi cơ sở dữ liệu.** `open_booking_form_tool` chỉ trả về một marker JSON;
  frontend đọc marker để hiển thị phiếu đặt phòng, và chỉ ghi `hotel.db` khi khách **bấm xác nhận
  trên giao diện** — con người luôn là bước cuối cùng cho một hành động có ràng buộc thật (đặt phòng).
- **Grounding**: mọi số liệu chatbot đưa ra chỉ lấy từ kết quả tool; các thông tin rủi ro cao (số điện
  thoại, đánh giá...) được nhúng thẳng từ `knowledge.json` vào system prompt — một nguồn duy nhất,
  không thể lệch giữa các lần trả lời.
- **Guardrail hai lớp**:
  1. `agent/guardrail.py` chạy **trước** agent chính — chặn input quá dài, và phân loại phạm vi câu
     hỏi bằng một lệnh LLM riêng (đúng phạm vi / ngoài phạm vi / có dấu hiệu prompt injection), có kèm
     lịch sử hội thoại để không chặn nhầm câu cụt nối tiếp ngữ cảnh.
  2. `agent/tools.py` tự chặn loại dịch vụ/hạng phòng/ngày tháng sai trước khi mở phiếu đặt phòng —
     kiểm tra tất định bằng code, không phụ thuộc vào "trí nhớ" của model.
- Lịch sử hội thoại được đưa thẳng vào messages gửi cho LLM (multi-turn, không cần bước rewrite câu
  hỏi riêng).

### Phân quyền 4 vai trò (RBAC)

Đăng nhập bằng session cookie, phiên lưu trong bảng `sessions` của `hotel.db`.

| Vai trò               | Đăng nhập bằng                                             | Vào được                       |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------- |
| Khách vãng lai       | (không cần đăng nhập)                                     | Trang chủ, đặt phòng           |
| Khách đang lưu trú | Số phòng + mật khẩu (cấp tự động khi thanh toán xong) | Trang tài khoản, đặt dịch vụ |
| Nhân viên            | Tên đăng nhập + mật khẩu                                 | Hàng đợi xử lý yêu cầu      |
| Quản trị viên       | Tên đăng nhập + mật khẩu                                 | Bảng quản trị toàn hệ thống  |

Route đặt dịch vụ (`/dich-vu`, `/api/service-requests`) chỉ chấp nhận vai trò khách đang lưu trú —
khách vãng lai vào sẽ thấy màn chặn trên giao diện, gọi thẳng API sẽ nhận `401`/`403`.

Mật khẩu được hash bằng **bcrypt** (salt riêng mỗi lần hash, cố ý tính toán chậm để chống dò mật khẩu
hàng loạt) — không lưu trữ hay so sánh mật khẩu ở dạng chữ rõ khi xác thực.

## Cấu trúc thư mục

```
agent/     Mã nguồn lõi: config · memory · trace · knowledge · db (dữ liệu + RBAC) · tools · agent ·
           prompts · photos · run · llm_client — dùng chung cho CLI lẫn API, không phụ thuộc web framework
api/       FastAPI: main.py (khởi tạo app + phục vụ frontend tĩnh) · auth.py (session) · schemas.py ·
           routes/ (chat, bookings, service_requests, auth, admin, staff, guest) — chỉ bọc agent/*
           thành route HTTP, không chứa logic nghiệp vụ riêng
frontend/  React + Vite + TypeScript + Tailwind: src/pages/ (trang chủ, đặt phòng, dịch vụ, đăng
           nhập, quản trị, nhân viên, tài khoản khách), src/components/, src/AuthContext.tsx, src/api.ts
data/      Dữ liệu TĨNH (đi cùng code/image): knowledge.json · rooms.json (22 phòng vật lý) ·
           images/ (ảnh phòng/resort, phục vụ qua /images/...)
storage/   Dữ liệu ĐỘNG (không track git, là volume khi chạy Docker): hotel.db (SQLite — nguồn
           dữ liệu thật duy nhất) · logs/traces.jsonl
eval/      Bộ đánh giá chất lượng agent: golden.jsonl (case đơn lượt) · golden_multi.jsonl (hội
           thoại nhiều lượt) · run_eval.py
tests/     Unit test Python cho agent/ và api/ (tiêm fake LLM/DB, không gọi mạng thật)
docs/      Tài liệu vận hành/nghiệp vụ bổ sung
```

## Cài đặt & chạy

### Bằng Docker (khuyến nghị)

```bash
copy .env.example .env        # rồi điền LLM_BASE_URL / LLM_API_KEY / LLM_MODEL + ADMIN_PASSWORD (tạo admin lần đầu)
mkdir storage                 # thư mục dữ liệu động — tạo trước để container (user không phải root) ghi được
docker compose up -d --build
```

Truy cập `http://localhost:8000`. Dữ liệu động (`storage/`) được mount ra ngoài container nên build lại/khởi động lại không mất dữ liệu.

> Trên Windows dùng Git Bash: chạy bằng `docker compose`, không dùng `docker run -v ...` trực tiếp —
> Git Bash tự dịch đường dẫn kiểu Unix trong tham số `-v`, có thể làm sai đường dẫn mount.

### Thủ công

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env        # rồi điền LLM_BASE_URL / LLM_API_KEY / LLM_MODEL + ADMIN_PASSWORD (tạo admin lần đầu)

cd frontend
npm install
npm run build
cd ..

.venv\Scripts\python -m uvicorn api.main:app --reload
```

Provider LLM cần theo chuẩn OpenAI `/chat/completions` và **hỗ trợ function-calling**.

Lần khởi động đầu tiên (DB chưa có tài khoản nhân viên nào), app tạo admin từ `ADMIN_USERNAME` /
`ADMIN_PASSWORD` trong `.env`. Để trống `ADMIN_PASSWORD` thì không tạo.

## Cấu hình (biến môi trường)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | — | Provider LLM (bắt buộc để chat) |
| `STORAGE_DIR` | `./storage` | Thư mục dữ liệu động; trên Docker là `/app/storage` |
| `DB_PATH` | `$STORAGE_DIR/hotel.db` | File SQLite |
| `LOG_PATH` | `$STORAGE_DIR/logs/traces.jsonl` | Trace từng lượt chat |
| `APP_TZ` | `Asia/Ho_Chi_Minh` | Múi giờ nghiệp vụ |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | `admin`, trống | Admin tạo lần đầu |
| `COOKIE_SECURE` | `false` | `true` khi chạy sau HTTPS |
| `CHAT_IDLE_MINUTES` | `60` | Phiên chat im lặng quá số phút này thì bị xóa khỏi RAM |
| `CHAT_MAX_SESSIONS` | `1000` | Trần số phiên chat trong RAM |
| `GUEST_LOGIN_ANYTIME` | `false` | `true` = khách đăng nhập được cả trước ngày nhận phòng (test/demo) |
| `GUARDRAIL_ENABLED` | `true` | Tắt khi cần đo latency |

**Nâng cấp từ bản cũ** (hotel.db nằm ở `data/`): dời `data/hotel.db*` sang `storage/`, xóa
`data/hotel_view.json`. Lần khởi động kế tiếp app tự nâng cấp schema (PRAGMA user_version).

## Kiểm thử & chất lượng

```bash
.venv\Scripts\python -m pytest                # unit test agent/ + api/, không cần .env
.venv\Scripts\python eval\run_eval.py         # đánh giá chất lượng trả lời của agent, cần .env
.venv\Scripts\python -m agent.run             # chat trực tiếp qua CLI, không cần frontend
```

Bộ eval (`eval/golden.jsonl`, `eval/golden_multi.jsonl`) gồm các case đơn lượt và hội thoại nhiều
lượt, thiết kế bao phủ: thông tin phòng/resort, giờ giấc & nội quy (kèm câu hỏi phủ định dễ gây nhầm),
đặt phòng (đủ thông tin / ngày tương đối / thiếu thông tin), từ chối câu hỏi ngoài phạm vi, và chống
prompt injection giữa hội thoại.

## Ghi chú vận hành

- `storage/hotel.db` là **nguồn dữ liệu thật duy nhất**. Schema được tạo/nâng cấp tự động lúc khởi
  động bằng migration đánh số (`agent/schema.py`); phòng vật lý seed từ `data/rooms.json`.
- Trace debug từng lượt chat nằm ở `storage/logs/traces.jsonl`, lọc theo `session_id`.
- Phạm vi có chủ đích **không bao gồm**: cá nhân hóa/ghi nhớ khách qua nhiều phiên, embedding/RAG (kho
  kiến thức hiện đủ nhỏ để nhúng thẳng vào prompt), cổng thanh toán thật (QR hiện là bản demo),
  OAuth/SSO.
- Hội thoại chat chỉ nằm trong RAM của server (không lưu DB): F5 vẫn giữ (trình duyệt lưu trong
  `sessionStorage`), đóng tab là mất; restart server thì các cuộc chat đang dở mất ngữ cảnh. Vì vậy
  chạy **1 instance, 1 worker** (không truyền `--workers` cho uvicorn) — nhiều process sẽ mỗi process
  nhớ một kiểu. `--reload` khi dev cũng xóa sạch các cuộc chat mỗi lần code đổi.
