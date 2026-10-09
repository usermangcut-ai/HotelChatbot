# syntax=docker/dockerfile:1
#
# Build nhanh nhờ 2 nguyên tắc:
# 1) Multi-stage: stage build frontend (Node) tách khỏi stage chạy backend (Python) — image cuối
#    không mang theo Node/npm/node_modules, chỉ có file tĩnh đã build.
# 2) Cache theo layer: copy file khai báo dependency (requirements.txt / package.json) TRƯỚC, cài
#    đặt xong mới copy source code. Sửa code (thường xuyên) sẽ không làm mất cache bước cài đặt
#    (chậm nhất). Không dùng `RUN --mount=type=cache` vì builder của Railway đòi id cache riêng.

# ---------- Stage 1: build frontend ----------
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend + phục vụ frontend đã build ----------
FROM python:3.12-slim AS final
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY agent/ ./agent/
COPY api/ ./api/
COPY data/ ./data/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# data/ = dữ liệu TĨNH (trong image). storage/ = dữ liệu ĐỘNG (hotel.db, logs) — cắm volume vào đây;
# KHÔNG cắm volume vào /app/data (sẽ che mất knowledge.json/rooms.json/images trong image).
# Volume do nơi chạy cắm vào (docker-compose / Railway Volume) — không khai báo VOLUME ở đây vì
# Railway từ chối Dockerfile có lệnh VOLUME.
ENV STORAGE_DIR=/app/storage
RUN mkdir -p /app/storage && useradd -m -u 1000 appuser && chown -R appuser /app
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# KHÔNG đặt `USER appuser`: entrypoint cần root để sửa quyền volume, rồi tự hạ xuống appuser.
ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD python -c "import os, urllib.request as u; u.urlopen('http://localhost:%s/api/health' % os.getenv('PORT', '8000'))" || exit 1

# Railway tự đặt biến PORT; chạy ở máy thì mặc định 8000. Dạng shell để ${PORT} được thay giá trị.
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
