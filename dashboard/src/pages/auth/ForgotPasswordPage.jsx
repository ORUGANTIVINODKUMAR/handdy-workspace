import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../../api/authApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import "../../styles/login.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await forgotPassword(email.trim());

      setMessage(
        response?.message ||
          "If an account exists for that email, a password reset link has been sent."
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to send a reset link."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-eyebrow">EMPLOYEE TIME & ATTENDANCE</p>

        <h1>Forgot password</h1>

        <p className="auth-description">
          Enter your account email and we&apos;ll send you a link to reset your
          password.
        </p>

        {error && <div className="auth-error">{error}</div>}

        {message ? (
          <p className="auth-success">{message}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
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

export default ForgotPasswordPage;
