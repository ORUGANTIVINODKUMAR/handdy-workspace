import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  BookOpen,
  Layers,
  ClipboardList,
  PanelTop,
  LockKeyhole,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Menu,
  X,
} from "lucide-react";

import useAuth from "../../context/useAuth";
import "../../styles/teamLeadSidebar.css";

function TeamLeadSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [myTimesheetOpen, setMyTimesheetOpen] = useState(false);
  const [timesheetsOpen, setTimesheetsOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navClass = ({ isActive }) =>
    `tl-sidebar-link${isActive ? " active" : ""}`;

  const subNavClass = ({ isActive }) =>
    `tl-sidebar-sublink${isActive ? " active" : ""}`;

  const handleCollapse = () => {
    if (mobileOpen) {
      setMobileOpen(false);
      return;
    }
    setCollapsed((previous) => !previous);
  };

  // ==========================================
  // LOGOUT
  // ==========================================
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    } finally {
      // IMPORTANT:
      // Use the ONE main login page.
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
        className={`tl-sidebar${collapsed ? " collapsed" : ""}${
          mobileOpen ? " is-mobile-open" : ""
        }`}
      >
        {/* =====================================
            BRAND
        ===================================== */}

        <div className="tl-brand">

          <div className="tl-brand-circle">
            <Clock3 size={20} strokeWidth={2.2} />
          </div>

          {!collapsed && (
            <div className="tl-brand-name">
              Handdy
            </div>
          )}

          <button
            type="button"
            className="tl-collapse-button"
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

        {/* =====================================
            NAVIGATION
        ===================================== */}

        <nav className="tl-sidebar-nav">

          {/* =================================
              HOME
          ================================= */}

          <section className="tl-menu-section">

            {!collapsed && (
              <h3 className="tl-menu-title">
                HOME
              </h3>
            )}

            {/* EMPLOYEE INSIGHTS */}
            <NavLink
              to="/team-lead/employee-insights"
              className={navClass}
              title={collapsed ? "Employee Insights" : ""}
            >
              <BookOpen size={19} />

              {!collapsed && (
                <span>
                  Employee Insights
                </span>
              )}
            </NavLink>

            {/* =================================
                MY TIMESHEET
            ================================= */}

            <button
              type="button"
              className="tl-sidebar-link tl-parent-link"
              onClick={() => !collapsed && setMyTimesheetOpen((open) => !open)}
              title={collapsed ? "My Timesheet" : ""}
            >
              <Layers size={19} />
              {!collapsed && (
                <><span>My Timesheet</span>{myTimesheetOpen ? <ChevronUp size={15} className="tl-arrow" /> : <ChevronDown size={15} className="tl-arrow" />}</>
              )}
            </button>

            {!collapsed && myTimesheetOpen && <div className="tl-sidebar-submenu">
              <NavLink to="/team-lead/timesheet" end className={subNavClass}>My timesheet</NavLink>
              <NavLink to="/team-lead/timesheet/details" className={subNavClass}>My detailed timesheet</NavLink>
              <NavLink to="/team-lead/timesheet/count" className={subNavClass}>My count report</NavLink>
            </div>}

            {/* =================================
                TIMESHEETS
            ================================= */}

            <button
              type="button"
              className="tl-sidebar-link tl-parent-link tl-timesheets-parent"
              onClick={() => !collapsed && setTimesheetsOpen((open) => !open)}
              title={collapsed ? "Timesheets" : ""}
            >
              <ClipboardList size={19} />
              {!collapsed && (
                <><span>Timesheets</span>{timesheetsOpen ? <ChevronUp size={15} className="tl-arrow" /> : <ChevronDown size={15} className="tl-arrow" />}</>
              )}
            </button>

            {!collapsed && timesheetsOpen && <div className="tl-sidebar-submenu">
              <NavLink to="/team-lead/timesheets/team" className={subNavClass}>Team timesheet</NavLink>
              <NavLink to="/team-lead/timesheets/detailed" className={subNavClass}>Detailed timesheet</NavLink>
              <NavLink to="/team-lead/timesheets/project-hours" className={subNavClass}>Project hours</NavLink>
              <NavLink to="/team-lead/timesheets/attendance" className={subNavClass}>Attendance</NavLink>
            </div>}

          </section>

          {/* =================================
              MANAGE
          ================================= */}

          <section className="tl-menu-section tl-manage-section">

            {!collapsed && (
              <h3 className="tl-menu-title">
                MANAGE
              </h3>
            )}

            <NavLink
              to="/team-lead/tasks"
              className={navClass}
              title={collapsed ? "Tasks" : ""}
            >
              <PanelTop size={19} />

              {!collapsed && (
                <span>
                  Tasks
                </span>
              )}
            </NavLink>

          </section>

          <section className="tl-menu-section tl-account-section">

            {!collapsed && <h3 className="tl-menu-title">MY ACCOUNT</h3>}

            {/* LOGOUT */}
            <button
              type="button"
              className="tl-sidebar-link tl-logout"
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
            --tl-sidebar-width: ${
              collapsed ? "72px" : "265px"
            };
          }
        `}
      </style>
    </>
  );
}

export default TeamLeadSidebar;
