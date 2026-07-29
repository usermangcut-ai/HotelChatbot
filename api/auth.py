"""Xác thực qua session cookie — dùng chung cho mọi route cần biết 'ai đang gọi'."""
from fastapi import Cookie, Depends, HTTPException

from agent import db as agent_db

COOKIE_NAME = "session_id"


def get_current_identity(session_id: str | None = Cookie(default=None, alias=COOKIE_NAME)):
    """Trả {'identity_type','identity_id','role'} hoặc raise 401 nếu chưa đăng nhập/session hết hạn."""
    if not session_id:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập.")
    identity = agent_db.get_session(session_id)
    if not identity:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn.")
    return identity


def require_role(role: str):
    """Dependency factory: raise 403 nếu identity.role khác role yêu cầu."""

    def checker(identity=Depends(get_current_identity)):
        if identity["role"] != role:
            raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
        return identity

    return checker
