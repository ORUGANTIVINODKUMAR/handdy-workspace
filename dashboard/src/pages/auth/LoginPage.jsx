import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Eye,
  EyeOff,
} from "lucide-react";

import useAuth
  from "../../context/useAuth";
  import "../../styles/login.css";

function getDashboardForRole(role) {
  switch (role) {
    case "admin":
    case "alpha":
      return "/admin/dashboard";

    case "team_lead":
      return "/team-lead/dashboard";

    case "hr":
    case "manager":
      return "/admin/dashboard";

    case "employee":
      return "/employee/dashboard";

    default:
      return null;
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    login,
    quickLogin,
    rememberedUser,
    user,
    isAuthenticated,
    isAuthLoading,
    loginApprovalMessage,
  } = useAuth();

  const [formData, setFormData] =
    useState({
      email: "",
      password: "",
    });

  const [error, setError] =
    useState(() => {
      const sessionMessage = sessionStorage.getItem("sessionEndedMessage") || "";
      sessionStorage.removeItem("sessionEndedMessage");
      return sessionMessage;
    });

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
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

  const handleQuickLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await quickLogin();
      const dashboard = getDashboardForRole(loggedInUser.role);
      if (!dashboard) throw new Error("This user does not have a valid application role.");
      navigate(dashboard, { replace: true });
    } catch (quickLoginError) {
      setError(quickLoginError?.response?.data?.message || quickLoginError?.message || "Your remembered session has expired. Please sign in again.");
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

      <aside className="crm-auth-story"><div className="crm-auth-wordmark">CRM <span>WORKSPACE</span></div><div><p className="crm-auth-kicker">ONE PLACE FOR YOUR WORKDAY</p><h2>Good work starts<br />with clarity.</h2><p>Your time, your team, and the work ahead.<br />Connected in one workspace.</p></div><footer>Employee time &amp; attendance</footer></aside>
      <div className="auth-card">

        <p className="auth-eyebrow">
          WELCOME TO CRM
        </p>

        <h1>
          Sign in to your workspace
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

        {!error && loginApprovalMessage && (
          <div className="auth-error" role="status">
            {loginApprovalMessage}
          </div>
        )}

        {!error && location.state?.accessDenied && (
          <div className="auth-error">
            {location.state.accessDenied}
          </div>
        )}

        {rememberedUser && (
          <div className="remembered-login">
            <div className="remembered-login-avatar">{rememberedUser.fullName?.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</div>
            <div><strong>{rememberedUser.fullName}</strong><span>{rememberedUser.email}</span></div>
            <button type="button" onClick={handleQuickLogin} disabled={loading}>{loading ? "Checking…" : "Login"}</button>
          </div>
        )}

        {rememberedUser && <div className="auth-divider"><span>or sign in with another account</span></div>}

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

            <div className="auth-password-control">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
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
              : "Sign in"}
          </button>

        </form>

      </div>

    </div>
  );
}

export default LoginPage;
