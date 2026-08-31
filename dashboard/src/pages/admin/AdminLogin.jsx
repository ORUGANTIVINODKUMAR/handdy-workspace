import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import "./AdminLogin.css";

function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const user = await login(email, password);

      if (user?.role !== "admin") {
        setError("Only admin users can login here.");
        return;
      }

      navigate("/admin/dashboard", {
        replace: true,
      });
    } catch (error) {
      setError(
        error?.message ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      {/* HEADER */}
      <header className="admin-login-header">
        <div className="admin-login-brand">
          <div className="admin-login-logo">
            TT
          </div>

          <span>TimeTrack</span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="admin-login-main">
        <div className="admin-login-container">

          {/* LEFT SIDE */}
          <section className="admin-login-form-section">
            <h1>Admin Login</h1>

            <form
              className="admin-login-form"
              onSubmit={handleSubmit}
            >
              {error && (
                <div className="admin-login-error">
                  {error}
                </div>
              )}

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                required
              />

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Logging in..."
                  : "Enter Admin →"}
              </button>
            </form>

            <button
              type="button"
              className="admin-forgot-password"
            >
              Forgot password?
            </button>
          </section>

          {/* RIGHT SIDE */}
          <section className="admin-login-info">
            <h2>
              Employee Time & Attendance
            </h2>

            <p>
              Admin access allows you to manage:
            </p>

            <ul>
              <li>Employees</li>
              <li>Teams</li>
              <li>Clients</li>
              <li>Projects</li>
              <li>Tasks</li>
              <li>Timesheets</li>
              <li>Attendance reports</li>
            </ul>
          </section>

        </div>
      </main>
    </div>
  );
}

export default AdminLogin;