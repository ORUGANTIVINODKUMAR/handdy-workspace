import { useMemo, useState } from "react";
import TeamLeadSidebar from "./TeamLeadSidebar";
import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadMyTimesheet.css";

function TeamLeadMyTimesheet() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [view, setView] = useState("day");
  const [selectedDate, setSelectedDate] =
    useState("2026-08-25");
  const [timezone, setTimezone] = useState("");
  const [filter, setFilter] = useState("");

  const displayDate = useMemo(() => {
    const [year, month, day] =
      selectedDate.split("-");

    return `${month}-${day}-${year}`;
  }, [selectedDate]);

  const handleGo = () => {
    console.log({
      view,
      selectedDate,
      timezone,
      filter,
    });
  };

  return (
    <div className="tl-page">

      <TeamLeadSidebar />

      <div className="tl-main">

        <header className="tl-topbar">
          <div />

          <div className="tl-user">
            <span className="tl-user-icon">
              ♙
            </span>

            <strong>
              {storedUser.fullName ||
                "Team Lead"}
            </strong>
          </div>
        </header>

        <main className="tl-content">

          <div className="tl-timesheet-page">

            <h1 className="tl-timesheet-title">
              My timesheet -{" "}
              {view === "day"
                ? "Day view"
                : view === "week"
                ? "Week view"
                : view === "month"
                ? "Month view"
                : "Date range"}
            </h1>

            <div className="tl-timesheet-top-row">

              <div className="tl-timesheet-view-buttons">

                <button
                  type="button"
                  className={
                    view === "day"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setView("day")
                  }
                >
                  Day view
                </button>

                <button
                  type="button"
                  className={
                    view === "week"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setView("week")
                  }
                >
                  Week view
                </button>

                <button
                  type="button"
                  className={
                    view === "month"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setView("month")
                  }
                >
                  Month view
                </button>

                <button
                  type="button"
                  className={
                    view === "range"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setView("range")
                  }
                >
                  Date range
                </button>

              </div>

              <select
                className="tl-timesheet-filter"
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Filter
                </option>

                <option value="client">
                  Client
                </option>

                <option value="project">
                  Project
                </option>

                <option value="task">
                  Task
                </option>
              </select>

            </div>

            <p className="tl-timesheet-help">
              Please select date and click go
              button to generate the report
            </p>

            <div className="tl-timesheet-controls">

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value
                  )
                }
              />

              <select
                value={timezone}
                onChange={(event) =>
                  setTimezone(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select Timezone
                </option>

                <option value="Asia/Kolkata">
                  Asia/Kolkata
                </option>

                <option value="America/New_York">
                  America/New_York
                </option>

                <option value="UTC">
                  UTC
                </option>
              </select>

              <button
                type="button"
                className="tl-timesheet-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            <section className="tl-timesheet-report">

              <div className="tl-timesheet-report-title">
                Timesheet - Day view report for{" "}
                {displayDate}
              </div>

              <div className="tl-timesheet-report-body">

                <div className="tl-report-section-heading">

                  <h3>
                    Work time
                  </h3>

                  <button
                    type="button"
                    className="tl-export-button"
                  >
                    Export to Excel →
                  </button>

                </div>

                <div className="tl-timesheet-table-wrapper">

                  <table className="tl-timesheet-table">

                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Project</th>
                        <th>Task</th>
                        <th>Notes</th>
                        <th>Count</th>
                        <th>
                          Work time
                          <small>
                            {" "}
                            (hh:mm:ss)
                          </small>
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      <tr>
                        <td>WCPA</td>
                        <td>Audit</td>
                        <td>
                          Admin Work - Billable
                        </td>
                        <td></td>
                        <td>0</td>
                        <td>00:04:01</td>
                      </tr>

                      <tr className="tl-total-row">
                        <td
                          colSpan="5"
                          className="tl-total-label"
                        >
                          Total work time
                        </td>

                        <td>
                          <strong>
                            00:04:01
                          </strong>
                        </td>
                      </tr>

                    </tbody>

                  </table>

                </div>

                <h3 className="tl-break-heading">
                  Break time
                </h3>

                <div className="tl-timesheet-table-wrapper">

                  <table className="tl-timesheet-table">

                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Project</th>
                        <th>Task</th>
                        <th>Notes</th>
                        <th>Count</th>
                        <th>
                          Break time
                          <small>
                            {" "}
                            (hh:mm:ss)
                          </small>
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      <tr>
                        <td>-</td>
                        <td>-</td>
                        <td>No timer</td>
                        <td></td>
                        <td>0</td>
                        <td>00:07:11</td>
                      </tr>

                      <tr className="tl-total-row">
                        <td
                          colSpan="5"
                          className="tl-total-label"
                        >
                          Total break time
                        </td>

                        <td>
                          <strong>
                            00:07:11
                          </strong>
                        </td>
                      </tr>

                    </tbody>

                  </table>

                </div>

                <div className="tl-grand-total">

                  <span>
                    Total
                    (work time + break time)
                  </span>

                  <strong>
                    00:11:12
                  </strong>

                </div>

              </div>

            </section>

          </div>

        </main>

        <footer className="tl-footer">

          <span>
            Copyright 2026
          </span>

          <strong>
            TimeTrack
          </strong>

          <span>
            . All rights reserved
          </span>

        </footer>

      </div>

    </div>
  );
}

export default TeamLeadMyTimesheet;