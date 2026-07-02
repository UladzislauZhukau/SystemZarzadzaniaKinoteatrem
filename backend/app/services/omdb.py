import re

import httpx

from app.core.config import settings


class OMDbError(Exception):
    """Raised when the OMDb lookup cannot be completed."""


def _parse_runtime(value: str | None) -> int:
    if not value:
        return 90
    match = re.search(r"\d+", value)
    return int(match.group()) if match else 90


def _parse_rating(value: str | None) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _clean(value: str | None) -> str | None:
    if value is None or value == "N/A":
        return None
    return value


def lookup_movie(title: str) -> dict:
    """Look up a film by title on the OMDb API (IMDb data) and return a
    normalized dict ready to populate a MovieBase. Raises OMDbError on
    missing key, network problems, or when the film is not found."""
    if not settings.OMDB_API_KEY:
        raise OMDbError(
            "OMDb API key is not configured. Set OMDB_API_KEY in the environment."
        )

    try:
        response = httpx.get(
            settings.OMDB_URL,
            params={"apikey": settings.OMDB_API_KEY, "t": title, "type": "movie"},
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        raise OMDbError(f"Could not reach OMDb: {exc}") from exc

    if data.get("Response") == "False":
        raise OMDbError(data.get("Error", "Movie not found."))

    return {
        "title": data.get("Title") or title,
        "genre": _clean(data.get("Genre")),
        "description": _clean(data.get("Plot")),
        "duration_min": _parse_runtime(data.get("Runtime")),
        "rating": _parse_rating(data.get("imdbRating")),
        "poster_url": _clean(data.get("Poster")),
    }
