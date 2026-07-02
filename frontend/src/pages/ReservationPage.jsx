import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CheckoutPanel from "../components/CheckoutPanel";
import { getScreening, getSeatmap } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import "../styles/ReservationPage.css";

export default function ReservationPage() {
  const { screeningId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [screening, setScreening] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const isSelected = (seat) => selected.some((s) => s.id === seat.id);

  const toggleSeat = (seat) => {
    setSelected((prev) =>
      prev.some((s) => s.id === seat.id)
        ? prev.filter((s) => s.id !== seat.id)
        : [...prev, seat]
    );
  };

  const load = () => {
    return Promise.all([getScreening(screeningId), getSeatmap(screeningId)])
      .then(([sc, sm]) => {
        setScreening(sc);
        setSeats(sm);
      })
      .catch(() => setError("Failed to load the screening."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screeningId]);

  const rows = useMemo(() => {
    const map = {};
    seats.forEach((s) => {
      map[s.row] = map[s.row] || [];
      map[s.row].push(s);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.number - b.number));
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [seats]);

  const handleReserved = (reservations, email) => {
    const labels = reservations
      .map((r) => `${r.seat.row}${r.seat.number}`)
      .join(", ");
    if (user) {
      setSuccess(
        `Reservation confirmed (${labels})! A confirmation has been sent to your email.`
      );
      setTimeout(() => navigate("/my-reservations"), 1800);
    } else {
      setSuccess(
        `Tickets purchased! A confirmation has been sent to ${email}. Seats: ${labels}.`
      );
      setSelected([]);
      load();
    }
  };

  if (loading) return <div className="container">Loading...</div>;
  if (!screening) return <div className="container">{error}</div>;

  return (
    <div className="container">
      <h2>Seat selection</h2>
      <div className="reserve-layout">
        <div>
          <div className="screen">SCREEN</div>
          <div className="seatmap">
            {rows.map(([row, rowSeats]) => (
              <div key={row} className="seat-row">
                <span style={{ width: 20 }}>{row}</span>
                {rowSeats.map((s) => (
                  <button
                    key={s.id}
                    className={`seat ${s.taken ? "taken" : ""} ${
                      isSelected(s) ? "selected" : ""
                    }`}
                    disabled={s.taken}
                    title={s.taken ? "Taken" : `Seat ${s.row}${s.number}`}
                    onClick={() => !s.taken && toggleSeat(s)}
                  >
                    {s.number}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="legend">
            <span>
              <i className="seat legend-box" /> available
            </span>
            <span>
              <i className="seat selected legend-box" /> selected
            </span>
            <span>
              <i className="seat taken legend-box" /> taken
            </span>
          </div>

          {seats.length === 0 && <p className="muted">This hall has no seats.</p>}
          {success && <div className="alert success">{success}</div>}
        </div>

        <CheckoutPanel
          screening={screening}
          selected={selected}
          onReserved={handleReserved}
        />
      </div>
    </div>
  );
}
