import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminTimesheet() {
  const [view, setView] = useState("day");
  const [date, setDate] = useState("");
  const [timezone, setTimezone] = useState("");

  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const getViewLabel = () => {
    if (view === "day") return "Day view";
    if (view === "week") return "Week view";
    if (view === "month") return "Month view";
    return "Date range";
  };

  return (
    <DashboardLayout title="My Timesheet">
      <section className="admin-card">
        <div className="timesheet-heading">
          <h2>My timesheet - {getViewLabel()}</h2>
        </div>

        <div className="timesheet-top-row">
          <div className="timesheet-view-tabs">
            <button
              type="button"
              className={`timesheet-view-button ${
                view === "day" ? "active" : ""
              }`}
              onClick={() => setView("day")}
            >
              Day view
            </button>

            <button
              type="button"
              className={`timesheet-view-button ${
                view === "week" ? "active" : ""
              }`}
              onClick={() => setView("week")}
            >
              Week view
            </button>

            <button
              type="button"
              className={`timesheet-view-button ${
                view === "month" ? "active" : ""
              }`}
              onClick={() => setView("month")}
            >
              Month view
            </button>

            <button
              type="button"
              className={`timesheet-view-button ${
                view === "range" ? "active" : ""
              }`}
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
              <span>
                {filterType
                  ? filterType.charAt(0).toUpperCase() +
                    filterType.slice(1)
                  : "Filter"}
              </span>

              <span>{showFilter ? "⌃" : "⌄"}</span>
            </button>

            {showFilter && (
              <div className="timesheet-filter-menu">
                <input
                  type="text"
                  className="timesheet-filter-search"
                  placeholder="Search..."
                  value={filterSearch}
                  onChange={(event) =>
                    setFilterSearch(event.target.value)
                  }
                />

                <button
                  type="button"
                  className={`timesheet-filter-option ${
                    filterType === "" ? "active" : ""
                  }`}
                  onClick={() => {
                    setFilterType("");
                    setShowFilter(false);
                  }}
                >
                  Filter
                </button>

                <button
                  type="button"
                  className={`timesheet-filter-option ${
                    filterType === "client" ? "active" : ""
                  }`}
                  onClick={() => {
                    setFilterType("client");
                    setShowFilter(false);
                  }}
                >
                  Client
                </button>

                <button
                  type="button"
                  className={`timesheet-filter-option ${
                    filterType === "project" ? "active" : ""
                  }`}
                  onClick={() => {
                    setFilterType("project");
                    setShowFilter(false);
                  }}
                >
                  Project
                </button>

                <button
                  type="button"
                  className={`timesheet-filter-option ${
                    filterType === "task" ? "active" : ""
                  }`}
                  onClick={() => {
                    setFilterType("task");
                    setShowFilter(false);
                  }}
                >
                  Task
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="timesheet-help-text">
          Please select date and click Go to generate the report
        </p>

        <div className="timesheet-filters">
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
            <option value="Asia/Kolkata">
              Asia/Kolkata
            </option>
            <option value="UTC">UTC</option>
          </select>

          <button
            type="button"
            className="timesheet-go-button"
          >
            Go
          </button>
        </div>

        <div className="timesheet-report">
          <div className="timesheet-report-title">
            Timesheet - {getViewLabel()} report
          </div>

          <div className="timesheet-report-toolbar">
            <h3>Break time</h3>

            <button
              type="button"
              className="timesheet-export-button"
            >
              Export to Excel
            </button>
          </div>

          <div className="timesheet-table-wrapper">
            <table className="timesheet-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Notes</th>
                  <th>Count</th>
                  <th>Break time</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>-</td>
                  <td>-</td>
                  <td>No timer</td>
                  <td>-</td>
                  <td>0</td>
                  <td>00:00:00</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="timesheet-total-row">
            <span>Total break time</span>
            <strong>00:00:00</strong>
          </div>

          <div className="timesheet-grand-total">
            <span>Total (work time + break time)</span>
            <strong>00:00:00</strong>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminTimesheet;