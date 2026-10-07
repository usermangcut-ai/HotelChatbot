"""Route /api/me/* — dành cho khách lưu trú đã đăng nhập: gửi yêu cầu hỗ trợ nhanh (gắn với lượt
lưu trú của mình) + xem lịch sử. Chỉ role=guest."""
from fastapi import APIRouter, Depends, HTTPException

from agent import db as agent_db
from api.auth import get_current_identity
from api.schemas import MyRequestBody, ServiceRequestRecord, StaffRequestRecord, StayResponse

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


@router.get("/api/me/stay", response_model=StayResponse)
def my_stay(identity=Depends(_require_guest)):
    res = agent_db.get_reservation(int(identity["identity_id"]))
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy kỳ lưu trú.")
    return StayResponse(reservation_id=res["id"], room_id=res["room_id"], room_type=res["room_type"],
                        check_in=res["check_in"], check_out=res["check_out"],
                        num_guests=res["num_guests"], guest_name=res["guest_name"])


@router.get("/api/me/service-requests", response_model=list[ServiceRequestRecord])
def my_service_requests(identity=Depends(_require_guest)):
    return agent_db.list_service_requests(limit=200, reservation_id=int(identity["identity_id"]))
