import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Blad rejestracji.");
    }
  };

  return (
    <div className="container">
      <h2>Rejestracja</h2>
      {error && <div className="alert error">{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div>
          <label>Imie i nazwisko</label>
          <input value={form.name} onChange={update("name")} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={form.email} onChange={update("email")} required />
        </div>
        <div>
          <label>Telefon</label>
          <input value={form.phone} onChange={update("phone")} />
        </div>
        <div>
          <label>Haslo</label>
          <input
            type="password"
            value={form.password}
            onChange={update("password")}
            required
          />
        </div>
        <button className="btn" type="submit">
          Zarejestruj
        </button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>
        Masz juz konto? <Link to="/login">Zaloguj sie</Link>
      </p>
    </div>
  );
}
