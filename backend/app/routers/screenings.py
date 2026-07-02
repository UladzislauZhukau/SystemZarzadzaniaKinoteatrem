from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud import screening as screening_crud
from app.db.session import get_db
from app.deps import require_admin
from app.models.reservation import Reservation
from app.models.seat import Seat
from app.schemas.hall import SeatRead, SeatStatus
from app.schemas.screening import (
    ScreeningCreate,
    ScreeningDetail,
    ScreeningRead,
    ScreeningUpdate,
)

router = APIRouter(prefix="/screenings", tags=["screenings"])


@router.get("", response_model=list[ScreeningDetail])
def list_screenings(movie_id: int | None = None, db: Session = Depends(get_db)):
    return screening_crud.get_screenings(db, movie_id)


@router.get("/{screening_id}", response_model=ScreeningDetail)
def get_screening(screening_id: int, db: Session = Depends(get_db)):
    screening = screening_crud.get_screening(db, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    return screening


@router.get("/{screening_id}/available-seats", response_model=list[SeatRead])
def available_seats(screening_id: int, db: Session = Depends(get_db)):
    screening = screening_crud.get_screening(db, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    taken = select(Reservation.seat_id).where(
        Reservation.screening_id == screening_id,
        Reservation.status == "confirmed",
    )
    stmt = (
        select(Seat)
        .where(Seat.hall_id == screening.hall_id, Seat.id.not_in(taken))
        .order_by(Seat.row, Seat.number)
    )
    return list(db.scalars(stmt))


@router.get("/{screening_id}/seatmap", response_model=list[SeatStatus])
def seatmap(screening_id: int, db: Session = Depends(get_db)):
    """Return every seat in the hall with a `taken` flag, so the client can
    render the full layout (screen + occupied/free seats)."""
    screening = screening_crud.get_screening(db, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")

    taken_ids = set(
        db.scalars(
            select(Reservation.seat_id).where(
                Reservation.screening_id == screening_id,
                Reservation.status == "confirmed",
            )
        )
    )
    seats = db.scalars(
        select(Seat)
        .where(Seat.hall_id == screening.hall_id)
        .order_by(Seat.row, Seat.number)
    )
    return [
        SeatStatus(id=s.id, row=s.row, number=s.number, taken=s.id in taken_ids)
        for s in seats
    ]


@router.post("", response_model=ScreeningRead, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_admin)])
def create_screening(data: ScreeningCreate, db: Session = Depends(get_db)):
    return screening_crud.create_screening(db, data)


@router.put("/{screening_id}", response_model=ScreeningRead,
            dependencies=[Depends(require_admin)])
def update_screening(screening_id: int, data: ScreeningUpdate, db: Session = Depends(get_db)):
    screening = screening_crud.get_screening(db, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    return screening_crud.update_screening(db, screening, data)


@router.delete("/{screening_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
def delete_screening(screening_id: int, db: Session = Depends(get_db)):
    screening = screening_crud.get_screening(db, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    screening_crud.delete_screening(db, screening)
