from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=10)
    comment: str | None = None


class ReviewRead(BaseModel):
    id: int
    rating: int
    comment: str | None
    created_at: datetime
    author_name: str


class MovieReviews(BaseModel):
    average: float
    count: int
    items: list[ReviewRead]
