import httpx

from app.core.config import settings


def find_trailer(title: str) -> str | None:
    """Search TMDb for a film by title and return an embeddable YouTube trailer
    URL, or None if unavailable (missing key, no result, network error).

    This is best-effort and never raises: a missing trailer must not block
    adding a film."""
    if not settings.TMDB_API_KEY:
        return None

    try:
        with httpx.Client(timeout=10.0) as http:
            search = http.get(
                f"{settings.TMDB_API_URL}/search/movie",
                params={"api_key": settings.TMDB_API_KEY, "query": title},
            )
            search.raise_for_status()
            results = search.json().get("results") or []
            if not results:
                return None
            movie_id = results[0]["id"]

            videos = http.get(
                f"{settings.TMDB_API_URL}/movie/{movie_id}/videos",
                params={"api_key": settings.TMDB_API_KEY},
            )
            videos.raise_for_status()
            clips = videos.json().get("results") or []
    except (httpx.HTTPError, KeyError, ValueError):
        return None

    youtube = [c for c in clips if c.get("site") == "YouTube" and c.get("key")]
    if not youtube:
        return None

    trailer = next(
        (c for c in youtube if c.get("type") == "Trailer"),
        youtube[0],
    )
    return f"{settings.TMDB_YOUTUBE_EMBED}{trailer['key']}"
