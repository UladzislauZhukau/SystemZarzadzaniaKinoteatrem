from pydantic import BaseModel, ConfigDict


class MovieBase(BaseModel):
    title: str
    genre: str | None = None
    description: str | None = None
    duration_min: int = 90
    rating: float = 0.0
    poster_url: str | None = None
    trailer_url: str | None = None


class MovieCreate(MovieBase):
    pass


class MovieUpdate(BaseModel):
    title: str | None = None
    genre: str | None = None
    description: str | None = None
    duration_min: int | None = None
    rating: float | None = None
    poster_url: str | None = None
    trailer_url: str | None = None


class MovieRead(MovieBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


class MovieSuggestion(BaseModel):
    """A single IMDb search hit for the admin autofill autocomplete."""

    title: str
    year: str | None = None
    imdb_id: str
    poster_url: str | None = None
