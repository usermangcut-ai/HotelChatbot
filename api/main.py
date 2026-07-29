"""FastAPI app — điểm vào duy nhất, ghép các router + phục vụ frontend đã build."""
import os

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from agent.config import IMAGES_DIR
from api.routes import admin, auth, bookings, chat, guest, service_requests, staff

app = FastAPI(title="Shanghai Resort API")
app.include_router(chat.router)
app.include_router(bookings.router)
app.include_router(service_requests.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(staff.router)
app.include_router(guest.router)

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
