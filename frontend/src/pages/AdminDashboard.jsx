import { useEffect, useRef, useState } from "react";
import {
  createHall,
  createMovie,
  createScreening,
  deleteHall,
  deleteMovie,
  deleteScreening,
  getHalls,
  getMovies,
  getScreenings,
  lookupMovie,
  searchImdb,
  updateHall,
  updateMovie,
  updateScreening,
} from "../api/endpoints";
import "../styles/AdminDashboard.css";
import "../styles/Autocomplete.css";

const EMPTY_MOVIE = {
  title: "",
  genre: "",
  description: "",
  duration_min: 120,
  rating: 0,
  poster_url: "",
  trailer_url: "",
};

function MoviesTab() {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(EMPTY_MOVIE);
  const [editingId, setEditingId] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Bumped on every pick/lookup so the debounced search effect skips the
  // programmatic title change that follows an autofill.
  const suppressSearch = useRef(false);
  const titleWrapRef = useRef(null);

  const load = () => getMovies().then(setMovies);
  useEffect(() => {
    load();
  }, []);

  // Debounced IMDb search as the admin types a title.
  useEffect(() => {
    const q = form.title.trim();
    if (suppressSearch.current) {
      suppressSearch.current = false;
      return;
    }
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      searchImdb(q)
        .then((results) => {
          setSuggestions(results);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [form.title]);

  // Close the suggestion list when clicking outside the title field.
  useEffect(() => {
    const onDocClick = (e) => {
      if (titleWrapRef.current && !titleWrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const resetForm = () => {
    setForm(EMPTY_MOVIE);
    setEditingId(null);
    setLookupError("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setLookupError("");
    suppressSearch.current = true;
    setSuggestions([]);
    setShowSuggestions(false);
    setForm({
      title: m.title || "",
      genre: m.genre || "",
      description: m.description || "",
      duration_min: m.duration_min ?? 120,
      rating: m.rating ?? 0,
      poster_url: m.poster_url || "",
      trailer_url: m.trailer_url || "",
    });
  };

  // Pull full metadata from OMDb by exact title or a picked IMDb id.
  const autofill = async (params) => {
    setLookupError("");
    setSearching(true);
    setShowSuggestions(false);
    try {
      const data = await lookupMovie(params);
      suppressSearch.current = true;
      setForm({
        title: data.title || "",
        genre: data.genre || "",
        description: data.description || "",
        duration_min: data.duration_min || 90,
        rating: data.rating || 0,
        poster_url: data.poster_url || "",
        trailer_url: data.trailer_url || "",
      });
    } catch (err) {
      setLookupError(
        err.response?.data?.detail || "Failed to fetch data from IMDb."
      );
    } finally {
      setSearching(false);
    }
  };

  const handleLookup = () => {
    if (!form.title.trim()) {
      setLookupError("Enter a film title to search.");
      return;
    }
    autofill({ title: form.title.trim() });
  };

  const pickSuggestion = (s) => {
    setSuggestions([]);
    autofill({ imdb_id: s.imdb_id });
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      duration_min: Number(form.duration_min),
      rating: Number(form.rating),
    };
    if (editingId) {
      await updateMovie(editingId, payload);
    } else {
      await createMovie(payload);
    }
    resetForm();
    load();
  };

  return (
    <div>
      <form className="form" onSubmit={submit}>
        <h3>{editingId ? `Edit film #${editingId}` : "Add film"}</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="autocomplete" ref={titleWrapRef} style={{ flex: 1 }}>
            <input
              placeholder="Title"
              value={form.title}
              autoComplete="off"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onFocus={() =>
                suggestions.length > 0 && setShowSuggestions(true)
              }
              required
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="autocomplete-list">
                {suggestions.map((s) => (
                  <li
                    key={s.imdb_id}
                    className="imdb-option"
                    onMouseDown={() => pickSuggestion(s)}
                  >
                    {s.poster_url ? (
                      <img
                        src={s.poster_url}
                        alt=""
                        className="imdb-poster"
                      />
                    ) : (
                      <div className="imdb-poster-empty" />
                    )}
                    <div className="imdb-meta">
                      <span className="imdb-title">{s.title}</span>
                      {s.year && <span className="imdb-year">{s.year}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            className="btn secondary"
            onClick={handleLookup}
            disabled={searching}
            style={{ whiteSpace: "nowrap" }}
          >
            {searching ? "Searching..." : "Search on IMDb"}
          </button>
        </div>
        {lookupError && <div className="alert error">{lookupError}</div>}
        {form.poster_url && (
          <img
            src={form.poster_url}
            alt="Poster"
            style={{ width: 120, borderRadius: 8, alignSelf: "flex-start" }}
          />
        )}
        <input
          placeholder="Genre"
          value={form.genre}
          onChange={(e) => setForm({ ...form, genre: e.target.value })}
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="number"
          placeholder="Duration (min)"
          value={form.duration_min}
          onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
        />
        <input
          type="number"
          step="0.1"
          placeholder="Rating"
          value={form.rating}
          onChange={(e) => setForm({ ...form, rating: e.target.value })}
        />
        <input
          placeholder="Poster URL"
          value={form.poster_url}
          onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
        />
        <input
          placeholder="Trailer URL (embed)"
          value={form.trailer_url}
          onChange={(e) => setForm({ ...form, trailer_url: e.target.value })}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn">{editingId ? "Save changes" : "Add"}</button>
          {editingId && (
            <button type="button" className="btn secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>ID</th>
            <th>Title</th>
            <th>Genre</th>
            <th>Duration</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {movies.map((m) => (
            <tr key={m.id}>
              <td>
                {m.poster_url && (
                  <img
                    src={m.poster_url}
                    alt=""
                    style={{ width: 32, borderRadius: 4 }}
                  />
                )}
              </td>
              <td>{m.id}</td>
              <td>{m.title}</td>
              <td>{m.genre}</td>
              <td>{m.duration_min} min</td>
              <td style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn small secondary"
                  onClick={() => startEdit(m)}
                >
                  Edit
                </button>
                <button
                  className="btn small danger"
                  onClick={() => deleteMovie(m.id).then(load)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY_HALL = { name: "", rows: 5, seats_per_row: 8, capacity: 0 };

function HallsTab() {
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState(EMPTY_HALL);
  const [editingId, setEditingId] = useState(null);

  const load = () => getHalls().then(setHalls);
  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_HALL);
    setEditingId(null);
  };

  const startEdit = (h) => {
    setEditingId(h.id);
    setForm({ ...EMPTY_HALL, name: h.name, capacity: h.capacity });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (editingId) {
      // The backend only updates name/capacity; seats aren't regenerated.
      await updateHall(editingId, {
        name: form.name,
        capacity: Number(form.capacity),
      });
    } else {
      await createHall({
        name: form.name,
        capacity: 0,
        rows: Number(form.rows),
        seats_per_row: Number(form.seats_per_row),
      });
    }
    resetForm();
    load();
  };

  return (
    <div>
      <form className="form" onSubmit={submit}>
        <h3>{editingId ? `Edit hall #${editingId}` : "Add hall"}</h3>
        <input
          placeholder="Hall name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        {editingId ? (
          <>
            <label>Capacity</label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </>
        ) : (
          <>
            <label>Number of rows</label>
            <input
              type="number"
              value={form.rows}
              onChange={(e) => setForm({ ...form, rows: e.target.value })}
            />
            <label>Seats per row</label>
            <input
              type="number"
              value={form.seats_per_row}
              onChange={(e) =>
                setForm({ ...form, seats_per_row: e.target.value })
              }
            />
          </>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn">
            {editingId ? "Save changes" : "Add (with seats)"}
          </button>
          {editingId && (
            <button type="button" className="btn secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Capacity</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {halls.map((h) => (
            <tr key={h.id}>
              <td>{h.id}</td>
              <td>{h.name}</td>
              <td>{h.capacity}</td>
              <td style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn small secondary"
                  onClick={() => startEdit(h)}
                >
                  Edit
                </button>
                <button
                  className="btn small danger"
                  onClick={() => deleteHall(h.id).then(load)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EMPTY_SCREENING = {
  movie_id: "",
  hall_id: "",
  start_time: "",
  ticket_price: 30,
};

// Format an ISO timestamp as the local "YYYY-MM-DDTHH:mm" value a
// datetime-local input expects.
function toDatetimeLocal(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function ScreeningsTab() {
  const [screenings, setScreenings] = useState([]);
  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState(EMPTY_SCREENING);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const load = () => getScreenings().then(setScreenings);
  useEffect(() => {
    load();
    getMovies().then(setMovies);
    getHalls().then(setHalls);
  }, []);

  const resetForm = () => {
    setForm(EMPTY_SCREENING);
    setEditingId(null);
    setError("");
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setError("");
    setForm({
      movie_id: String(s.movie_id),
      hall_id: String(s.hall_id),
      start_time: toDatetimeLocal(s.start_time),
      ticket_price: s.ticket_price,
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      movie_id: Number(form.movie_id),
      hall_id: Number(form.hall_id),
      start_time: new Date(form.start_time).toISOString(),
      ticket_price: Number(form.ticket_price),
    };
    try {
      if (editingId) {
        await updateScreening(editingId, payload);
      } else {
        await createScreening(payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          (editingId
            ? "Failed to update the screening."
            : "Failed to add the screening.")
      );
    }
  };

  return (
    <div>
      <form className="form" onSubmit={submit}>
        <h3>{editingId ? `Edit screening #${editingId}` : "Add screening"}</h3>
        {error && <div className="alert error">{error}</div>}
        <select
          value={form.movie_id}
          onChange={(e) => setForm({ ...form, movie_id: e.target.value })}
          required
        >
          <option value="">-- Select film --</option>
          {movies.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <select
          value={form.hall_id}
          onChange={(e) => setForm({ ...form, hall_id: e.target.value })}
          required
        >
          <option value="">-- Select hall --</option>
          {halls.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <label>Date and time</label>
        <input
          type="datetime-local"
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          required
        />
        <label>Ticket price (PLN)</label>
        <input
          type="number"
          step="0.01"
          value={form.ticket_price}
          onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn">{editingId ? "Save changes" : "Add"}</button>
          {editingId && (
            <button type="button" className="btn secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Film</th>
            <th>Hall</th>
            <th>Date</th>
            <th>Price</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {screenings.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.movie.title}</td>
              <td>{s.hall.name}</td>
              <td>{new Date(s.start_time).toLocaleString("en-US")}</td>
              <td>{s.ticket_price} PLN</td>
              <td style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn small secondary"
                  onClick={() => startEdit(s)}
                >
                  Edit
                </button>
                <button
                  className="btn small danger"
                  onClick={() => deleteScreening(s.id).then(load)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("movies");

  return (
    <div className="container">
      <h2>Admin panel</h2>
      <div className="tabs">
        <button
          className={tab === "movies" ? "active" : ""}
          onClick={() => setTab("movies")}
        >
          Films
        </button>
        <button
          className={tab === "halls" ? "active" : ""}
          onClick={() => setTab("halls")}
        >
          Halls
        </button>
        <button
          className={tab === "screenings" ? "active" : ""}
          onClick={() => setTab("screenings")}
        >
          Screenings
        </button>
      </div>
      {tab === "movies" && <MoviesTab />}
      {tab === "halls" && <HallsTab />}
      {tab === "screenings" && <ScreeningsTab />}
    </div>
  );
}
