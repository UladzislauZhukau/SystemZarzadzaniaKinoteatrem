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


def lookup_movie(title: str | None = None, imdb_id: str | None = None) -> dict:
    """Look up a film on the OMDb API (IMDb data) by exact title or IMDb id and
    return a normalized dict ready to populate a MovieBase. Prefer `imdb_id`
    when known (e.g. picked from a search suggestion) for an exact match.
    Raises OMDbError on missing key, network problems, or when not found."""
    if not settings.OMDB_API_KEY:
        raise OMDbError(
            "OMDb API key is not configured. Set OMDB_API_KEY in the environment."
        )
    if not imdb_id and not title:
        raise OMDbError("Provide a film title or IMDb id to look up.")

    params = {"apikey": settings.OMDB_API_KEY}
    if imdb_id:
        params["i"] = imdb_id
    else:
        params["t"] = title
        params["type"] = "movie"

    try:
        response = httpx.get(settings.OMDB_URL, params=params, timeout=10.0)
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


def search_movies(query: str, limit: int = 8) -> list[dict]:
    """Search OMDb by title and return a list of candidate films
    (title, year, imdb_id, poster) for the admin autocomplete. Best-effort:
    returns [] when the key is missing, on network errors, or no matches."""
    if not settings.OMDB_API_KEY or not query.strip():
        return []

    try:
        response = httpx.get(
            settings.OMDB_URL,
            params={"apikey": settings.OMDB_API_KEY, "s": query, "type": "movie"},
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError:
        return []

    if data.get("Response") == "False":
        return []

    return [
        {
            "title": item.get("Title"),
            "year": _clean(item.get("Year")),
            "imdb_id": item.get("imdbID"),
            "poster_url": _clean(item.get("Poster")),
        }
        for item in (data.get("Search") or [])[:limit]
        if item.get("imdbID")
    ]
