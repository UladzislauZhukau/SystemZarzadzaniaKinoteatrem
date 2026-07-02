from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.movie import MovieRead
from app.schemas.hall import HallRead


class ScreeningBase(BaseModel):
    movie_id: int
    hall_id: int
    start_time: datetime
    ticket_price: Decimal = Decimal("0")


class ScreeningCreate(ScreeningBase):
    pass


class ScreeningUpdate(BaseModel):
    movie_id: int | None = None
    hall_id: int | None = None
    start_time: datetime | None = None
    ticket_price: Decimal | None = None


class ScreeningRead(ScreeningBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ScreeningDetail(ScreeningRead):
    movie: MovieRead
    hall: HallRead
