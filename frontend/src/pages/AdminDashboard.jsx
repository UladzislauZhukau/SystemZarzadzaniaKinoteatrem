import { useEffect, useState } from "react";
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
} from "../api/endpoints";

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
  const [lookupError, setLookupError] = useState("");
  const [searching, setSearching] = useState(false);

  const load = () => getMovies().then(setMovies);
  useEffect(() => {
    load();
  }, []);

  const handleLookup = async () => {
    if (!form.title.trim()) {
      setLookupError("Wpisz tytuł filmu, aby wyszukać.");
      return;
    }
    setLookupError("");
    setSearching(true);
    try {
      const data = await lookupMovie(form.title.trim());
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
        err.response?.data?.detail || "Nie udało się pobrać danych z IMDb."
      );
    } finally {
      setSearching(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    await createMovie({
      ...form,
      duration_min: Number(form.duration_min),
      rating: Number(form.rating),
    });
    setForm(EMPTY_MOVIE);
    setLookupError("");
    load();
  };

  return (
    <div>
      <form className="form" onSubmit={submit}>
        <h3>Dodaj film</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Tytul"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <button
            type="button"
            className="btn secondary"
            onClick={handleLookup}
            disabled={searching}
            style={{ whiteSpace: "nowrap" }}
          >
            {searching ? "Szukam..." : "Szukaj w IMDb"}
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
          placeholder="Gatunek"
          value={form.genre}
          onChange={(e) => setForm({ ...form, genre: e.target.value })}
        />
        <textarea
          placeholder="Opis"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="number"
          placeholder="Czas (min)"
          value={form.duration_min}
          onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
        />
        <input
          type="number"
          step="0.1"
          placeholder="Ocena"
          value={form.rating}
          onChange={(e) => setForm({ ...form, rating: e.target.value })}
        />
        <input
          placeholder="URL plakatu"
          value={form.poster_url}
          onChange={(e) => setForm({ ...form, poster_url: e.target.value })}
        />
        <input
          placeholder="URL zwiastuna (embed)"
          value={form.trailer_url}
          onChange={(e) => setForm({ ...form, trailer_url: e.target.value })}
        />
        <button className="btn">Dodaj</button>
      </form>

      <table>
        <thead>
          <tr>
            <th></th>
            <th>ID</th>
            <th>Tytul</th>
            <th>Gatunek</th>
            <th>Czas</th>
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
              <td>
                <button
                  className="btn small danger"
                  onClick={() => deleteMovie(m.id).then(load)}
                >
                  Usun
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HallsTab() {
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState({ name: "", rows: 5, seats_per_row: 8 });

  const load = () => getHalls().then(setHalls);
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await createHall({
      name: form.name,
      capacity: 0,
      rows: Number(form.rows),
      seats_per_row: Number(form.seats_per_row),
    });
    setForm({ name: "", rows: 5, seats_per_row: 8 });
    load();
  };

  return (
    <div>
      <form className="form" onSubmit={submit}>
        <h3>Dodaj sale</h3>
        <input
          placeholder="Nazwa sali"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <label>Liczba rzedow</label>
        <input
          type="number"
          value={form.rows}
          onChange={(e) => setForm({ ...form, rows: e.target.value })}
        />
        <label>Miejsc w rzedzie</label>
        <input
          type="number"
          value={form.seats_per_row}
          onChange={(e) => setForm({ ...form, seats_per_row: e.target.value })}
        />
        <button className="btn">Dodaj (z miejscami)</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nazwa</th>
            <th>Pojemnosc</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {halls.map((h) => (
            <tr key={h.id}>
              <td>{h.id}</td>
              <td>{h.name}</td>
              <td>{h.capacity}</td>
              <td>
                <button
                  className="btn small danger"
                  onClick={() => deleteHall(h.id).then(load)}
                >
                  Usun
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScreeningsTab() {
  const [screenings, setScreenings] = useState([]);
  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);
  const [form, setForm] = useState({
    movie_id: "",
    hall_id: "",
    start_time: "",
    ticket_price: 30,
  });

  const load = () => getScreenings().then(setScreenings);
  useEffect(() => {
    load();
    getMovies().then(setMovies);
    getHalls().then(setHalls);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await createScreening({
      movie_id: Number(form.movie_id),
      hall_id: Number(form.hall_id),
      start_time: new Date(form.start_time).toISOString(),
      ticket_price: Number(form.ticket_price),
    });
    setForm({ movie_id: "", hall_id: "", start_time: "", ticket_price: 30 });
    load();
  };

  return (
    <div>
      <form className="form" onSubmit={submit}>
        <h3>Dodaj seans</h3>
        <select
          value={form.movie_id}
          onChange={(e) => setForm({ ...form, movie_id: e.target.value })}
          required
        >
          <option value="">-- Wybierz film --</option>
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
          <option value="">-- Wybierz sale --</option>
          {halls.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <label>Data i godzina</label>
        <input
          type="datetime-local"
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          required
        />
        <label>Cena biletu (PLN)</label>
        <input
          type="number"
          step="0.01"
          value={form.ticket_price}
          onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
        />
        <button className="btn">Dodaj</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Film</th>
            <th>Sala</th>
            <th>Data</th>
            <th>Cena</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {screenings.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.movie.title}</td>
              <td>{s.hall.name}</td>
              <td>{new Date(s.start_time).toLocaleString("pl-PL")}</td>
              <td>{s.ticket_price} PLN</td>
              <td>
                <button
                  className="btn small danger"
                  onClick={() => deleteScreening(s.id).then(load)}
                >
                  Usun
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
      <h2>Panel administratora</h2>
      <div className="tabs">
        <button
          className={tab === "movies" ? "active" : ""}
          onClick={() => setTab("movies")}
        >
          Filmy
        </button>
        <button
          className={tab === "halls" ? "active" : ""}
          onClick={() => setTab("halls")}
        >
          Sale
        </button>
        <button
          className={tab === "screenings" ? "active" : ""}
          onClick={() => setTab("screenings")}
        >
          Seanse
        </button>
      </div>
      {tab === "movies" && <MoviesTab />}
      {tab === "halls" && <HallsTab />}
      {tab === "screenings" && <ScreeningsTab />}
    </div>
  );
}
