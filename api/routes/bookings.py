"""Route /api/bookings + /api/rooms — bọc create_reservation() (GHI DB thật duy nhất, chỉ chạy khi
khách đã xác nhận thanh toán trên giao diện) và danh mục phòng (thông số từ knowledge.json, số phòng từ bảng rooms)."""
import os

from fastapi import APIRouter, HTTPException

from agent import db as agent_db
from agent import knowledge
from agent import photos
from api.schemas import BookingRequest, BookingResponse, RoomOption

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
            image_url="/images/" + os.path.basename(path) if path else None,
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
