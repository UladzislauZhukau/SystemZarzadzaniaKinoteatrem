from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import hall as hall_crud
from app.db.session import get_db
from app.deps import require_admin
from app.schemas.hall import HallCreate, HallRead, HallUpdate, HallWithSeats, SeatRead

router = APIRouter(prefix="/halls", tags=["halls"])


@router.get("", response_model=list[HallRead])
def list_halls(db: Session = Depends(get_db)):
    return hall_crud.get_halls(db)


@router.get("/{hall_id}", response_model=HallWithSeats)
def get_hall(hall_id: int, db: Session = Depends(get_db)):
    hall = hall_crud.get_hall(db, hall_id)
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    return hall


@router.get("/{hall_id}/seats", response_model=list[SeatRead])
def get_hall_seats(hall_id: int, db: Session = Depends(get_db)):
    if not hall_crud.get_hall(db, hall_id):
        raise HTTPException(status_code=404, detail="Hall not found")
    return hall_crud.get_seats_for_hall(db, hall_id)


@router.post("", response_model=HallWithSeats, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_admin)])
def create_hall(data: HallCreate, db: Session = Depends(get_db)):
    return hall_crud.create_hall(db, data)


@router.put("/{hall_id}", response_model=HallRead,
            dependencies=[Depends(require_admin)])
def update_hall(hall_id: int, data: HallUpdate, db: Session = Depends(get_db)):
    hall = hall_crud.get_hall(db, hall_id)
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    return hall_crud.update_hall(db, hall, data)


@router.delete("/{hall_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
def delete_hall(hall_id: int, db: Session = Depends(get_db)):
    hall = hall_crud.get_hall(db, hall_id)
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    hall_crud.delete_hall(db, hall)
