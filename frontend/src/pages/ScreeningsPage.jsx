import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getScreenings } from "../api/endpoints";
import AutocompleteInput from "../components/AutocompleteInput";
import "../styles/ScreeningsPage.css";

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Local "YYYY-MM-DD" key, to compare a screening against the date picker value.
function toDateKey(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// One card per film, with a picker for its individual showtimes.
function FilmCard({ movie, showtimes }) {
  const [selectedId, setSelectedId] = useState(showtimes[0].id);

  // Filters can change the available showtimes; keep the selection valid.
  useEffect(() => {
    if (!showtimes.some((s) => s.id === selectedId)) {
      setSelectedId(showtimes[0].id);
    }
  }, [showtimes, selectedId]);

  const selected = showtimes.find((s) => s.id === selectedId) || showtimes[0];

  return (
    <div className="card">
      <Link to={`/movies/${movie.id}`} className="movie-poster-link">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="movie-poster"
          />
        ) : (
          <div className="movie-poster movie-poster-empty">No poster</div>
        )}
      </Link>
      <h3>{movie.title}</h3>
      <p className="muted" style={{ margin: "4px 0" }}>
        {showtimes.length} showtime{showtimes.length > 1 ? "s" : ""}
      </p>

      <label htmlFor={`showtime-${movie.id}`}>Choose a showtime</label>
      <select
        id={`showtime-${movie.id}`}
        value={selected.id}
        onChange={(e) => setSelectedId(Number(e.target.value))}
      >
        {showtimes.map((s) => (
          <option key={s.id} value={s.id}>
            {formatDate(s.start_time)} — {s.hall.name}
          </option>
        ))}
      </select>

      <div style={{ marginTop: 10 }}>
        <span className="badge">{selected.hall.name}</span>
        <span className="badge">{selected.ticket_price} PLN</span>
      </div>
      <div style={{ marginTop: 12 }}>
        <Link to={`/reserve/${selected.id}`} className="btn small">
          Choose a seat
        </Link>
      </div>
    </div>
  );
}

export default function ScreeningsPage() {
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const movieId = searchParams.get("movie");

  const [query, setQuery] = useState("");
  const [hall, setHall] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setLoading(true);
    getScreenings(movieId ? Number(movieId) : undefined)
      .then(setScreenings)
      .finally(() => setLoading(false));
  }, [movieId]);

  const halls = useMemo(
    () =>
      [...new Set(screenings.map((s) => s.hall.name))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [screenings]
  );

  // Distinct film titles, for the search input's autocomplete suggestions.
  const titles = useMemo(
    () =>
      [...new Set(screenings.map((s) => s.movie.title))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [screenings]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return screenings
      .filter((s) => !q || s.movie.title.toLowerCase().includes(q))
      .filter((s) => !hall || s.hall.name === hall)
      .filter((s) => !date || toDateKey(s.start_time) === date);
  }, [screenings, query, hall, date]);

  // Group the visible showtimes by film, each group sorted chronologically.
  const films = useMemo(() => {
    const byMovie = new Map();
    for (const s of visible) {
      if (!byMovie.has(s.movie.id)) {
        byMovie.set(s.movie.id, { movie: s.movie, showtimes: [] });
      }
      byMovie.get(s.movie.id).showtimes.push(s);
    }
    return [...byMovie.values()]
      .map((g) => ({
        ...g,
        showtimes: g.showtimes
          .slice()
          .sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
      }))
      .sort((a, b) => a.movie.title.localeCompare(b.movie.title));
  }, [visible]);

  const resetFilters = () => {
    setQuery("");
    setHall("");
    setDate("");
  };

  if (loading) return <div className="container">Loading...</div>;

  const title =
    movieId && screenings.length > 0
      ? `Screenings: ${screenings[0].movie.title}`
      : "Schedule / Screenings";

  const filtersActive = query || hall || date;

  return (
    <div className="container">
      <h2>{title}</h2>
      {movieId && (
        <Link to="/screenings" className="muted">
          &larr; All screenings
        </Link>
      )}

      <div className="filter-bar">
        <div className="filter-field grow">
          <label htmlFor="scr-search">Search</label>
          <AutocompleteInput
            id="scr-search"
            placeholder="Search by film..."
            value={query}
            onChange={setQuery}
            options={titles}
            historyKey="screenings"
          />
        </div>
        <div className="filter-field">
          <label htmlFor="scr-hall">Hall</label>
          <select
            id="scr-hall"
            value={hall}
            onChange={(e) => setHall(e.target.value)}
          >
            <option value="">All halls</option>
            {halls.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label htmlFor="scr-date">Date</label>
          <input
            id="scr-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {filtersActive && (
          <button type="button" className="btn secondary" onClick={resetFilters}>
            Clear
          </button>
        )}
      </div>

      <p className="filter-count">
        {films.length} film{films.length === 1 ? "" : "s"} · {visible.length}{" "}
        showtime{visible.length === 1 ? "" : "s"}
      </p>

      {films.length === 0 && (
        <p className="muted">No screenings match your filters.</p>
      )}
      <div className="grid">
        {films.map((f) => (
          <FilmCard
            key={f.movie.id}
            movie={f.movie}
            showtimes={f.showtimes}
          />
        ))}
      </div>
    </div>
  );
}
