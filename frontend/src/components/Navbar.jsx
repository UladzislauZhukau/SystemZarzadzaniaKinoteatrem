import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MusicPlayer from "./MusicPlayer";
import "../styles/Navbar.css";

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
        CINEMA
      </Link>
      <nav>
        <Link to="/movies">Films</Link>
        <Link to="/screenings">Screenings</Link>
        {user && <Link to="/my-reservations">My reservations</Link>}
        {isAdmin && <Link to="/admin">Admin panel</Link>}
        {user ? (
          <>
            <span className="muted">{user.name}</span>
            <button className="btn small secondary" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="btn small">
              Register
            </Link>
          </>
        )}
        <MusicPlayer />
      </nav>
    </header>
  );
}
