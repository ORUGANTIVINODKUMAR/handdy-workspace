import {
  Navigate,
  useLocation,
} from "react-router-dom";

import useAuth from "../context/useAuth";

function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const location = useLocation();

  const {
    user,
    isAuthenticated,
    isAuthLoading,
  } = useAuth();

  // Wait for existing token/session validation.
  if (isAuthLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Checking authentication...
      </div>
    );
  }

  // No valid session -> MAIN login only.
  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  // Logged in but wrong role.
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    if (user.role === "admin") {
      return (
        <Navigate
          to="/admin/dashboard"
          replace
        />
      );
    }

    if (
      user.role === "team_lead"
    ) {
      return (
        <Navigate
          to="/team-lead/dashboard"
          replace
        />
      );
    }

    if (user.role === "employee") {
      return (
        <Navigate
          to="/employee/dashboard"
          replace
        />
      );
    }

    if (user.role === "hr" || user.role === "manager") {
      return (
        <Navigate
          to="/attendance"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
