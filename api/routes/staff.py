"""Route /api/staff/* — hàng đợi xử lý (yêu cầu dịch vụ + hỗ trợ chung), chỉ role=staff hoặc admin."""
from fastapi import APIRouter, Depends, HTTPException

from agent import db as agent_db
from api.auth import get_current_identity
from api.schemas import ServiceRequestRecord, StaffRequestRecord, StatusUpdate

router = APIRouter()


def _require_staff_or_admin(identity=Depends(get_current_identity)):
    if identity["role"] not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập.")
    return identity


@router.get("/api/staff/service-requests", response_model=list[ServiceRequestRecord])
def list_service_requests(identity=Depends(_require_staff_or_admin)):
    return agent_db.list_service_requests(limit=200)


@router.patch("/api/staff/service-requests/{request_id}", response_model=dict)
def mark_service_request(request_id: int, body: StatusUpdate,
                          identity=Depends(_require_staff_or_admin)):
    ok = agent_db.update_service_request_status(request_id, body.status)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu dịch vụ.")
    return {"id": request_id, "status": body.status}


@router.get("/api/staff/requests", response_model=list[StaffRequestRecord])
def list_staff_requests(identity=Depends(_require_staff_or_admin)):
    return agent_db.list_staff_requests(limit=200)


@router.patch("/api/staff/requests/{request_id}", response_model=dict)
def mark_staff_request(request_id: int, body: StatusUpdate,
                        identity=Depends(_require_staff_or_admin)):
    ok = agent_db.update_staff_request_status(request_id, body.status)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu.")
    return {"id": request_id, "status": body.status}
