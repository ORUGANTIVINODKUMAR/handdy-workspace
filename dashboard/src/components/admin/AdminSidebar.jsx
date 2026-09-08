import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import useAuth from "../../context/useAuth";

import {
  BookOpen,
  Layers,
  ClipboardList,
  ReceiptText,
  Users,
  Globe2,
  PanelTop,
  UserRoundPlus,
  UserRound,
  UserRoundCheck,
  Settings,
  LockKeyhole,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Menu,
  X,
} from "lucide-react";

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Keep large navigation groups closed so the sidebar stays easy to scan.
  const [myTimesheetOpen, setMyTimesheetOpen] = useState(false);

  // Keep the others closed initially
  const [timesheetsOpen, setTimesheetsOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `admin-handdy-link${isActive ? " active" : ""}`;

  const subNavClass = ({ isActive }) =>
    `admin-handdy-sublink${isActive ? " active" : ""}`;

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
      console.error("Logout failed:", error);
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
        className={`admin-handdy-sidebar ${
          collapsed ? "collapsed" : ""
        }${mobileOpen ? " is-mobile-open" : ""}`}
      >
        {/* =====================================
            BRAND
        ===================================== */}

        <div className="admin-handdy-brand">
          <div className="admin-handdy-logo">
            <Clock3 size={20} strokeWidth={2.2} />
          </div>

          {!collapsed && (
            <div className="admin-handdy-name">
              CRM
            </div>
          )}

          <button
            type="button"
            className="admin-handdy-collapse"
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
              <X size={17} />
            ) : collapsed ? (
              <ChevronsRight size={17} />
            ) : (
              <ChevronsLeft size={17} />
            )}
          </button>
        </div>

        <nav className="admin-handdy-nav">

          {/* =====================================
              HOME
          ===================================== */}

          <section className="admin-handdy-section">

            {!collapsed && (
              <h3>
                HOME
              </h3>
            )}

            {/* EMPLOYEE INSIGHTS */}

            <NavLink
              to="/admin/dashboard"
              className={navClass}
              title={
                collapsed
                  ? "Employee Insights"
                  : ""
              }
            >
              <BookOpen size={19} />

              {!collapsed && (
                <span>
                  Employee Insights
                </span>
              )}
            </NavLink>


            {/* =====================================
                MY TIMESHEET
            ===================================== */}

            <button
              type="button"
              className="admin-handdy-link admin-handdy-parent"
              onClick={() => {
                if (!collapsed) {
                  setMyTimesheetOpen(
                    (previous) => !previous
                  );
                }
              }}
              title={
                collapsed
                  ? "My Timesheet"
                  : ""
              }
            >
              <Layers size={19} />

              {!collapsed && (
                <>
                  <span>
                    My Timesheet
                  </span>

                  {myTimesheetOpen ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </>
              )}
            </button>


            {/* MY TIMESHEET SUBMENU */}

            {!collapsed && myTimesheetOpen && (
              <div className="admin-handdy-submenu">

                <NavLink
                  to="/admin/my-timesheet"
                  end
                  className={subNavClass}
                >
                  My timesheet
                </NavLink>

                <NavLink
                  to="/admin/my-timesheet/details"
                  className={subNavClass}
                >
                  My detailed timesheet
                </NavLink>

                <NavLink
                  to="/admin/my-timesheet/count"
                  className={subNavClass}
                >
                  My count report
                </NavLink>

              </div>
            )}


            {/* =====================================
                TIMESHEETS
            ===================================== */}

            <button
              type="button"
              className="admin-handdy-link admin-handdy-parent"
              onClick={() => {
                if (!collapsed) {
                  setTimesheetsOpen(
                    (previous) => !previous
                  );
                }
              }}
              title={
                collapsed
                  ? "Timesheets"
                  : ""
              }
            >
              <ClipboardList size={19} />

              {!collapsed && (
                <>
                  <span>
                    Timesheets
                  </span>

                  {timesheetsOpen ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </>
              )}
            </button>


            {/* TIMESHEETS SUBMENU */}

            {!collapsed && timesheetsOpen && (
              <div className="admin-handdy-submenu">

                <NavLink
                  to="/admin/timesheets/team"
                  className={subNavClass}
                >
                  Team timesheet
                </NavLink>

                <NavLink
                  to="/admin/timesheets/detailed"
                  className={subNavClass}
                >
                  Detailed timesheet
                </NavLink>

                <NavLink
                  to="/admin/timesheets/project-hours"
                  className={subNavClass}
                >
                  Project hours
                </NavLink>

              </div>
            )}

            <NavLink
              to="/admin/billing"
              className={navClass}
              title={collapsed ? "Billing" : ""}
            >
              <ReceiptText size={19} />
              {!collapsed && <span>Billing</span>}
            </NavLink>

          </section>


          {/* =====================================
              MANAGE
          ===================================== */}

          <section className="admin-handdy-section">

            {!collapsed && (
              <h3>
                MANAGE
              </h3>
            )}

            <NavLink
              to="/admin/clients"
              className={navClass}
              title={
                collapsed
                  ? "Clients"
                  : ""
              }
            >
              <Users size={19} />

              {!collapsed && (
                <span>
                  Clients
                </span>
              )}
            </NavLink>


            <NavLink
              to="/admin/projects"
              className={navClass}
              title={
                collapsed
                  ? "Projects"
                  : ""
              }
            >
              <Globe2 size={19} />

              {!collapsed && (
                <span>
                  Projects
                </span>
              )}
            </NavLink>


            <NavLink
              to="/admin/tasks"
              className={navClass}
              title={
                collapsed
                  ? "Tasks"
                  : ""
              }
            >
              <PanelTop size={19} />

              {!collapsed && (
                <span>
                  Tasks
                </span>
              )}
            </NavLink>


            <NavLink
              to="/admin/team"
              className={navClass}
              title={
                collapsed
                  ? "Team"
                  : ""
              }
            >
              <UserRoundPlus size={19} />

              {!collapsed && (
                <span>
                  Team
                </span>
              )}
            </NavLink>


            <NavLink
              to="/admin/employees"
              className={navClass}
              title={
                collapsed
                  ? "Employees"
                  : ""
              }
            >
              <UserRound size={19} />

              {!collapsed && (
                <span>
                  Employees
                </span>
              )}
            </NavLink>

            <NavLink
              to="/admin/permissions"
              className={navClass}
              title={
                collapsed
                  ? "Permissions"
                  : ""
              }
            >
              <UserRoundCheck size={19} />

              {!collapsed && (
                <span>
                  Permissions
                </span>
              )}
            </NavLink>

          </section>


          {/* =====================================
              MY ACCOUNT
          ===================================== */}

          <section className="admin-handdy-section">

            {!collapsed && (
              <h3>
                MY ACCOUNT
              </h3>
            )}
            <NavLink
              to="/admin/settings"
              className={navClass}
              title={
                collapsed
                  ? "Settings"
                  : ""
              }
            >
              <Settings size={19} />

              {!collapsed && (
                <span>
                  Settings
                </span>
              )}
            </NavLink>

            <button
              type="button"
              className="admin-handdy-link"
              onClick={handleLogout}
              title={
                collapsed
                  ? "Logout"
                  : ""
              }
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
            --admin-handdy-current-width: ${
              collapsed
                ? "72px"
                : "260px"
            };
          }
        `}
      </style>
    </>
  );
}

export default AdminSidebar;
