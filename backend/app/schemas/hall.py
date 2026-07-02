from pydantic import BaseModel, ConfigDict


class SeatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hall_id: int
    row: str
    number: int


class SeatStatus(BaseModel):
    id: int
    row: str
    number: int
    taken: bool


class HallBase(BaseModel):
    name: str
    capacity: int = 0


class HallCreate(HallBase):
    # Optionally auto-generate seats: number of rows and seats per row
    rows: int = 0
    seats_per_row: int = 0


class HallUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = None


class HallRead(HallBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class HallWithSeats(HallRead):
    seats: list[SeatRead] = []
