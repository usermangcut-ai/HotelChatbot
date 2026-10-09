# Frontend

React + Vite + TypeScript + Tailwind v4 — giao diện cho chatbot Khaifrost Resort.

Xem [README.md ở thư mục gốc](../README.md) để biết tổng quan hệ thống, cách cài đặt và chạy (chạy
qua FastAPI ở thư mục gốc, phục vụ bản build của thư mục này qua đúng 1 cổng — không chạy `npm run
dev` độc lập cho bản triển khai thật).

## Lệnh dùng trong lúc phát triển

```bash
npm install
npm run dev       # dev server có HMR, proxy /api sang FastAPI tại :8000
npm run build     # build ra dist/ để FastAPI phục vụ
npm run lint
```
