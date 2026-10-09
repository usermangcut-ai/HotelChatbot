"""FastAPI app — điểm vào duy nhất, ghép các router + phục vụ frontend đã build."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from agent.config import IMAGES_DIR
from agent.schema import init_db
from api.routes import admin, auth, bookings, chat, guest, service_requests, staff

@asynccontextmanager
async def lifespan(_app):
    init_db()   # tạo/nâng cấp schema + seed phòng/admin — 1 lần lúc khởi động, không phải lúc import
    yield


app = FastAPI(title="Khaifrost Resort API", lifespan=lifespan)
app.include_router(chat.router)
app.include_router(bookings.router)
app.include_router(service_requests.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(staff.router)
app.include_router(guest.router)


@app.middleware("http")
async def revalidate_static(request: Request, call_next):
    """Ảnh và index.html giữ nguyên tên khi thay nội dung → buộc trình duyệt hỏi lại server (ETag,
    rẻ: 304 nếu không đổi) thay vì hiện bản cũ trong cache. JS/CSS trong /assets đã có hash trong
    tên file nên cho cache lâu. /api giữ mặc định."""
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/assets/"):
        response.headers.setdefault("Cache-Control", "public, max-age=31536000, immutable")
    elif not path.startswith("/api"):
        response.headers.setdefault("Cache-Control", "no-cache")
    return response

if os.path.isdir(IMAGES_DIR):
    app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_FRONTEND_DIST = os.path.join(_ROOT, "frontend", "dist")
if os.path.isdir(_FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")

    _INDEX_HTML = os.path.join(_FRONTEND_DIST, "index.html")

    @app.exception_handler(StarletteHTTPException)
    async def spa_fallback(request: Request, exc: StarletteHTTPException):
        """SPA fallback: unmatched non-API GET path → index.html (React Router lo phần còn lại)."""
        if (
            exc.status_code == 404
            and request.method == "GET"
            and not request.url.path.startswith("/api")
            and not request.url.path.startswith("/images")
        ):
            return FileResponse(_INDEX_HTML)
        return await http_exception_handler(request, exc)
