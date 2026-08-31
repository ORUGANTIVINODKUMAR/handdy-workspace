import { useEffect, useState } from "react";
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Box,
  CircleHelp,
  Layers,
  LockKeyhole,
  Package,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Menu,
  X,
} from "lucide-react";

import useAuth from "../../context/useAuth";

import "../../styles/employeeSidebar.css";

function EmployeeSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [myTimesheetOpen, setMyTimesheetOpen] =
    useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navClass = ({ isActive }) =>
    `employee-sidebar-link${
      isActive ? " active" : ""
    }`;

  const subNavClass = ({ isActive }) =>
    `employee-sidebar-sublink${
      isActive ? " active" : ""
    }`;

  const handleCollapse = () => {
    if (mobileOpen) {
      setMobileOpen(false);
      return;
    }
    setCollapsed((previous) => !previous);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  };

  return (
    <>
      <button
        type="button"
        className="app-sidebar-toggle icon-button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      <div
        className={`app-sidebar-scrim${mobileOpen ? " is-visible" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`employee-sidebar${collapsed ? " collapsed" : ""}${
          mobileOpen ? " is-mobile-open" : ""
        }`}
      >

        {/* BRAND */}
        <div className="employee-brand">

          <div className="employee-brand-circle">
            <Clock3 size={20} strokeWidth={2.2} />
          </div>

          {!collapsed && (
            <div className="employee-brand-name">
              Handdy
            </div>
          )}

          <button
            type="button"
            className="employee-collapse"
            onClick={handleCollapse}
            aria-label={
              mobileOpen
                ? "Close navigation menu"
                : collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
          >
            {mobileOpen ? (
              <X size={16} />
            ) : collapsed ? (
              <ChevronsRight size={16} />
            ) : (
              <ChevronsLeft size={16} />
            )}
          </button>

        </div>

        <nav className="employee-sidebar-nav">

          {/* HOME */}
          <section className="employee-menu-section">

            {!collapsed && (
              <h3 className="employee-menu-title">
                HOME
              </h3>
            )}

            <NavLink
              to="/employee/dashboard"
              className={navClass}
              title={collapsed ? "Employee Insights" : ""}
            >
              <Package size={19} />

              {!collapsed && (
                <span>
                  Employee Insights
                </span>
              )}
            </NavLink>

            {/* MY TIMESHEET */}
            <button
              type="button"
              className="employee-sidebar-link employee-parent-link"
              onClick={() => {
                if (!collapsed) {
                  setMyTimesheetOpen(
                    (previous) => !previous
                  );
                }
              }}
              title={collapsed ? "My Timesheet" : ""}
            >
              <Layers size={19} />

              {!collapsed && (
                <>
                  <span>
                    My Timesheet
                  </span>

                  {myTimesheetOpen ? (
                    <ChevronUp
                      size={15}
                      className="employee-arrow"
                    />
                  ) : (
                    <ChevronDown
                      size={15}
                      className="employee-arrow"
                    />
                  )}
                </>
              )}
            </button>

            {!collapsed && myTimesheetOpen && (
              <div className="employee-sidebar-submenu">

                <NavLink
                  to="/employee/timesheet"
                  className={subNavClass}
                >
                  My timesheet
                </NavLink>

                <NavLink
                  to="/employee/timesheet/details"
                  className={subNavClass}
                >
                  My detailed timesheet
                </NavLink>

                <NavLink
                  to="/employee/timesheet/count"
                  className={subNavClass}
                >
                  My count report
                </NavLink>

              </div>
            )}

          </section>

          {/* SETTINGS */}
          <section className="employee-menu-section employee-settings-section">

            {!collapsed && (
              <h3 className="employee-menu-title">
                SETTINGS
              </h3>
            )}

            <NavLink
              to="/employee/apps"
              className={navClass}
              title={collapsed ? "Apps" : ""}
            >
              <Box size={19} />

              {!collapsed && (
                <span>
                  Apps
                </span>
              )}
            </NavLink>

            <NavLink
              to="/employee/help"
              className={navClass}
              title={collapsed ? "Help" : ""}
            >
              <CircleHelp size={19} />

              {!collapsed && (
                <span>
                  Help
                </span>
              )}
            </NavLink>

            <button
              type="button"
              className="employee-sidebar-link employee-logout"
              onClick={handleLogout}
              title={collapsed ? "Logout" : ""}
            >
              <LockKeyhole size={19} />

              {!collapsed && (
                <span>
                  Logout
                </span>
              )}
            </button>

          </section>

        </nav>

      </aside>

      <style>
        {`
          :root {
            --employee-sidebar-width: ${
              collapsed ? "72px" : "265px"
            };
          }
        `}
      </style>
    </>
  );
}

export default EmployeeSidebar;
