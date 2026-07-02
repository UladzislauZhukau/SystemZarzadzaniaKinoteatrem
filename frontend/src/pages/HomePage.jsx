import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getMovies, getScreenings } from "../api/endpoints";
import "../styles/HomePage.css";

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-US", {
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

  // Closest upcoming screenings, one per film (its soonest showtime). The
  // backend returns them sorted by start_time asc, so the first occurrence of
  // each film is already its earliest.
  const upcoming = useMemo(() => {
    const now = Date.now();
    const seen = new Set();
    const result = [];
    for (const s of screenings) {
      if (new Date(s.start_time).getTime() < now) continue;
      if (seen.has(s.movie.id)) continue;
      seen.add(s.movie.id);
      result.push(s);
      if (result.length >= 12) break;
    }
    return result;
  }, [screenings]);

  // Upcoming row: an infinitely looping carousel driven by the arrow buttons.
  // When the row overflows we render three copies and keep the viewport in the
  // middle one; after any scroll settles we snap back into that middle copy so
  // scrolling left or right never reaches an end.
  const trackRef = useRef(null);
  const idleTimer = useRef(null);
  const [loop, setLoop] = useState(false);

  const displayed = loop ? [...upcoming, ...upcoming, ...upcoming] : upcoming;

  // Re-measure from scratch whenever the data changes.
  useLayoutEffect(() => {
    setLoop(false);
  }, [upcoming]);

  // Card pitch (distance between adjacent card starts) and the width of one
  // copy. Because the flex gap is uniform, one copy spans exactly N pitches, so
  // jumping by a whole copy keeps the row on a snap boundary and seamless.
  const metrics = () => {
    const el = trackRef.current;
    if (!el || el.children.length < 2) return null;
    const pitch = el.children[1].offsetLeft - el.children[0].offsetLeft;
    return { el, pitch, copyPitch: pitch * upcoming.length };
  };

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el || upcoming.length === 0) return;
    if (!loop) {
      // Enable looping only when a single set actually overflows the row.
      if (el.scrollWidth > el.clientWidth + 8) setLoop(true);
    } else {
      const m = metrics();
      if (m) el.scrollLeft = m.copyPitch; // start of the middle copy
    }
  }, [loop, upcoming]);

  const recenter = () => {
    if (!loop) return;
    const m = metrics();
    if (!m) return;
    const { el, copyPitch } = m;
    const rel = (((el.scrollLeft - copyPitch) % copyPitch) + copyPitch) % copyPitch;
    el.scrollLeft = Math.round(rel + copyPitch); // stay in the middle copy
  };

  const handleScroll = () => {
    if (!loop) return;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(recenter, 150);
  };

  const scrollUpcoming = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const m = metrics();
    // Advance by a whole page of visible cards so clicks land on card edges.
    const step = m
      ? Math.max(1, Math.round(el.clientWidth / m.pitch)) * m.pitch
      : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

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
        <h1>Cinema Management System</h1>
        <p className="muted">
          Browse the schedule, reserve seats, and manage the cinema all in one place.
        </p>
      </div>

      <section className="home-section">
        <div className="row-between">
          <h2>Upcoming screenings</h2>
          <Link to="/screenings" className="muted">
            All screenings &rarr;
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">No upcoming screenings.</p>
        ) : (
          <div className="carousel">
            {loop && (
              <button
                type="button"
                className="carousel-arrow"
                aria-label="Scroll left"
                onClick={() => scrollUpcoming(-1)}
              >
                &#8249;
              </button>
            )}
            <div className="carousel-track" ref={trackRef} onScroll={handleScroll}>
              {displayed.map((s, i) => (
                <div key={`${s.id}-${i}`} className="card">
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
            {loop && (
              <button
                type="button"
                className="carousel-arrow"
                aria-label="Scroll right"
                onClick={() => scrollUpcoming(1)}
              >
                &#8250;
              </button>
            )}
          </div>
        )}
      </section>

      {ribbon.length > 0 && (
        <section className="home-section">
          <h2>Our films</h2>
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
                    <div className="movie-poster movie-poster-empty">No poster</div>
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
