from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.screening import Screening
from app.schemas.screening import ScreeningCreate, ScreeningUpdate


def get_screenings(db: Session, movie_id: int | None = None) -> list[Screening]:
    stmt = select(Screening).order_by(Screening.start_time)
    if movie_id is not None:
        stmt = stmt.where(Screening.movie_id == movie_id)
    return list(db.scalars(stmt))


def get_screening(db: Session, screening_id: int) -> Screening | None:
    return db.get(Screening, screening_id)


def create_screening(db: Session, data: ScreeningCreate) -> Screening:
    screening = Screening(**data.model_dump())
    db.add(screening)
    db.commit()
    db.refresh(screening)
    return screening


def update_screening(db: Session, screening: Screening, data: ScreeningUpdate) -> Screening:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(screening, field, value)
    db.commit()
    db.refresh(screening)
    return screening


def delete_screening(db: Session, screening: Screening) -> None:
    db.delete(screening)
    db.commit()
