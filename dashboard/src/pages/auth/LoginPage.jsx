import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import useAuth
  from "../../context/useAuth";
  import "../../styles/login.css";

function getDashboardForRole(role) {
  switch (role) {
    case "admin":
      return "/admin/dashboard";

    case "team_lead":
      return "/team-lead/dashboard";

    case "employee":
      return "/employee/dashboard";

    default:
      return null;
  }
}

function LoginPage() {
  const navigate = useNavigate();

  const {
    login,
    user,
    isAuthenticated,
    isAuthLoading,
  } = useAuth();

  const [formData, setFormData] =
    useState({
      email: "",
      password: "",
    });

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  // ==========================================
  // ALREADY LOGGED IN
  // ==========================================

  useEffect(() => {
    if (
      isAuthLoading ||
      !isAuthenticated ||
      !user
    ) {
      return;
    }

    const dashboard =
      getDashboardForRole(
        user.role
      );

    if (dashboard) {
      navigate(
        dashboard,
        {
          replace: true,
        }
      );
    }
  }, [
    user,
    isAuthenticated,
    isAuthLoading,
    navigate,
  ]);

  // ==========================================
  // INPUT
  // ==========================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // ==========================================
  // LOGIN
  // ==========================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const loggedInUser =
        await login(
          formData.email,
          formData.password
        );

      const dashboard =
        getDashboardForRole(
          loggedInUser.role
        );

      if (!dashboard) {
        throw new Error(
          "This user does not have a valid application role."
        );
      }

      // ONE login -> correct dashboard.
      navigate(
        dashboard,
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Login failed:",
        error
      );

      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="auth-page">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="auth-page">

      <div className="auth-card">

        <p className="auth-eyebrow">
          EMPLOYEE TIME & ATTENDANCE
        </p>

        <h1>
          Welcome back
        </h1>

        <p className="auth-description">
          Sign in to manage your attendance
          and personal work timer.
        </p>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >

          <div className="auth-field">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
          </div>

          <Link to="/forgot-password" className="auth-forgot-link">
            Forgot password?
          </Link>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default LoginPage;