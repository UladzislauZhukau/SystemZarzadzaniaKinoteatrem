from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.review import Review
from app.schemas.review import MovieReviews, ReviewCreate, ReviewRead, ReviewUpdate


def get_reviews(db: Session, movie_id: int) -> MovieReviews:
    rows = (
        db.execute(
            select(Review, Customer.name)
            .join(Customer, Review.customer_id == Customer.id)
            .where(Review.movie_id == movie_id)
            .order_by(Review.created_at.desc())
        )
        .all()
    )

    items = [
        ReviewRead(
            id=review.id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            author_name=author_name,
            customer_id=review.customer_id,
        )
        for review, author_name in rows
    ]

    count = len(items)
    average = round(sum(item.rating for item in items) / count, 2) if count else 0.0

    return MovieReviews(average=average, count=count, items=items)


def get_review(db: Session, review_id: int) -> Review | None:
    return db.get(Review, review_id)


def update_review(db: Session, review: Review, data: ReviewUpdate) -> Review:
    review.rating = data.rating
    review.comment = data.comment
    db.commit()
    db.refresh(review)
    return review


def delete_review(db: Session, review: Review) -> None:
    db.delete(review)
    db.commit()


def upsert_review(
    db: Session, movie_id: int, customer: Customer, data: ReviewCreate
) -> Review:
    existing = db.execute(
        select(Review).where(
            Review.movie_id == movie_id,
            Review.customer_id == customer.id,
        )
    ).scalar_one_or_none()

    if existing:
        existing.rating = data.rating
        existing.comment = data.comment
        db.commit()
        db.refresh(existing)
        return existing

    review = Review(
        movie_id=movie_id,
        customer_id=customer.id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
