"""Route /api/admin/* — CRUD toàn quyền đặt phòng & yêu cầu dịch vụ, chỉ role=admin."""
from fastapi import APIRouter, Depends, HTTPException

from agent import db as agent_db
from api.auth import require_role
from api.schemas import (ReservationRecord, ServiceRequestRecord, StaffAccountBody,
                          StaffAccountRecord, StatusUpdate)

router = APIRouter(dependencies=[Depends(require_role("admin"))])


@router.get("/api/admin/bookings", response_model=list[ReservationRecord])
def list_bookings():
    agent_db.checkout_expired_stays()
    return agent_db.list_reservations(limit=200)


@router.patch("/api/admin/bookings/{booking_id}", response_model=dict)
def update_booking(booking_id: int, body: StatusUpdate):
    ok = agent_db.update_reservation_status(booking_id, body.status)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt phòng.")
    return {"id": booking_id, "status": body.status}


@router.delete("/api/admin/bookings/{booking_id}", response_model=dict)
def delete_booking(booking_id: int):
    ok = agent_db.delete_reservation(booking_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy đặt phòng.")
    return {"message": "Đã xóa."}


@router.get("/api/admin/service-requests", response_model=list[ServiceRequestRecord])
def list_admin_service_requests():
    return agent_db.list_service_requests(limit=200)


@router.patch("/api/admin/service-requests/{request_id}", response_model=dict)
def update_admin_service_request(request_id: int, body: StatusUpdate):
    ok = agent_db.update_service_request_status(request_id, body.status)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu dịch vụ.")
    return {"id": request_id, "status": body.status}


@router.delete("/api/admin/service-requests/{request_id}", response_model=dict)
def delete_admin_service_request(request_id: int):
    ok = agent_db.delete_service_request(request_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu dịch vụ.")
    return {"message": "Đã xóa."}


@router.get("/api/admin/staff-accounts", response_model=list[StaffAccountRecord])
def list_staff_accounts():
    return agent_db.list_staff_accounts()


@router.post("/api/admin/staff-accounts", response_model=StaffAccountRecord, status_code=201)
def create_staff_account(body: StaffAccountBody):
    if body.role not in ("staff", "admin"):
        raise HTTPException(status_code=422, detail="role phải là 'staff' hoặc 'admin'.")
    try:
        result = agent_db.create_staff_account(body.username, body.password, body.role)
    except agent_db.DuplicateUsernameError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    return StaffAccountRecord(**result)


@router.delete("/api/admin/staff-accounts/{username}", response_model=dict)
def delete_staff_account(username: str):
    ok = agent_db.delete_staff_account(username)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
    return {"message": "Đã xóa."}
