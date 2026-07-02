from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.movie import Movie
from app.models.screening import Screening
from app.schemas.screening import ScreeningCreate, ScreeningUpdate


class ScreeningError(Exception):
    """Raised for business-rule violations while scheduling screenings."""


def _to_naive_utc(dt: datetime) -> datetime:
    """Normalize to a naive UTC datetime. The client sends aware timestamps
    (e.g. '...Z'), while values loaded from the DB are naive; without this,
    comparing the two raises a TypeError."""
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def get_screenings(db: Session, movie_id: int | None = None) -> list[Screening]:
    stmt = select(Screening).order_by(Screening.start_time)
    if movie_id is not None:
        stmt = stmt.where(Screening.movie_id == movie_id)
    return list(db.scalars(stmt))


def get_screening(db: Session, screening_id: int) -> Screening | None:
    return db.get(Screening, screening_id)


def _has_hall_conflict(
    db: Session,
    hall_id: int,
    start_time: datetime,
    duration_min: int,
    exclude_id: int | None = None,
) -> bool:
    """True if another screening already occupies `hall_id` during the window
    [start_time, start_time + duration_min). Each existing screening's window is
    derived from its own movie's duration."""
    start_time = _to_naive_utc(start_time)
    new_end = start_time + timedelta(minutes=duration_min)
    stmt = (
        select(Screening, Movie.duration_min)
        .join(Movie, Screening.movie_id == Movie.id)
        .where(Screening.hall_id == hall_id)
    )
    if exclude_id is not None:
        stmt = stmt.where(Screening.id != exclude_id)
    for existing, existing_duration in db.execute(stmt):
        existing_start = _to_naive_utc(existing.start_time)
        existing_end = existing_start + timedelta(minutes=existing_duration)
        # Half-open intervals overlap when each starts before the other ends;
        # touching back-to-back (one ends exactly when the next starts) is allowed.
        if start_time < existing_end and existing_start < new_end:
            return True
    return False


def create_screening(db: Session, data: ScreeningCreate) -> Screening:
    movie = db.get(Movie, data.movie_id)
    if movie is None:
        raise ScreeningError("Movie not found.")
    if _has_hall_conflict(db, data.hall_id, data.start_time, movie.duration_min):
        raise ScreeningError(
            "This hall already has a screening scheduled during that time."
        )
    screening = Screening(**data.model_dump())
    db.add(screening)
    db.commit()
    db.refresh(screening)
    return screening


def update_screening(db: Session, screening: Screening, data: ScreeningUpdate) -> Screening:
    values = data.model_dump(exclude_unset=True)
    # Resolve the effective hall/time/movie after the update to re-check overlap.
    hall_id = values.get("hall_id", screening.hall_id)
    start_time = values.get("start_time", screening.start_time)
    movie_id = values.get("movie_id", screening.movie_id)
    movie = db.get(Movie, movie_id)
    if movie is None:
        raise ScreeningError("Movie not found.")
    if _has_hall_conflict(
        db, hall_id, start_time, movie.duration_min, exclude_id=screening.id
    ):
        raise ScreeningError(
            "This hall already has a screening scheduled during that time."
        )

    for field, value in values.items():
        setattr(screening, field, value)
    db.commit()
    db.refresh(screening)
    return screening


def delete_screening(db: Session, screening: Screening) -> None:
    db.delete(screening)
    db.commit()
