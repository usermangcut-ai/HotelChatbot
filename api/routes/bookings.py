"""Route /api/bookings + /api/rooms — bọc create_reservation() (GHI DB thật duy nhất, chỉ chạy khi
khách đã xác nhận thanh toán trên giao diện) và danh mục phòng thật từ knowledge.py."""
from fastapi import APIRouter, HTTPException

from agent import db as agent_db
from agent import knowledge
from api.schemas import BookingRequest, BookingResponse, RoomOption

router = APIRouter()


@router.get("/api/rooms", response_model=list[RoomOption])
def list_rooms():
    return [RoomOption(room_type=t, price_vnd=knowledge.room_price(t))
            for t in knowledge.room_titles()]


@router.post("/api/bookings", response_model=BookingResponse, status_code=201)
def create_booking(body: BookingRequest):
    if body.room_type not in knowledge.room_titles():
        raise HTTPException(status_code=422,
                             detail=f"Hạng phòng '{body.room_type}' không tồn tại.")
    try:
        result = agent_db.create_reservation(
            body.room_type, body.check_in, body.check_out, body.guest_name,
            body.guest_phone, body.guest_email, body.num_guests)
    except agent_db.SoldOutError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except agent_db.InvalidDateRangeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return BookingResponse(**result)
