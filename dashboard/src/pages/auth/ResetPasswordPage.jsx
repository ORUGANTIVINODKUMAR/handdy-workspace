import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/authApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import "../../styles/login.css";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(token, password);

      setMessage(response?.message || "Your password has been reset.");

      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to reset your password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">EMPLOYEE TIME & ATTENDANCE</p>

        <h1>Reset password</h1>

        <p className="auth-description">Choose a new password for your account.</p>

        {!token && (
          <div className="auth-error">
            This reset link is missing its token. Request a new one from the
            forgot password page.
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        {message ? (
          <p className="auth-success">{message}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="password">New password</label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm new password</label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || !token}
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}

        <p className="auth-link-row">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
