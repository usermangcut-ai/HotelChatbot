# syntax=docker/dockerfile:1
#
# Build nhanh nhờ 2 nguyên tắc:
# 1) Multi-stage: stage build frontend (Node) tách khỏi stage chạy backend (Python) — image cuối
#    không mang theo Node/npm/node_modules, chỉ có file tĩnh đã build.
# 2) Cache theo layer: copy file khai báo dependency (requirements.txt / package.json) TRƯỚC, cài
#    đặt xong mới copy source code. Sửa code (thường xuyên) sẽ không làm mất cache bước cài đặt
#    (chậm nhất). Kèm cache mount cho pip/npm để lần build sau không tải lại gói đã tải.

# ---------- Stage 1: build frontend ----------
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: backend + phục vụ frontend đã build ----------
FROM python:3.12-slim AS final
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

COPY agent/ ./agent/
COPY api/ ./api/
COPY data/ ./data/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# data/ = dữ liệu TĨNH (trong image). storage/ = dữ liệu ĐỘNG (hotel.db, logs) — cắm volume vào đây;
# KHÔNG cắm volume vào /app/data (sẽ che mất knowledge.json/rooms.json/images trong image).
ENV STORAGE_DIR=/app/storage
RUN mkdir -p /app/storage && useradd -m -u 1000 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000
VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD python -c "import urllib.request as u; u.urlopen('http://localhost:8000/')" || exit 1

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
