import {
  Navigate,
  useLocation,
} from "react-router-dom";

import useAuth from "../context/useAuth";

function ProtectedRoute({
  children,
  allowedRoles = [],
  requiredPermissions = [],
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

  // A route can also be reached via an admin-granted delegated permission
  // (e.g. a specific HR/employee account given "create_employees"),
  // regardless of that account's role.
  const hasRequiredPermission =
    requiredPermissions.length > 0 &&
    requiredPermissions.some((key) => (user.permissions || []).includes(key));

  // Logged in but wrong role, and no delegated permission covers this route.
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role) &&
    !hasRequiredPermission
  ) {
    if (allowedRoles.length === 1 && allowedRoles[0] === "admin") {
      return (
        <Navigate
          to="/login"
          replace
          state={{
            accessDenied: "Access denied. This application is available to Admin users only.",
          }}
        />
      );
    }

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

    if (user.role === "manager" || user.role === "hr") {
      return (
        <Navigate
          to="/admin/dashboard"
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
