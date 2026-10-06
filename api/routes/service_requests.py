"""Route /api/service-requests — bọc create_service_request(). Không thanh toán/QR, khác đặt phòng.
Chỉ khách ĐANG LƯU TRÚ (đã đăng nhập tài khoản khách, được cấp sau khi đặt phòng) mới đặt được nhà
hàng/spa — khách vãng lai chưa thuê phòng không có quyền này (giống /api/me/requests). guest_name/
guest_phone lấy tự động từ booking (lượt lưu trú) của phiên đăng nhập, không bắt khách gõ lại."""
from fastapi import APIRouter, Depends, HTTPException

from agent import db as agent_db
from agent.tools import SERVICE_TYPES
from api.auth import require_role
from api.schemas import ServiceRequestBody, ServiceRequestResponse

router = APIRouter()


@router.post("/api/service-requests", response_model=ServiceRequestResponse, status_code=201)
def create_service_request(body: ServiceRequestBody, identity=Depends(require_role("guest"))):
    if body.service_type not in SERVICE_TYPES:
        raise HTTPException(status_code=422,
                             detail=f"Loại dịch vụ '{body.service_type}' không được hỗ trợ.")
    reservation_id = int(identity["identity_id"])
    guest_name, guest_phone = agent_db.get_guest_contact(reservation_id)
    result = agent_db.create_service_request(
        body.service_type, guest_name, guest_phone, body.requested_at, body.party_size, body.note,
        reservation_id=reservation_id)
    return ServiceRequestResponse(**result)
