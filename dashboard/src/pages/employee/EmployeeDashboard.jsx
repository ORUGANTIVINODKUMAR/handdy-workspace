import { useState } from "react";

import EmployeeSidebar from "./EmployeeSidebar";

import "../../styles/employeeDashboard.css";
import "../../styles/employeeSidebar.css";

function EmployeeDashboard() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sujith Madugula";

  const [date, setDate] =
    useState("2026-08-25");

  const handleGo = () => {
    console.log({
      date,
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

          <div className="employee-dashboard-page">

            <h1>
              Employee Insights
            </h1>

            {/* FILTER */}
            <div className="employee-dashboard-controls">

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
              />

              <button
                type="button"
                className="employee-dashboard-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            {/* TIMESHEET CARD */}
            <section className="employee-timesheet-card">

              <h2>
                Timesheet
              </h2>

              <p>
                No records found
              </p>

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

export default EmployeeDashboard;