import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";

function TeamLeadDashboard() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [task, setTask] = useState("");
  const [timezone, setTimezone] = useState("");

  const [fromDate, setFromDate] =
    useState("2026-08-25");

  const [toDate, setToDate] =
    useState("2026-08-25");

  const employeeName =
    storedUser.fullName ||
    storedUser.name ||
    "Sai Teja Kanjarla";

  const handleGo = () => {
    console.log({
      client,
      project,
      task,
      timezone,
      fromDate,
      toDate,
    });
  };

  return (
    <div className="tl-page">

      <TeamLeadSidebar />

      <div className="tl-main">

        {/* =========================
            TOP HEADER
        ========================= */}

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


        {/* =========================
            MAIN CONTENT
        ========================= */}

        <main className="tl-content">

          <div className="tl-dashboard-page">

            {/* TITLE */}
            <h1>
              Report based on the client, project and task
            </h1>

            {/* HELP TEXT */}
            <p className="tl-dashboard-help">
              Please select client, project, task and date.
              Then click Go button to generate your report
            </p>


            {/* =========================
                FIRST ROW
                CLIENT | PROJECT | TASK |
                FROM | TO
            ========================= */}

            <div className="tl-dashboard-controls">

              {/* CLIENT */}
              <select
                value={client}
                onChange={(event) =>
                  setClient(event.target.value)
                }
              >
                <option value="">
                  Select client
                </option>

                <option value="client-1">
                  Client 1
                </option>

                <option value="client-2">
                  Client 2
                </option>
              </select>


              {/* PROJECT */}
              <select
                value={project}
                onChange={(event) =>
                  setProject(event.target.value)
                }
              >
                <option value="">
                  Select project
                </option>

                <option value="project-1">
                  Project 1
                </option>

                <option value="project-2">
                  Project 2
                </option>
              </select>


              {/* TASK */}
              <select
                value={task}
                onChange={(event) =>
                  setTask(event.target.value)
                }
              >
                <option value="">
                  Select task
                </option>

                <option value="task-1">
                  Task 1
                </option>

                <option value="task-2">
                  Task 2
                </option>
              </select>


              {/* FROM DATE */}
              <div className="tl-dashboard-date">

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


              {/* TO DATE */}
              <div className="tl-dashboard-date">

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

            </div>


            {/* =========================
                SECOND ROW
                TIMEZONE | GO
            ========================= */}

            <div className="tl-dashboard-second-row">

              {/* TIMEZONE */}
              <select
                className="tl-dashboard-timezone"
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
                className="tl-dashboard-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>


            {/* =========================
                RESULT
            ========================= */}

            <section className="tl-dashboard-result">
              No record found
            </section>

          </div>

        </main>


        {/* =========================
            FOOTER
        ========================= */}

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

export default TeamLeadDashboard;