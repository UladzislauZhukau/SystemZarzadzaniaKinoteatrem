from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.crud import movie as movie_crud
from app.crud import review as review_crud
from app.db.session import get_db
from app.deps import get_current_user, require_admin
from app.models.customer import Customer
from app.schemas.movie import MovieBase, MovieCreate, MovieRead, MovieUpdate
from app.schemas.review import MovieReviews, ReviewCreate, ReviewRead, ReviewUpdate
from app.services import omdb, tmdb

router = APIRouter(prefix="/movies", tags=["movies"])


@router.get("", response_model=list[MovieRead])
def list_movies(db: Session = Depends(get_db)):
    return movie_crud.get_movies(db)


@router.get("/lookup", response_model=MovieBase, dependencies=[Depends(require_admin)])
def lookup_movie(title: str):
    """Fetch film metadata (poster, plot, genre, runtime, rating) from OMDb
    (IMDb data). Returns unsaved data for the admin form to auto-fill."""
    try:
        data = omdb.lookup_movie(title)
    except omdb.OMDbError as exc:
        message = str(exc)
        code = 404 if "not found" in message.lower() else 502
        raise HTTPException(status_code=code, detail=message)

    data["trailer_url"] = tmdb.find_trailer(data.get("title") or title)
    return data


@router.get("/{movie_id}", response_model=MovieRead)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    movie = movie_crud.get_movie(db, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


@router.post("", response_model=MovieRead, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_admin)])
def create_movie(data: MovieCreate, db: Session = Depends(get_db)):
    return movie_crud.create_movie(db, data)


@router.put("/{movie_id}", response_model=MovieRead,
            dependencies=[Depends(require_admin)])
def update_movie(movie_id: int, data: MovieUpdate, db: Session = Depends(get_db)):
    movie = movie_crud.get_movie(db, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie_crud.update_movie(db, movie, data)


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_admin)])
def delete_movie(movie_id: int, db: Session = Depends(get_db)):
    movie = movie_crud.get_movie(db, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    movie_crud.delete_movie(db, movie)


@router.get("/{movie_id}/reviews", response_model=MovieReviews)
def list_reviews(movie_id: int, db: Session = Depends(get_db)):
    return review_crud.get_reviews(db, movie_id)


@router.post("/{movie_id}/reviews", response_model=ReviewRead,
             status_code=status.HTTP_201_CREATED)
def create_review(
    movie_id: int,
    data: ReviewCreate,
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    movie = movie_crud.get_movie(db, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    review = review_crud.upsert_review(db, movie_id, current_user, data)
    return ReviewRead(
        id=review.id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        author_name=current_user.name,
        customer_id=review.customer_id,
    )


def _get_owned_review(
    movie_id: int, review_id: int, current_user: Customer, db: Session
):
    """Load a review, enforcing that it belongs to `movie_id` and that the
    current user may modify it (its author or an admin)."""
    review = review_crud.get_review(db, review_id)
    if not review or review.movie_id != movie_id:
        raise HTTPException(status_code=404, detail="Review not found")
    if review.customer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only modify your own reviews.",
        )
    return review


@router.put("/{movie_id}/reviews/{review_id}", response_model=ReviewRead)
def update_review(
    movie_id: int,
    review_id: int,
    data: ReviewUpdate,
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = _get_owned_review(movie_id, review_id, current_user, db)
    review = review_crud.update_review(db, review, data)
    return ReviewRead(
        id=review.id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        author_name=review.customer.name,
        customer_id=review.customer_id,
    )


@router.delete("/{movie_id}/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    movie_id: int,
    review_id: int,
    current_user: Customer = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = _get_owned_review(movie_id, review_id, current_user, db)
    review_crud.delete_review(db, review)
