import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";

import EmployeeSidebar from "./EmployeeSidebar";

import "../../styles/employeeDashboard.css";
import "../../styles/employeeSidebar.css";
import "../../styles/employeeMyTimesheet.css";

function EmployeeMyTimesheet() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sujith Madugula";

  const [view, setView] = useState("day");
  const [date, setDate] = useState("2026-08-26");
  const [timezone, setTimezone] = useState("");
  const [filter, setFilter] = useState("");

  const breakRows = [
    {
      id: 1,
      client: "-",
      project: "-",
      task: "No timer",
      notes: "",
      count: 0,
      breakTime: "00:21:20",
    },
  ];

  const totalBreakTime = "00:21:20";
  const totalTime = "00:21:20";

  const handleGo = () => {
    console.log({
      view,
      date,
      timezone,
      filter,
    });
  };

  const handleExport = () => {
    console.log("Export employee timesheet to Excel");
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

          <div className="employee-timesheet-page">

            {/* TITLE */}
            <div className="employee-timesheet-heading-row">

              <h1>
                My timesheet - Day view
              </h1>

              <select
                className="employee-timesheet-filter"
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

            {/* VIEW BUTTONS */}
            <div className="employee-timesheet-tabs">

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

            {/* HELP TEXT */}
            <p className="employee-timesheet-help">
              Please select date and click go button to generate the report
            </p>

            {/* CONTROLS */}
            <div className="employee-timesheet-controls">

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
              />

              <select
                className="employee-timesheet-timezone"
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
                className="employee-timesheet-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            {/* REPORT */}
            <section className="employee-timesheet-report">

              {/* REPORT HEADER */}
              <div className="employee-timesheet-report-header">
                Timesheet - Day view report for 08-26-2026
              </div>

              {/* EXPORT */}
              <div className="employee-timesheet-export-row">

                <button
                  type="button"
                  className="employee-timesheet-export"
                  onClick={handleExport}
                >
                  Export to Excel

                  <FileSpreadsheet size={15} />
                </button>

              </div>

              {/* BREAK TIME LABEL */}
              <h3 className="employee-timesheet-section-title">
                Break time
              </h3>

              {/* TABLE */}
              <div className="employee-timesheet-table-wrapper">

                <table className="employee-timesheet-table">

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
                          (hh:mm:ss)
                        </small>
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {breakRows.map((row) => (
                      <tr key={row.id}>

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

                        <td>
                          {row.breakTime}
                        </td>

                      </tr>
                    ))}

                    <tr className="employee-timesheet-total-break-row">

                      <td colSpan="5">
                        Total break time
                      </td>

                      <td>
                        <strong>
                          {totalBreakTime}
                        </strong>
                      </td>

                    </tr>

                    <tr className="employee-timesheet-grand-total-row">

                      <td colSpan="5">
                        Total (work time + break time)
                      </td>

                      <td>
                        <strong>
                          {totalTime}
                        </strong>
                      </td>

                    </tr>

                  </tbody>

                </table>

              </div>

            </section>

          </div>

        </main>

        {/* FOOTER */}
        <footer className="employee-footer">

          <span>
            Copyright 2026
          </span>

          <strong>
            CRM
          </strong>

          <span>
            . All rights reserved
          </span>

        </footer>

      </div>

    </div>
  );
}

export default EmployeeMyTimesheet;