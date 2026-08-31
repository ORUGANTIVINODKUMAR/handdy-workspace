import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadCountReport.css";

function TeamLeadCountReport() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [fromDate, setFromDate] =
    useState("2026-08-25");

  const [toDate, setToDate] =
    useState("2026-08-25");

  const [timezone, setTimezone] =
    useState("");

  const [records, setRecords] =
    useState([]);

  const employeeName =
    storedUser.fullName ||
    "Sai Teja Kanjarla";

  const handleGo = () => {
    console.log({
      employeeName,
      fromDate,
      toDate,
      timezone,
    });

    // For now we keep this empty.
    // Later this can come from backend.
    setRecords([]);
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
              {employeeName}
            </strong>
          </div>

        </header>

        <main className="tl-content">

          <div className="tl-count-page">

            <h1>
              Count Report
            </h1>

            <p className="tl-count-help">
              Please select date and click go button
              to generate your report
            </p>

            <div className="tl-count-controls">

              <div className="tl-count-date">
                <label>
                  From
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) =>
                    setFromDate(
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="tl-count-date">
                <label>
                  To
                </label>

                <input
                  type="date"
                  value={toDate}
                  onChange={(event) =>
                    setToDate(
                      event.target.value
                    )
                  }
                />
              </div>

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
                className="tl-count-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            <section className="tl-count-report-card">

              <table className="tl-count-table">

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

                  {records.length === 0 ? (
                    <tr>
                      <td
                        colSpan="2"
                        className="tl-count-empty"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    records.map(
                      (record, index) => (
                        <tr key={index}>
                          <td>
                            {record.date}
                          </td>

                          <td>
                            {record.totalCount}
                          </td>
                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

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

export default TeamLeadCountReport;
