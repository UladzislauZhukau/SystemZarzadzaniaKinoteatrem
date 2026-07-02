import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMovies } from "../api/endpoints";
import "../styles/MoviesPage.css";

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMovies()
      .then(setMovies)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>Films</h2>
      {movies.length === 0 && <p className="muted">No films.</p>}
      <div className="grid">
        {movies.map((m) => (
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
