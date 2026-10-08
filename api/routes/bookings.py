"""Route /api/bookings + /api/rooms — bọc create_reservation() (GHI DB thật duy nhất, chỉ chạy khi
khách đã xác nhận thanh toán trên giao diện) và danh mục phòng (thông số từ knowledge.json, số phòng từ bảng rooms)."""
import os
from datetime import date

from fastapi import APIRouter, HTTPException, Query

from agent import db as agent_db
from agent import knowledge
from agent import photos
from api.schemas import AvailabilityResponse, BookingRequest, BookingResponse, RoomOption

router = APIRouter()


@router.get("/api/rooms", response_model=list[RoomOption])
def list_rooms():
    totals = agent_db.room_totals()
    out = []
    for room in knowledge.load()["rooms"]["types"]:
        fields, title = room["fields"], room["title"]
        path = photos.photo_path(title)
        out.append(RoomOption(
            room_type=title, price_vnd=fields["price_vnd"], size_m2=fields["size_m2"],
            max_occupancy=fields["max_occupancy"], view=fields["view"], bed_type=fields["bed_type"],
            image_url=photos.photo_url(path) if path else None,
            total_rooms=totals.get(title, 0)))
    return out


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


@router.get("/api/availability", response_model=AvailabilityResponse)
def availability(room_type: str, check_in: str = Query(...), check_out: str = Query(...)):
    """Số phòng còn trống của MỘT hạng cho khoảng ngày — trang đặt phòng gọi trước khi khách điền thông tin."""
    if room_type not in knowledge.room_titles():
        raise HTTPException(status_code=422, detail=f"Hạng phòng '{room_type}' không tồn tại.")
    try:
        ci, co = date.fromisoformat(check_in), date.fromisoformat(check_out)
    except ValueError:
        raise HTTPException(status_code=422, detail="Ngày phải đúng định dạng YYYY-MM-DD.") from None
    if co <= ci:
        raise HTTPException(status_code=422, detail="Ngày trả phòng phải sau ngày nhận phòng.")
    count = agent_db.available_counts([room_type], check_in, check_out)[room_type]
    return AvailabilityResponse(room_type=room_type, check_in=check_in, check_out=check_out, available=count)
