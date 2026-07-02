from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.hall import Hall
from app.models.seat import Seat
from app.schemas.hall import HallCreate, HallUpdate


def get_halls(db: Session) -> list[Hall]:
    return list(db.scalars(select(Hall).order_by(Hall.name)))


def get_hall(db: Session, hall_id: int) -> Hall | None:
    return db.get(Hall, hall_id)


def create_hall(db: Session, data: HallCreate) -> Hall:
    hall = Hall(name=data.name, capacity=data.capacity)
    db.add(hall)
    db.flush()  # get hall.id

    # Optionally auto-generate a seat grid.
    if data.rows > 0 and data.seats_per_row > 0:
        row_labels = [chr(ord("A") + i) for i in range(data.rows)]
        for row in row_labels:
            for number in range(1, data.seats_per_row + 1):
                db.add(Seat(hall_id=hall.id, row=row, number=number))
        hall.capacity = data.rows * data.seats_per_row

    db.commit()
    db.refresh(hall)
    return hall


def update_hall(db: Session, hall: Hall, data: HallUpdate) -> Hall:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(hall, field, value)
    db.commit()
    db.refresh(hall)
    return hall


def delete_hall(db: Session, hall: Hall) -> None:
    db.delete(hall)
    db.commit()


def get_seats_for_hall(db: Session, hall_id: int) -> list[Seat]:
    return list(
        db.scalars(
            select(Seat).where(Seat.hall_id == hall_id).order_by(Seat.row, Seat.number)
        )
    )
