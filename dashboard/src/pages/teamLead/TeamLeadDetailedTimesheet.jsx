import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadTeamDetailedTimesheet.css";

function TeamLeadTeamDetailedTimesheet() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [fromDate, setFromDate] = useState("2026-08-25");
  const [toDate, setToDate] = useState("2026-08-25");
  const [timezone, setTimezone] = useState("");
  const [filter, setFilter] = useState("");

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sai Teja Kanjarla";

  const handleGo = () => {
    console.log({
      team,
      employee,
      fromDate,
      toDate,
      timezone,
      filter,
    });
  };

  return (
    <div className="tl-page">

      <TeamLeadSidebar />

      <div className="tl-main">

        {/* TOP BAR */}
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

        {/* MAIN CONTENT */}
        <main className="tl-content">

          <div className="tl-team-detailed-page">

            {/* TITLE + FILTER */}
            <div className="tl-team-detailed-heading-row">

              <h1>
                Detailed timesheet
              </h1>

              <select
                className="tl-team-detailed-filter"
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

            {/* HELP TEXT */}
            <p className="tl-team-detailed-help">
              Please select team, employee and date and click Go button to generate the report
            </p>

            {/* FILTER CONTROLS */}
            <div className="tl-team-detailed-controls">

              {/* TEAM */}
              <select
                value={team}
                onChange={(event) =>
                  setTeam(event.target.value)
                }
              >
                <option value="">
                  Select team
                </option>

                <option value="WCPA">
                  WCPA
                </option>

                <option value="Tax">
                  Tax
                </option>
              </select>

              {/* EMPLOYEE */}
              <select
                value={employee}
                onChange={(event) =>
                  setEmployee(event.target.value)
                }
              >
                <option value="">
                  Select employee
                </option>

                <option value="Sai Teja Kanjarla">
                  Sai Teja Kanjarla
                </option>
              </select>

              {/* FROM */}
              <div className="tl-team-detailed-date">

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
              <div className="tl-team-detailed-date">

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
                className="tl-team-detailed-timezone"
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

              {/* GO BUTTON */}
              <button
                type="button"
                className="tl-team-detailed-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            {/* RESULT */}
            <section className="tl-team-detailed-result">
              No record found
            </section>

          </div>

        </main>

        {/* FOOTER */}
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

export default TeamLeadTeamDetailedTimesheet;