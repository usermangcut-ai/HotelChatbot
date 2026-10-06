"""Route /api/me/* — dành cho khách lưu trú đã đăng nhập: gửi yêu cầu hỗ trợ nhanh (gắn với lượt
lưu trú của mình) + xem lịch sử. Chỉ role=guest."""
from fastapi import APIRouter, Depends, HTTPException

from agent import db as agent_db
from api.auth import get_current_identity
from api.schemas import MyRequestBody, StaffRequestRecord

router = APIRouter()


def _require_guest(identity=Depends(get_current_identity)):
    if identity["role"] != "guest":
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    return identity


@router.post("/api/me/requests", response_model=StaffRequestRecord, status_code=201)
def create_my_request(body: MyRequestBody, identity=Depends(_require_guest)):
    return agent_db.create_staff_request(identity["room_id"], body.request_type, body.note,
                                         reservation_id=int(identity["identity_id"]))


@router.get("/api/me/requests", response_model=list[StaffRequestRecord])
def list_my_requests(identity=Depends(_require_guest)):
    return agent_db.list_staff_requests(limit=200, reservation_id=int(identity["identity_id"]))
