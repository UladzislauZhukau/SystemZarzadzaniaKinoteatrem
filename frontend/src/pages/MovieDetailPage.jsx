import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getMovie,
  getMovieReviews,
  createMovieReview,
  updateMovieReview,
  deleteMovieReview,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import "../styles/MovieDetailPage.css";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();

  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState({ average: 0, count: 0, items: [] });
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(8);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Inline editing of an existing review.
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(8);
  const [editComment, setEditComment] = useState("");

  const loadReviews = () => getMovieReviews(id).then(setReviews);

  const canModify = (r) => user && (isAdmin || user.id === r.customer_id);

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditRating(r.rating);
    setEditComment(r.comment || "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (reviewId) => {
    setError("");
    try {
      await updateMovieReview(id, reviewId, {
        rating: Number(editRating),
        comment: editComment,
      });
      setEditingId(null);
      await loadReviews();
    } catch {
      setError("Failed to update the review.");
    }
  };

  const handleDelete = async (reviewId) => {
    setError("");
    try {
      await deleteMovieReview(id, reviewId);
      await loadReviews();
    } catch {
      setError("Failed to delete the review.");
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getMovie(id), getMovieReviews(id)])
      .then(([m, r]) => {
        setMovie(m);
        setReviews(r);
      })
      .catch(() => setError("Failed to load the film."))
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
      setError("Failed to save the review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container">Loading...</div>;
  if (!movie) return <div className="container">Film not found.</div>;

  return (
    <div className="container">
      <Link to="/movies" className="muted">
        &larr; All films
      </Link>

      <div className="movie-detail">
        <div className="movie-detail-poster">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt={movie.title} className="movie-poster" />
          ) : (
            <div className="movie-poster movie-poster-empty">No poster</div>
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
                Viewers: {reviews.average}/10 ({reviews.count})
              </span>
            )}
          </div>
          <p>{movie.description}</p>
          <Link to={`/screenings?movie=${movie.id}`} className="btn">
            Screenings / Buy ticket
          </Link>
        </div>
      </div>

      {movie.trailer_url && (
        <section>
          <h3>Trailer</h3>
          <div className="trailer-wrapper">
            <iframe
              src={movie.trailer_url}
              title={`Trailer: ${movie.title}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <section className="reviews">
        <h3>
          Reviews{" "}
          {reviews.count > 0 && (
            <span className="muted">
              — average {reviews.average}/10 ({reviews.count})
            </span>
          )}
        </h3>

        {user ? (
          <form className="review-form" onSubmit={submitReview}>
            <label>
              Rating:{" "}
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
              placeholder="Your opinion (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "Saving..." : "Add review"}
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        ) : (
          <p className="muted">
            <Link to="/login">Sign in</Link> to add a review.
          </p>
        )}

        {reviews.items.length === 0 ? (
          <p className="muted">No reviews yet. Be the first!</p>
        ) : (
          <ul className="review-list">
            {reviews.items.map((r) => (
              <li key={r.id} className="review">
                <div className="review-head">
                  <strong>{r.author_name}</strong>
                  <span className="star-rating">★ {r.rating}/10</span>
                  <span className="muted">{formatDate(r.created_at)}</span>
                </div>

                {editingId === r.id ? (
                  <div className="review-edit">
                    <label>
                      Rating:{" "}
                      <select
                        value={editRating}
                        onChange={(e) => setEditRating(e.target.value)}
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
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn small"
                        onClick={() => saveEdit(r.id)}
                      >
                        Save
                      </button>
                      <button
                        className="btn small secondary"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {r.comment && <p>{r.comment}</p>}
                    {canModify(r) && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn small secondary"
                          onClick={() => startEdit(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn small danger"
                          onClick={() => handleDelete(r.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
