from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.screening import ScreeningDetail
from app.schemas.hall import SeatRead


class ReservationCreate(BaseModel):
    screening_id: int
    seat_id: int


class GuestReservationCreate(BaseModel):
    screening_id: int
    seat_id: int
    email: EmailStr


class BulkReservationCreate(BaseModel):
    screening_id: int
    seat_ids: list[int]


class GuestBulkReservationCreate(BaseModel):
    screening_id: int
    seat_ids: list[int]
    email: EmailStr


class ReservationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    screening_id: int
    seat_id: int
    status: str
    created_at: datetime
    price: Decimal
    discount_applied: Decimal


class ReservationDetail(ReservationRead):
    screening: ScreeningDetail
    seat: SeatRead
