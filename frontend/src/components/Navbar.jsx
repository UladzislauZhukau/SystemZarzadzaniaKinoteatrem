import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        KINOTEATR
      </Link>
      <nav>
        <Link to="/movies">Filmy</Link>
        <Link to="/screenings">Seanse</Link>
        {user && <Link to="/my-reservations">Moje rezerwacje</Link>}
        {isAdmin && <Link to="/admin">Panel admina</Link>}
        {user ? (
          <>
            <span className="muted">{user.name}</span>
            <button className="btn small secondary" onClick={handleLogout}>
              Wyloguj
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Logowanie</Link>
            <Link to="/register" className="btn small">
              Rejestracja
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
