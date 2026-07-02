import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="container">
      <div className="hero">
        <h1>System Zarzadzania Kinoteatrem</h1>
        <p className="muted">
          Przegladaj repertuar, rezerwuj miejsca i zarzadzaj kinem w jednym miejscu.
        </p>
        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <Link to="/movies" className="btn">
            Zobacz filmy
          </Link>
          <Link to="/screenings" className="btn secondary">
            Repertuar
          </Link>
        </div>
      </div>
    </div>
  );
}
