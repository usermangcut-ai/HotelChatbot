"""Pydantic request/response models cho API — 1 file dùng chung cho mọi route."""
from datetime import date
from typing import Any

from pydantic import BaseModel, Field, field_validator

from agent import clock


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    tool_calls: list[dict[str, Any]]
    tool_results: list[str]


class RoomOption(BaseModel):
    room_type: str
    price_vnd: int


class BookingRequest(BaseModel):
    room_type: str
    check_in: str
    check_out: str
    guest_name: str
    guest_phone: str
    guest_email: str
    num_guests: int = Field(ge=1)

    @field_validator("check_in", "check_out")
    @classmethod
    def _valid_date_format(cls, v: str) -> str:
        try:
            parsed = date.fromisoformat(v)
        except ValueError:
            raise ValueError("Ngày phải đúng định dạng YYYY-MM-DD") from None
        if parsed <= clock.today():
            raise ValueError("Ngày nhận/trả phòng phải sau ngày hiện tại")
        return v

    @field_validator("check_out")
    @classmethod
    def _check_out_after_check_in(cls, v: str, info) -> str:
        check_in = info.data.get("check_in")
        if check_in and v <= check_in:
            raise ValueError("Ngày trả phòng phải sau ngày nhận phòng")
        return v


class BookingResponse(BaseModel):
    id: int
    room_type: str
    check_in: str
    check_out: str
    status: str
    room_id: str | None = None
    guest_password: str | None = None


class ServiceRequestBody(BaseModel):
    service_type: str
    requested_at: str
    party_size: int | None = Field(default=None, ge=1)
    note: str = ""


class ServiceRequestResponse(BaseModel):
    id: int
    service_type: str
    status: str


class LoginRequest(BaseModel):
    identity_type: str  # "staff" | "guest"
    username: str = ""       # dùng khi identity_type == "staff"
    room_id: str = ""        # dùng khi identity_type == "guest"
    password: str


class MeResponse(BaseModel):
    identity_type: str
    identity_id: str
    role: str
    room_id: str | None = None   # chỉ có với khách lưu trú


class StaffAccountBody(BaseModel):
    username: str
    password: str
    role: str  # "staff" | "admin"


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str = Field(min_length=4)


class StaffAccountRecord(BaseModel):
    username: str
    role: str
    created_at: str


class ReservationRecord(BaseModel):
    id: int
    room_type: str
    check_in: str
    check_out: str
    guest_name: str | None = None
    guest_phone: str | None = None
    guest_email: str | None = None
    num_guests: int | None = None
    status: str
    created_at: str
    room_id: str | None = None


class ServiceRequestRecord(BaseModel):
    id: int
    service_type: str
    guest_name: str | None = None
    guest_phone: str | None = None
    requested_at: str | None = None
    party_size: int | None = None
    note: str | None = None
    status: str
    created_at: str


class StatusUpdate(BaseModel):
    status: str


class StaffRequestRecord(BaseModel):
    id: int
    room_id: str | None = None
    request_type: str
    note: str | None = None
    status: str
    created_at: str


class MyRequestBody(BaseModel):
    request_type: str
    note: str = ""
