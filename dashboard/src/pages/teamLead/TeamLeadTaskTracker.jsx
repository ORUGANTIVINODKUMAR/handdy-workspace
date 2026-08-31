import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadTaskTracker.css";

function TeamLeadTaskTracker() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [team, setTeam] = useState("");

  const employeeName =
    storedUser.fullName || "Sai Teja Kanjarla";

  const handleGo = () => {
    console.log({
      team,
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

        {/* PAGE CONTENT */}
        <main className="tl-content">

          <div className="tl-task-tracker-page">

            <h1>
              Task tracker
            </h1>

            <section className="tl-task-tracker-card">

              {/* TEAM + GO */}
              <div className="tl-task-tracker-controls">

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

                <button
                  type="button"
                  className="tl-task-tracker-go"
                  onClick={handleGo}
                >
                  Go
                </button>

              </div>

              {/* STATUS LEGEND */}
              <div className="tl-task-status-box">

                <div className="tl-status-item">
                  <span className="tl-status-icon logged">
                    ↪
                  </span>

                  <span>
                    <strong>
                      Logged in
                    </strong>
                    {" - "}
                    Logged in yet to start timer
                  </span>
                </div>

                <div className="tl-status-item">
                  <span className="tl-status-icon away">
                    ◷
                  </span>

                  <span>
                    <strong>
                      Away
                    </strong>
                    {" - "}
                    Logged in and timer running in break time
                  </span>
                </div>

                <div className="tl-status-item">
                  <span className="tl-status-icon online">
                    ✓
                  </span>

                  <span>
                    <strong>
                      Online
                    </strong>
                    {" - "}
                    Logged in and timer running in work time
                  </span>
                </div>

                <div className="tl-status-item">
                  <span className="tl-status-icon offline">
                    −
                  </span>

                  <span>
                    <strong>
                      Offline
                    </strong>
                    {" - "}
                    Not logged in the handdy timer
                  </span>
                </div>

              </div>

              <h2>
                Task tracker
              </h2>

              {/* TABLE */}
              <div className="tl-task-table-wrapper">

                <table className="tl-task-table">

                  <thead>
                    <tr>
                      <th>
                        Team name
                      </th>

                      <th>
                        Employee name
                      </th>

                      <th>
                        Client name
                      </th>

                      <th>
                        Project name
                      </th>

                      <th>
                        Task name
                      </th>

                      <th>
                        Task tracker
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td
                        colSpan="6"
                        className="tl-task-empty"
                      >
                        No record found
                      </td>
                    </tr>
                  </tbody>

                </table>

              </div>

            </section>

          </div>

        </main>

      </div>

    </div>
  );
}

export default TeamLeadTaskTracker;