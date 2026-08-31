import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminTeamTimesheet() {
  const [view, setView] = useState("day");
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [date, setDate] = useState("");
  const [timezone, setTimezone] = useState("");

  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState("");

  const getViewLabel = () => {
    if (view === "day") return "Day view";
    if (view === "week") return "Week view";
    if (view === "month") return "Month view";
    return "Date range";
  };

  return (
    <DashboardLayout title="Team Timesheet">
      <section className="admin-card team-timesheet-card">
        <div className="team-timesheet-heading">
          <h2>Daily report</h2>
        </div>

        <div className="team-timesheet-top-row">
          <div className="timesheet-view-tabs">
            <button
              type="button"
              className={view === "day" ? "active" : ""}
              onClick={() => setView("day")}
            >
              Day view
            </button>

            <button
              type="button"
              className={view === "week" ? "active" : ""}
              onClick={() => setView("week")}
            >
              Week view
            </button>

            <button
              type="button"
              className={view === "month" ? "active" : ""}
              onClick={() => setView("month")}
            >
              Month view
            </button>

            <button
              type="button"
              className={view === "range" ? "active" : ""}
              onClick={() => setView("range")}
            >
              Date range
            </button>
          </div>

          <div className="timesheet-filter-box">
            <button
              type="button"
              className="timesheet-filter-button"
              onClick={() =>
                setShowFilter((previous) => !previous)
              }
            >
              <span>{filterType || "Filter"}</span>
              <span>{showFilter ? "⌃" : "⌄"}</span>
            </button>

            {showFilter && (
              <div className="timesheet-filter-menu">
                <button
                  type="button"
                  className="timesheet-filter-option active"
                  onClick={() => {
                    setFilterType("");
                    setShowFilter(false);
                  }}
                >
                  Filter
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
                  onClick={() => {
                    setFilterType("Team");
                    setShowFilter(false);
                  }}
                >
                  Team
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
                  onClick={() => {
                    setFilterType("Employee");
                    setShowFilter(false);
                  }}
                >
                  Employee
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
                  onClick={() => {
                    setFilterType("Project");
                    setShowFilter(false);
                  }}
                >
                  Project
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="timesheet-help-text">
          Please select team, employee and date. Then click Go to generate your report
        </p>

        <div className="team-timesheet-controls">
          <select
            value={team}
            onChange={(event) =>
              setTeam(event.target.value)
            }
          >
            <option value="">Select team</option>
            <option value="team1">Development Team</option>
            <option value="team2">Testing Team</option>
            <option value="team3">Support Team</option>
          </select>

          <select
            value={employee}
            onChange={(event) =>
              setEmployee(event.target.value)
            }
          >
            <option value="">Select employee</option>
            <option value="admin">System Admin</option>
          </select>

          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
          />

          <select
            value={timezone}
            onChange={(event) =>
              setTimezone(event.target.value)
            }
          >
            <option value="">Select Timezone</option>
            <option value="Asia/Kolkata">Asia/Kolkata</option>
            <option value="UTC">UTC</option>
          </select>

          <button
            type="button"
            className="team-timesheet-go-button"
          >
            Go
          </button>
        </div>

        <div className="team-timesheet-report">
          <div className="team-timesheet-report-title">
            {getViewLabel()} report
          </div>

          <div className="team-timesheet-empty">
            No record found
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminTeamTimesheet;