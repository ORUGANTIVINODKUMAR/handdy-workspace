import { useState } from "react";
import useAuth from "../../context/useAuth";
import getApiErrorMessage from "../../utils/getApiErrorMessage";
import { useNavigate } from "react-router-dom";
function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required.";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setApiError("");
    setSuccessMessage("");

    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    try {
      setIsLoading(true);

      const loggedInUser = await login(email, password);

      if (["admin", "manager", "hr"].includes(loggedInUser.role)) {
        navigate("/admin/dashboard");
      } else if (loggedInUser.role === "team_lead") {
        navigate("/team-lead/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Unable to sign in."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      {apiError && <p className="status-message error-message" role="alert">{apiError}</p>}

      {successMessage && <p>{successMessage}</p>}

      <div className="field-group">
        <label htmlFor="email">Email</label>

        <input
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isLoading}
        />

        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>

      <div className="field-group">
        <label htmlFor="password">Password</label>

        <input
          type="password"
          id="password"
          name="password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
        />

        {errors.password && <p className="field-error">{errors.password}</p>}
      </div>

      <button className="primary-button" type="submit" disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}

export default LoginForm;
