import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getMovie,
  getMovieReviews,
  createMovieReview,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    dateStyle: "medium",
  });
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState({ average: 0, count: 0, items: [] });
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(8);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadReviews = () => getMovieReviews(id).then(setReviews);

  useEffect(() => {
    setLoading(true);
    Promise.all([getMovie(id), getMovieReviews(id)])
      .then(([m, r]) => {
        setMovie(m);
        setReviews(r);
      })
      .catch(() => setError("Nie udało się załadować filmu."))
      .finally(() => setLoading(false));
  }, [id]);

  const submitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createMovieReview(id, { rating: Number(rating), comment });
      setComment("");
      await loadReviews();
    } catch {
      setError("Nie udało się zapisać recenzji.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container">Ładowanie...</div>;
  if (!movie) return <div className="container">Nie znaleziono filmu.</div>;

  return (
    <div className="container">
      <Link to="/movies" className="muted">
        &larr; Wszystkie filmy
      </Link>

      <div className="movie-detail">
        <div className="movie-detail-poster">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.title} className="movie-poster" />
          ) : (
            <div className="movie-poster movie-poster-empty">Brak plakatu</div>
          )}
        </div>

        <div className="movie-detail-info">
          <h2>{movie.title}</h2>
          <div>
            {movie.genre && <span className="badge">{movie.genre}</span>}
            <span className="badge">{movie.duration_min} min</span>
            <span className="badge">★ {movie.rating}</span>
            {reviews.count > 0 && (
              <span className="badge">
                Widzowie: {reviews.average}/10 ({reviews.count})
              </span>
            )}
          </div>
          <p>{movie.description}</p>
          <Link to={`/screenings?movie=${movie.id}`} className="btn">
            Seanse / Kup bilet
          </Link>
        </div>
      </div>

      {movie.trailer_url && (
        <section>
          <h3>Zwiastun</h3>
          <div className="trailer-wrapper">
            <iframe
              src={movie.trailer_url}
              title={`Zwiastun: ${movie.title}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <section className="reviews">
        <h3>
          Recenzje{" "}
          {reviews.count > 0 && (
            <span className="muted">
              — średnia {reviews.average}/10 ({reviews.count})
            </span>
          )}
        </h3>

        {user ? (
          <form className="review-form" onSubmit={submitReview}>
            <label>
              Ocena:{" "}
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>{" "}
              / 10
            </label>
            <textarea
              placeholder="Twoja opinia (opcjonalnie)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "Zapisywanie..." : "Dodaj recenzję"}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        ) : (
          <p className="muted">
            <Link to="/login">Zaloguj się</Link>, aby dodać recenzję.
          </p>
        )}

        {reviews.items.length === 0 ? (
          <p className="muted">Brak recenzji. Bądź pierwszy!</p>
        ) : (
          <ul className="review-list">
            {reviews.items.map((r) => (
              <li key={r.id} className="review">
                <div className="review-head">
                  <strong>{r.author_name}</strong>
                  <span className="star-rating">★ {r.rating}/10</span>
                  <span className="muted">{formatDate(r.created_at)}</span>
                </div>
                {r.comment && <p>{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
