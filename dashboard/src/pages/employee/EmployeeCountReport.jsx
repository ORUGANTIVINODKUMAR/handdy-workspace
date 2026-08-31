import { useState } from "react";

import EmployeeSidebar from "./EmployeeSidebar";

import "../../styles/employeeDashboard.css";
import "../../styles/employeeSidebar.css";
import "../../styles/employeeCountReport.css";

function EmployeeCountReport() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sujith Madugula";

  const [fromDate, setFromDate] =
    useState("2026-08-26");

  const [toDate, setToDate] =
    useState("2026-08-26");

  const [timezone, setTimezone] =
    useState("");

  const [rows] = useState([]);

  const handleGo = () => {
    console.log({
      fromDate,
      toDate,
      timezone,
    });
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

        {/* MAIN CONTENT */}
        <main className="employee-content">

          <div className="employee-count-page">

            {/* TITLE */}
            <h1>
              Count Report
            </h1>

            {/* HELP */}
            <p className="employee-count-help">
              Please select date and click go button to generate your report
            </p>

            {/* FILTERS */}
            <div className="employee-count-controls">

              {/* FROM */}
              <div className="employee-count-date">

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

              {/* TO */}
              <div className="employee-count-date">

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

              {/* TIMEZONE */}
              <select
                className="employee-count-timezone"
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

              {/* GO */}
              <button
                type="button"
                className="employee-count-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            {/* REPORT CARD */}
            <section className="employee-count-card">

              <div className="employee-count-table-wrapper">

                <table className="employee-count-table">

                  <thead>
                    <tr>
                      <th>
                        Date
                      </th>

                      <th>
                        Total count
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan="2"
                          className="employee-count-empty"
                        >
                          No records found
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id}>

                          <td>
                            {row.date}
                          </td>

                          <td>
                            {row.totalCount}
                          </td>

                        </tr>
                      ))
                    )}

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

export default EmployeeCountReport;