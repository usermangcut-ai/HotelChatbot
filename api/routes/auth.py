"""Route /api/auth/* — đăng nhập (khách lưu trú hoặc nhân viên/admin), phiên lưu trong hotel.db."""
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from agent import db as agent_db
from agent.config import COOKIE_SECURE
from api.auth import COOKIE_NAME, get_current_identity
from api.schemas import ChangePasswordBody, LoginRequest, MeResponse

router = APIRouter()


@router.post("/api/auth/login", response_model=MeResponse)
def login(body: LoginRequest, response: Response):
    room_id = None
    if body.identity_type == "staff":
        role = agent_db.verify_staff_login(body.username, body.password)
        if not role:
            raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu.")
        identity_id = body.username
        session_id = agent_db.create_session("staff_account", identity_id, role)
    elif body.identity_type == "guest":
        try:
            reservation_id = agent_db.verify_guest_login(body.room_id, body.password)
        except agent_db.StayNotStartedError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc
        if not reservation_id:
            raise HTTPException(status_code=401, detail="Sai số phòng hoặc mật khẩu.")
        role, room_id = "guest", body.room_id
        identity_id = str(reservation_id)
        session_id = agent_db.create_session("guest_account", identity_id, role)
    else:
        raise HTTPException(status_code=422, detail="identity_type phải là 'staff' hoặc 'guest'.")

    response.set_cookie(COOKIE_NAME, session_id, httponly=True, samesite="lax",
                        secure=COOKIE_SECURE, max_age=86400)
    return MeResponse(identity_type=body.identity_type, identity_id=identity_id, role=role,
                      room_id=room_id)


@router.post("/api/auth/logout")
def logout(response: Response,
           session_id: str | None = Cookie(default=None, alias=COOKIE_NAME)):
    """Không đòi phiên còn hiệu lực — khách đã trả phòng (phiên tự hết hạn) vẫn xóa được cookie."""
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
