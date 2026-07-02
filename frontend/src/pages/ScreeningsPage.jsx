import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getScreenings } from "../api/endpoints";

function formatDate(iso) {
  return new Date(iso).toLocaleString("pl-PL", {
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

  if (loading) return <div className="container">Ładowanie...</div>;

  const title =
    movieId && screenings.length > 0
      ? `Seanse: ${screenings[0].movie.title}`
      : "Repertuar / Seanse";

  return (
    <div className="container">
      <h2>{title}</h2>
      {movieId && (
        <Link to="/screenings" className="muted">
          &larr; Wszystkie seanse
        </Link>
      )}
      {screenings.length === 0 && <p className="muted">Brak seansów.</p>}
      <div className="grid">
        {screenings.map((s) => (
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
    </div>
  );
}
