import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getScreenings } from "../api/endpoints";
import "../styles/ScreeningsPage.css";

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ScreeningsPage() {
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const movieId = searchParams.get("movie");

  useEffect(() => {
    setLoading(true);
    getScreenings(movieId ? Number(movieId) : undefined)
      .then(setScreenings)
      .finally(() => setLoading(false));
  }, [movieId]);

  if (loading) return <div className="container">Loading...</div>;

  const title =
    movieId && screenings.length > 0
      ? `Screenings: ${screenings[0].movie.title}`
      : "Schedule / Screenings";

  return (
    <div className="container">
      <h2>{title}</h2>
      {movieId && (
        <Link to="/screenings" className="muted">
          &larr; All screenings
        </Link>
      )}
      {screenings.length === 0 && <p className="muted">No screenings.</p>}
      <div className="grid">
        {screenings.map((s) => (
          <div key={s.id} className="card">
            <Link to={`/movies/${s.movie.id}`} className="movie-poster-link">
              {s.movie.poster_url ? (
                <img
                  src={s.movie.poster_url}
                  alt={s.movie.title}
                  className="movie-poster"
                />
              ) : (
                <div className="movie-poster movie-poster-empty">No poster</div>
              )}
            </Link>
            <h3>{s.movie.title}</h3>
            <p className="muted" style={{ margin: "4px 0" }}>
              {formatDate(s.start_time)}
            </p>
            <div>
              <span className="badge">{s.hall.name}</span>
              <span className="badge">{s.ticket_price} PLN</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <Link to={`/reserve/${s.id}`} className="btn small">
                Choose a seat
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
