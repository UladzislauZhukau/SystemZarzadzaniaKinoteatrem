import { useState } from "react";
import { Link } from "react-router-dom";
import {
  createBulkReservation,
  createGuestBulkReservation,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

const onlyDigits = (v) => v.replace(/\D/g, "");

function formatCardNumber(v) {
  return onlyDigits(v)
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(v) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export default function CheckoutPanel({ screening, selected, onReserved }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const count = selected.length;
  const total = (Number(screening.ticket_price) * count).toFixed(2);
  const seatLabels = selected
    .map((s) => `${s.row}${s.number}`)
    .join(", ");

  const validate = () => {
    if (count === 0) return "Najpierw wybierz przynajmniej jedno miejsce.";
    if (!user && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return "Podaj poprawny adres e-mail.";
    if (onlyDigits(card).length !== 16) return "Numer karty musi mieć 16 cyfr.";
    if (!/^\d{2}\/\d{2}$/.test(expiry))
      return "Data ważności w formacie MM/YY.";
    if (!/^\d{3}$/.test(cvc)) return "Kod CVC musi mieć 3 cyfry.";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    setSubmitting(true);
    const payload = {
      screening_id: screening.id,
      seat_ids: selected.map((s) => s.id),
    };
    try {
      const reservations = user
        ? await createBulkReservation(payload)
        : await createGuestBulkReservation({ ...payload, email });
      onReserved(reservations, user ? user.email : email);
    } catch (err) {
      setError(err.response?.data?.detail || "Błąd płatności / rezerwacji.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="card checkout">
      <h3>Podsumowanie</h3>
      <p className="muted" style={{ margin: "4px 0 12px" }}>
        {screening.movie.title}
        <br />
        {new Date(screening.start_time).toLocaleString("pl-PL")} ·{" "}
        {screening.hall.name}
      </p>

      <div className="row-between">
        <span className="muted">Miejsca ({count})</span>
        <strong>{count > 0 ? seatLabels : "-"}</strong>
      </div>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="muted">
          Razem{count > 0 ? ` (${count} x ${screening.ticket_price} PLN)` : ""}
        </span>
        <strong>{total} PLN</strong>
      </div>

      {!user && (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Masz konto? <Link to="/login">Zaloguj się</Link> lub{" "}
          <Link to="/register">zarejestruj</Link>, aby zbierać rabaty
          lojalnościowe. Możesz też kupić bilet jako gość poniżej.
        </p>
      )}
      {user && (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Kupujesz jako <b>{user.name}</b>. Rabat lojalnościowy (jeśli
          przysługuje) zostanie naliczony automatycznie.
        </p>
      )}

      {error && <div className="alert error">{error}</div>}

      <form className="form" onSubmit={submit} style={{ gap: 10 }}>
        {!user && (
          <div>
            <label>E-mail (na ten adres wyślemy bilet)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.com"
            />
          </div>
        )}

        <div>
          <label>Numer karty</label>
          <input
            inputMode="numeric"
            value={card}
            onChange={(e) => setCard(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Ważność</label>
            <input
              inputMode="numeric"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
            />
          </div>
          <div style={{ width: 90 }}>
            <label>CVC</label>
            <input
              inputMode="numeric"
              value={cvc}
              onChange={(e) => setCvc(onlyDigits(e.target.value).slice(0, 3))}
              placeholder="123"
            />
          </div>
        </div>

        <button className="btn" type="submit" disabled={count === 0 || submitting}>
          {submitting
            ? "Przetwarzanie..."
            : count > 0
            ? `Kup bilety (${count}) - ${total} PLN`
            : "Wybierz miejsca"}
        </button>
        <p className="muted" style={{ fontSize: "0.7rem", margin: 0 }}>
          Płatność testowa - karta nie zostanie obciążona.
        </p>
      </form>
    </aside>
  );
}
