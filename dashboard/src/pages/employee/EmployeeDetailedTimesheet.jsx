import { useState } from "react";
import { ChevronUp, FileSpreadsheet } from "lucide-react";

import EmployeeSidebar from "./EmployeeSidebar";

import "../../styles/employeeDashboard.css";
import "../../styles/employeeSidebar.css";
import "../../styles/employeeDetailedTimesheet.css";

function EmployeeDetailedTimesheet() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sujith Madugula";

  const [filter, setFilter] = useState("");
  const [fromDate, setFromDate] = useState("2026-08-26");
  const [toDate, setToDate] = useState("2026-08-26");
  const [timezone, setTimezone] = useState("");
  const [reportOpen, setReportOpen] = useState(true);

  const rows = [
    {
      id: 1,
      date: "08-26-2026",
      team: "WCPA",
      employee: employeeName,
      time: "02:47:09 PM - 03:08:29 PM",
      client: "-",
      project: "-",
      task: "No timer",
      notes: "-",
      count: "0",
      type: "Break time",
      duration: "00:21:20",
    },
  ];

  const totals = {
    idle: "00:00:00",
    work: "00:00:00",
    break: "00:21:20",
    workBreak: "00:21:20",
    all: "00:21:20",
  };

  const handleGo = () => {
    console.log({
      filter,
      fromDate,
      toDate,
      timezone,
    });
  };

  const handleExport = () => {
    console.log("Export to Excel");
  };

  const getTypeClass = (type) => {
    if (type === "Work time") {
      return "employee-detail-type-work";
    }

    if (type === "Break time") {
      return "employee-detail-type-break";
    }

    if (type === "Idle time") {
      return "employee-detail-type-idle";
    }

    return "";
  };

  return (
    <div className="employee-page">

      <EmployeeSidebar />

      <div className="employee-main">

        {/* TOP BAR */}
        <header className="employee-topbar">
          <div />

          <div className="employee-user">
            <span className="employee-user-icon">
              ♙
            </span>

            <strong>
              {employeeName}
            </strong>
          </div>
        </header>

        {/* CONTENT */}
        <main className="employee-content">

          <div className="employee-detail-page">

            {/* TITLE + FILTER */}
            <div className="employee-detail-heading-row">

              <h1>
                My detailed timesheet
              </h1>

              <select
                className="employee-detail-filter"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
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

            {/* HELP */}
            <p className="employee-detail-help">
              Please select date and click go button to generate the report
            </p>

            {/* FILTER CONTROLS */}
            <div className="employee-detail-controls">

              <div className="employee-detail-date">
                <label>
                  From
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) =>
                    setFromDate(event.target.value)
                  }
                />
              </div>

              <div className="employee-detail-date">
                <label>
                  To
                </label>

                <input
                  type="date"
                  value={toDate}
                  onChange={(event) =>
                    setToDate(event.target.value)
                  }
                />
              </div>

              <select
                className="employee-detail-timezone"
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

                <option value="America/New_York">
                  America/New_York
                </option>

                <option value="UTC">
                  UTC
                </option>
              </select>

              <button
                type="button"
                className="employee-detail-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            {/* REPORT */}
            <section className="employee-detail-report">

              {/* BLUE HEADER */}
              <div className="employee-detail-report-header">
                {employeeName} (WCPA) report - 08-26-2026 to 08-26-2026
              </div>

              {/* EXPORT */}
              <div className="employee-detail-export-row">

                <button
                  type="button"
                  className="employee-detail-export"
                  onClick={handleExport}
                >
                  Export to Excel

                  <FileSpreadsheet size={15} />
                </button>

              </div>

              {/* EMPLOYEE ACCORDION */}
              <button
                type="button"
                className="employee-detail-employee-row"
                onClick={() =>
                  setReportOpen(
                    (previous) => !previous
                  )
                }
              >
                <span className="employee-detail-minus">
                  −
                </span>

                <span>
                  {employeeName}
                </span>

                <ChevronUp
                  size={18}
                  className={
                    reportOpen
                      ? "employee-detail-chevron open"
                      : "employee-detail-chevron"
                  }
                />
              </button>

              {reportOpen && (
                <>
                  {/* TABLE */}
                  <div className="employee-detail-table-wrapper">

                    <table className="employee-detail-table">

                      <thead>
                        <tr>
                          <th />
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

                          <th>
                            Duration
                            <small>
                              (hh:mm:ss)
                            </small>
                          </th>
                        </tr>
                      </thead>

                      <tbody>

                        {rows.map((row) => (
                          <tr key={row.id}>

                            <td>
                              <span className="employee-detail-avatar">
                                T
                              </span>
                            </td>

                            <td>
                              {row.date}
                            </td>

                            <td>
                              {row.team}
                            </td>

                            <td>
                              {row.employee}
                            </td>

                            <td>
                              {row.time}
                            </td>

                            <td>
                              {row.client}
                            </td>

                            <td>
                              {row.project}
                            </td>

                            <td>
                              {row.task}
                            </td>

                            <td>
                              {row.notes}
                            </td>

                            <td>
                              {row.count}
                            </td>

                            <td
                              className={
                                getTypeClass(row.type)
                              }
                            >
                              {row.type}
                            </td>

                            <td>
                              {row.duration}
                            </td>

                          </tr>
                        ))}

                      </tbody>

                    </table>

                  </div>

                  {/* TOTALS */}
                  <div className="employee-detail-totals">

                    <div className="employee-detail-total employee-detail-total-idle">
                      <span>
                        Total idle time
                      </span>

                      <strong>
                        {totals.idle}
                      </strong>
                    </div>

                    <div className="employee-detail-total employee-detail-total-work">
                      <span>
                        Total work time
                      </span>

                      <strong>
                        {totals.work}
                      </strong>
                    </div>

                    <div className="employee-detail-total employee-detail-total-break">
                      <span>
                        Total break time
                      </span>

                      <strong>
                        {totals.break}
                      </strong>
                    </div>

                    <div className="employee-detail-total employee-detail-total-blue-light">
                      <span>
                        Total time (work time + break time)
                      </span>

                      <strong>
                        {totals.workBreak}
                      </strong>
                    </div>

                    <div className="employee-detail-total employee-detail-total-blue">
                      <span>
                        Total time (work time + break time + idle time)
                      </span>

                      <strong>
                        {totals.all}
                      </strong>
                    </div>

                  </div>
                </>
              )}

            </section>

          </div>

        </main>

        {/* FOOTER */}
        <footer className="employee-footer">

          <span>
            Copyright 2026
          </span>

          <strong>
            Handdy.com
          </strong>

          <span>
            . All rights reserved
          </span>

        </footer>

      </div>

    </div>
  );
}

export default EmployeeDetailedTimesheet;