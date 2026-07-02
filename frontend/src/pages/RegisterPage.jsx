import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/RegisterPage.css";

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
      setError(err.response?.data?.detail || "Registration error.");
    }
  };

  return (
    <div className="container">
      <h2>Register</h2>
      {error && <div className="alert error">{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div>
          <label>Full name</label>
          <input value={form.name} onChange={update("name")} required />
        </div>
        <div>
          <label>Email</label>
          <input type="email" value={form.email} onChange={update("email")} required />
        </div>
        <div>
          <label>Phone</label>
          <input value={form.phone} onChange={update("phone")} />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={update("password")}
            required
          />
        </div>
        <button className="btn" type="submit">
          Register
        </button>
      </form>
      <p className="muted" style={{ marginTop: 12 }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  );
}
