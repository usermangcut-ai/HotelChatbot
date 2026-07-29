"""Route /api/auth/* — đăng nhập (khách lưu trú hoặc nhân viên/admin), phiên lưu trong hotel.db."""
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from agent import db as agent_db
from api.auth import COOKIE_NAME, get_current_identity
from api.schemas import ChangePasswordBody, LoginRequest, MeResponse

router = APIRouter()


@router.post("/api/auth/login", response_model=MeResponse)
def login(body: LoginRequest, response: Response):
    if body.identity_type == "staff":
        role = agent_db.verify_staff_login(body.username, body.password)
        if not role:
            raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu.")
        session_id = agent_db.create_session("staff_account", body.username, role)
        identity_id = body.username
    elif body.identity_type == "guest":
        if not agent_db.verify_guest_login(body.room_id, body.password):
            raise HTTPException(status_code=401, detail="Sai số phòng hoặc mật khẩu.")
        session_id = agent_db.create_session("guest_account", body.room_id, "guest")
        role = "guest"
        identity_id = body.room_id
    else:
        raise HTTPException(status_code=422, detail="identity_type phải là 'staff' hoặc 'guest'.")

    response.set_cookie(COOKIE_NAME, session_id, httponly=True, samesite="lax", max_age=86400)
    return MeResponse(identity_type=body.identity_type, identity_id=identity_id, role=role)


@router.post("/api/auth/logout")
def logout(response: Response,
           session_id: str | None = Cookie(default=None, alias=COOKIE_NAME),
           identity=Depends(get_current_identity)):
    if session_id:
        agent_db.delete_session(session_id)
    response.delete_cookie(COOKIE_NAME)
    return {"message": "Đã đăng xuất."}


@router.get("/api/auth/me", response_model=MeResponse)
def me(identity=Depends(get_current_identity)):
    return MeResponse(**identity)


@router.post("/api/auth/change-password")
def change_password(body: ChangePasswordBody, identity=Depends(get_current_identity)):
    if identity["identity_type"] != "staff_account":
        raise HTTPException(status_code=403, detail="Chỉ tài khoản nhân viên/admin đổi được mật khẩu ở đây.")
    ok = agent_db.change_staff_password(identity["identity_id"], body.old_password, body.new_password)
    if not ok:
        raise HTTPException(status_code=401, detail="Mật khẩu hiện tại không đúng.")
    return {"message": "Đã đổi mật khẩu."}
