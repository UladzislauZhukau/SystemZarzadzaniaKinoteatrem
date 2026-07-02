import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMovies } from "../api/endpoints";
import "../styles/MoviesPage.css";

const SORTS = {
  title: { label: "Title (A–Z)", cmp: (a, b) => a.title.localeCompare(b.title) },
  title_desc: {
    label: "Title (Z–A)",
    cmp: (a, b) => b.title.localeCompare(a.title),
  },
  rating: { label: "Rating (high→low)", cmp: (a, b) => b.rating - a.rating },
  rating_asc: {
    label: "Rating (low→high)",
    cmp: (a, b) => a.rating - b.rating,
  },
  duration: {
    label: "Duration (short→long)",
    cmp: (a, b) => a.duration_min - b.duration_min,
  },
  duration_desc: {
    label: "Duration (long→short)",
    cmp: (a, b) => b.duration_min - a.duration_min,
  },
};

// A movie's genre is a single string that may bundle several genres
// (e.g. "Action, Adventure, Sci-Fi"); split it into individual ones.
function parseGenres(movie) {
  return (movie.genre || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState("title");

  useEffect(() => {
    getMovies()
      .then(setMovies)
      .finally(() => setLoading(false));
  }, []);

  // Distinct individual genres across all films, for the dropdown.
  const genres = useMemo(
    () =>
      [...new Set(movies.flatMap(parseGenres))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [movies]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movies
      .filter((m) => !q || m.title.toLowerCase().includes(q))
      .filter((m) => !genre || parseGenres(m).includes(genre))
      .sort(SORTS[sort].cmp);
  }, [movies, query, genre, sort]);

  const resetFilters = () => {
    setQuery("");
    setGenre("");
    setSort("title");
  };

  if (loading) return <div className="container">Loading...</div>;

  const filtersActive = query || genre || sort !== "title";

  return (
    <div className="container">
      <h2>Films</h2>

      <div className="filter-bar">
        <div className="filter-field grow">
          <label htmlFor="movie-search">Search</label>
          <input
            id="movie-search"
            type="search"
            placeholder="Search by title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label htmlFor="movie-genre">Genre</label>
          <select
            id="movie-genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="movie-sort">Sort by</label>
          <select
            id="movie-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {filtersActive && (
          <button type="button" className="btn secondary" onClick={resetFilters}>
            Clear
          </button>
        )}
      </div>

      <p className="filter-count">
        {visible.length} of {movies.length} films
      </p>

      {visible.length === 0 && (
        <p className="muted">No films match your filters.</p>
      )}
      <div className="grid">
        {visible.map((m) => (
          <div key={m.id} className="card">
            <Link to={`/movies/${m.id}`} className="movie-poster-link">
              {m.poster_url ? (
                <img src={m.poster_url} alt={m.title} className="movie-poster" />
              ) : (
                <div className="movie-poster movie-poster-empty">No poster</div>
              )}
            </Link>
            <h3>
              <Link to={`/movies/${m.id}`} className="movie-title-link">
                {m.title}
              </Link>
            </h3>
            <div>
              {m.genre && <span className="badge">{m.genre}</span>}
              <span className="badge">{m.duration_min} min</span>
              <span className="badge">★ {m.rating}</span>
            </div>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              {m.description}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <Link to={`/movies/${m.id}`} className="btn small secondary">
                Details
              </Link>
              <Link to={`/screenings?movie=${m.id}`} className="btn small">
                Screenings
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
