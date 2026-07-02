import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMovies, getScreenings } from "../api/endpoints";

function formatDate(iso) {
  return new Date(iso).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [screenings, setScreenings] = useState([]);

  useEffect(() => {
    getMovies().then(setMovies).catch(() => {});
    getScreenings().then(setScreenings).catch(() => {});
  }, []);

  // Closest upcoming screenings (backend returns them sorted by start_time asc).
  const upcoming = useMemo(() => {
    const now = Date.now();
    return screenings
      .filter((s) => new Date(s.start_time).getTime() >= now)
      .slice(0, 6);
  }, [screenings]);

  // Build a seamless marquee: repeat the poster list until it is wide enough,
  // then render it twice so the -50% translate loops without a visible jump.
  const ribbon = useMemo(() => {
    if (movies.length === 0) return [];
    const times = Math.max(2, Math.ceil(12 / movies.length));
    const base = Array.from({ length: times }, () => movies).flat();
    return [...base, ...base];
  }, [movies]);

  return (
    <div className="container">
      <div className="hero">
        <h1>System Zarzadzania Kinoteatrem</h1>
        <p className="muted">
          Przegladaj repertuar, rezerwuj miejsca i zarzadzaj kinem w jednym miejscu.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <Link to="/movies" className="btn">
            Zobacz filmy
          </Link>
          <Link to="/screenings" className="btn secondary">
            Repertuar
          </Link>
        </div>
      </div>

      <section className="home-section">
        <div className="row-between">
          <h2>Najbliższe seanse</h2>
          <Link to="/screenings" className="muted">
            Wszystkie seanse &rarr;
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">Brak nadchodzących seansów.</p>
        ) : (
          <div className="grid">
            {upcoming.map((s) => (
              <div key={s.id} className="card">
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
                    Wybierz miejsce
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {ribbon.length > 0 && (
        <section className="home-section">
          <h2>Nasze filmy</h2>
          <div className="marquee">
            <div className="marquee-track">
              {ribbon.map((m, i) => (
                <Link
                  key={`${m.id}-${i}`}
                  to={`/movies/${m.id}`}
                  className="poster-card"
                  title={m.title}
                  aria-hidden={i >= ribbon.length / 2}
                >
                  {m.poster_url ? (
                    <img className="movie-poster" src={m.poster_url} alt={m.title} />
                  ) : (
                    <div className="movie-poster movie-poster-empty">Brak plakatu</div>
                  )}
                  <span className="poster-title">{m.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
