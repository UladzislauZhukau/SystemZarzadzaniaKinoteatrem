import { useEffect, useState } from "react";
import { cancelReservation, getMyReservations } from "../api/endpoints";
import "../styles/MyReservationsPage.css";

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getMyReservations()
      .then(setReservations)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCancel = async (id) => {
    await cancelReservation(id);
    load();
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>My reservations</h2>
      {reservations.length === 0 && <p className="muted">No reservations.</p>}
      {reservations.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Film</th>
              <th>Screening date</th>
              <th>Hall</th>
              <th>Seat</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td>{r.screening.movie.title}</td>
                <td>{new Date(r.screening.start_time).toLocaleString("en-US")}</td>
                <td>{r.screening.hall.name}</td>
                <td>
                  {r.seat.row}
                  {r.seat.number}
                </td>
                <td>
                  {r.price} PLN
                  {Number(r.discount_applied) > 0 && (
                    <span className="badge" style={{ marginLeft: 6 }}>
                      -{Math.round(Number(r.discount_applied) * 100)}%
                    </span>
                  )}
                </td>
                <td>{r.status}</td>
                <td>
                  {r.status === "confirmed" && (
                    <button
                      className="btn small danger"
                      onClick={() => handleCancel(r.id)}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
