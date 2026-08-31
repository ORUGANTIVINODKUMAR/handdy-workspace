import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import useAuth from "../../context/useAuth";
import AdminSidebar from "../admin/AdminSidebar";
import "../../styles/adminLayout.css";

function DashboardLayout({ title, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.fullName || "System Admin";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const handleLogout = async () => {
    await logout();
    navigate(user?.role === "admin" ? "/admin/login" : "/login");
  };

  if (user?.role === "admin") {
    return (
      <div className="admin-page">
        <AdminSidebar />

        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="admin-eyebrow">
                EMPLOYEE TIME &amp; ATTENDANCE
              </p>

              <h1>{title}</h1>
            </div>

            <div className="admin-user">
              <div className="admin-user-avatar" aria-hidden="true">
                {initials || "SA"}
              </div>

              <div className="admin-user-info">
                <strong>
                  {displayName}
                </strong>

                <span>
                  {user?.role?.replace("_", " ") || "admin"}
                </span>
              </div>

              <button
                className="logout-button"
                type="button"
                onClick={handleLogout}
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          </header>

          <main className="admin-content">
            {children}
          </main>
        </div>
      </div>
    );
  }

  const dashboardPath =
    user?.role === "team_lead"
      ? "/team-lead/dashboard"
      : "/employee/dashboard";

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            Employee Time &amp; Attendance
          </p>

          <h1>{title}</h1>
        </div>

        <div className="user-summary">
          
          <div>
            <p className="user-name">
              {user?.fullName}
            </p>

            <p className="user-role">
              {user?.role?.replace("_", " ")}
            </p>
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <nav
        className="dashboard-navigation"
        aria-label="Main navigation"
      >
        <NavLink to={dashboardPath}>
          Dashboard
        </NavLink>

        {user?.role === "team_lead" && (
          <NavLink to="/employees">
            My Team
          </NavLink>
        )}

        <NavLink to="/profile">
          My Profile
        </NavLink>
      </nav>

      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
