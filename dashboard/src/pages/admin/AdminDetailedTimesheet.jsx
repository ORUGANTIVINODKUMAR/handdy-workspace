import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminDetailedTimesheet() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timezone, setTimezone] = useState("");

  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [rows] = useState([
    {
      id: 1,
      date: "08-18-2026",
      teamName: "",
      empName: "System Admin",
      time: "07:36:02 AM - 07:36:21 AM",
      client: "-",
      project: "-",
      task: "No timer",
      notes: "-",
      count: 0,
      type: "Break time",
      duration: "00:00:19",
    },
    {
      id: 2,
      date: "08-18-2026",
      teamName: "",
      empName: "System Admin",
      time: "07:36:22 AM - 07:46:00 AM",
      client: "No client",
      project: "No project",
      task: "AI Idle",
      notes: "-",
      count: 0,
      type: "Break time",
      duration: "00:09:38",
    },
  ]);

  return (
    <DashboardLayout title="My Detailed Timesheet">
      <section className="admin-card detailed-timesheet-card">

        <div className="detailed-timesheet-heading-row">
          <div>
            <p className="admin-eyebrow">TIMESHEET</p>
            <h2>My detailed timesheet</h2>
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
                  value={filterSearch}
                  onChange={(event) =>
                    setFilterSearch(event.target.value)
                  }
                />

                <button
                  type="button"
                  className="timesheet-filter-option active"
                  onClick={() => setFilterType("")}
                >
                  Filter
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
                  onClick={() => {
                    setFilterType("client");
                    setShowFilter(false);
                  }}
                >
                  Client
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
                  onClick={() => {
                    setFilterType("project");
                    setShowFilter(false);
                  }}
                >
                  Project
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
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

        <div className="detailed-timesheet-controls">
          <div className="date-control-group">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="date-control-group">
            <label>To</label>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(event.target.value)
              }
            />
          </div>

          <select
            value={timezone}
            onChange={(event) =>
              setTimezone(event.target.value)
            }
          >
            <option value="">
              Select Timezone
            </option>

            <option value="Asia/Kolkata">
              Asia/Kolkata
            </option>

            <option value="UTC">
              UTC
            </option>
          </select>

          <button
            type="button"
            className="detailed-go-button"
          >
            Go
          </button>
        </div>

        <div className="detailed-report-card">
          <div className="detailed-report-title">
            System Admin report
            {fromDate || toDate
              ? ` - ${fromDate || "..."} to ${toDate || "..."}`
              : ""}
          </div>

          <div className="detailed-report-toolbar">
            <span>System Admin</span>

            <button type="button">
              Export to Excel →
            </button>
          </div>

          <div className="detailed-table-wrapper">
            <table className="detailed-timesheet-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team name</th>
                  <th>Emp name</th>
                  <th>Time</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>Notes</th>
                  <th>Count</th>
                  <th>Type</th>
                  <th>Duration</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.teamName || "-"}</td>
                    <td>{row.empName}</td>
                    <td>{row.time}</td>
                    <td>{row.client}</td>
                    <td>{row.project}</td>
                    <td>{row.task}</td>
                    <td>{row.notes}</td>
                    <td>{row.count}</td>

                    <td
                      className={
                        row.type === "Break time"
                          ? "timesheet-type-break"
                          : ""
                      }
                    >
                      {row.type}
                    </td>

                    <td>{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="detailed-summary">
            <div className="summary-line idle">
              <span>Total idle time</span>
              <strong>00:00:00</strong>
            </div>

            <div className="summary-line work">
              <span>Total work time</span>
              <strong>00:00:00</strong>
            </div>

            <div className="summary-line break">
              <span>Total break time</span>
              <strong>00:09:57</strong>
            </div>
          </div>

          <div className="detailed-total light">
            <span>Total time (work time + break time)</span>
            <strong>00:09:57</strong>
          </div>

          <div className="detailed-total dark">
            <span>
              Total time (work time + break time + idle time)
            </span>

            <strong>00:09:57</strong>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminDetailedTimesheet;