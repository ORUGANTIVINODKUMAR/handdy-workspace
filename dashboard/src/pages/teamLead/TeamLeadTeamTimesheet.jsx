import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadTeamTimesheet.css";

function TeamLeadTeamTimesheet() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [view, setView] = useState("day");
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [date, setDate] = useState("2026-08-25");
  const [timezone, setTimezone] = useState("");
  const [filter, setFilter] = useState("");

  const employeeName =
    storedUser.fullName || "Sai Teja Kanjarla";

  const handleGo = () => {
    console.log({
      view,
      team,
      employee,
      date,
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
              {employeeName}
            </strong>
          </div>
        </header>

        <main className="tl-content">

          <div className="tl-team-timesheet-page">

            <h1>
              Daily report
            </h1>

            <div className="tl-team-top-row">

              <div className="tl-team-view-buttons">

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
                className="tl-team-filter"
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

            <p className="tl-team-help">
              Please select team, employee and date.
              Then click go button to generate your report
            </p>

            <div className="tl-team-controls">

              <select
                value={team}
                onChange={(event) =>
                  setTeam(
                    event.target.value
                  )
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

              <select
                value={employee}
                onChange={(event) =>
                  setEmployee(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select employee
                </option>

                <option value="Sai Teja Kanjarla">
                  Sai Teja Kanjarla
                </option>
              </select>

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
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
                className="tl-team-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            <section className="tl-team-result">
              No record found
            </section>

          </div>

        </main>

      </div>

    </div>
  );
}

export default TeamLeadTeamTimesheet;