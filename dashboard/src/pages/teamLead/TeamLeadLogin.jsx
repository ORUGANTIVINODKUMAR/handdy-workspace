import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import "../../styles/teamLeadLogin.css";

function TeamLeadLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter email and password.");
      return;
    }

    if (!cleanEmail.endsWith("@upsilonservices.com")) {
      setError(
        "Please use your @upsilonservices.com email address."
      );
      return;
    }

    try {
      setLoading(true);

      const user = await login(
        cleanEmail,
        password
      );

      if (user?.role !== "team_lead") {
        setError(
          "Only Team Lead users can login here."
        );
        return;
      }

      navigate(
        "/team-lead/dashboard",
        {
          replace: true,
        }
      );
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teamlead-login-page">
      <div className="teamlead-login-card">
        <div className="teamlead-login-brand">
          <div className="teamlead-login-logo">
            TT
          </div>

          <div>
            <h1>TimeTrack</h1>
            <span>Team Lead Portal</span>
          </div>
        </div>

        <div className="teamlead-login-content">
          <h2>Team Lead Login</h2>

          <p>
            Sign in using your CRM
            company email.
          </p>

          {error && (
            <div className="teamlead-login-error">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="teamlead-login-form"
          >
            <div>
              <label htmlFor="teamLeadEmail">
                Email
              </label>

              <input
                id="teamLeadEmail"
                type="email"
                placeholder="firstname.lastname@upsilonservices.com"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="teamLeadPassword">
                Password
              </label>

              <input
                id="teamLeadPassword"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TeamLeadLogin;
