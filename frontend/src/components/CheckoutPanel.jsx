import { useState } from "react";
import { Link } from "react-router-dom";
import {
  createBulkReservation,
  createGuestBulkReservation,
} from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import "../styles/CheckoutPanel.css";

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
    if (count === 0) return "Please select at least one seat first.";
    if (!user && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return "Please enter a valid email address.";
    if (onlyDigits(card).length !== 16) return "Card number must have 16 digits.";
    if (!/^\d{2}\/\d{2}$/.test(expiry))
      return "Expiry date must be in MM/YY format.";
    if (!/^\d{3}$/.test(cvc)) return "CVC code must have 3 digits.";
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
      setError(err.response?.data?.detail || "Payment / reservation error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="card checkout">
      <h3>Summary</h3>
      <p className="muted" style={{ margin: "4px 0 12px" }}>
        {screening.movie.title}
        <br />
        {new Date(screening.start_time).toLocaleString("en-US")} ·{" "}
        {screening.hall.name}
      </p>

      <div className="row-between">
        <span className="muted">Seats ({count})</span>
        <strong>{count > 0 ? seatLabels : "-"}</strong>
      </div>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="muted">
          Total{count > 0 ? ` (${count} x ${screening.ticket_price} PLN)` : ""}
        </span>
        <strong>{total} PLN</strong>
      </div>

      {!user && (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Have an account? <Link to="/login">Sign in</Link> or{" "}
          <Link to="/register">register</Link> to earn loyalty
          discounts. You can also buy a ticket as a guest below.
        </p>
      )}
      {user && (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Buying as <b>{user.name}</b>. Your loyalty discount (if
          eligible) will be applied automatically.
        </p>
      )}

      {error && <div className="alert error">{error}</div>}

      <form className="form" onSubmit={submit} style={{ gap: 10 }}>
        {!user && (
          <div>
            <label>Email (we'll send the ticket to this address)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@example.com"
            />
          </div>
        )}

        <div>
          <label>Card number</label>
          <input
            inputMode="numeric"
            value={card}
            onChange={(e) => setCard(formatCardNumber(e.target.value))}
            placeholder="1234 5678 9012 3456"
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label>Expiry</label>
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
            ? "Processing..."
            : count > 0
            ? `Buy tickets (${count}) - ${total} PLN`
            : "Select seats"}
        </button>
        <p className="muted" style={{ fontSize: "0.7rem", margin: 0 }}>
          Test payment - your card will not be charged.
        </p>
      </form>
    </aside>
  );
}
