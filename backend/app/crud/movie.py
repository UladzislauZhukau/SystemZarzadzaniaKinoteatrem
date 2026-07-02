from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.movie import Movie
from app.schemas.movie import MovieCreate, MovieUpdate


def get_movies(db: Session) -> list[Movie]:
    return list(db.scalars(select(Movie).order_by(Movie.title)))


def get_movie(db: Session, movie_id: int) -> Movie | None:
    return db.get(Movie, movie_id)


def create_movie(db: Session, data: MovieCreate) -> Movie:
    movie = Movie(**data.model_dump())
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return movie


def update_movie(db: Session, movie: Movie, data: MovieUpdate) -> Movie:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(movie, field, value)
    db.commit()
    db.refresh(movie)
    return movie


def delete_movie(db: Session, movie: Movie) -> None:
    db.delete(movie)
    db.commit()
