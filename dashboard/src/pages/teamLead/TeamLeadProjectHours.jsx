import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadProjectHours.css";

function TeamLeadProjectHours() {
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
    storedUser.fullName || "Sai Teja Kanjarla";

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

        {/* CONTENT */}

        <main className="tl-content">

          <div className="tl-project-hours-page">

            <h1>
              Report based on the client,
              project and task
            </h1>

            <p className="tl-project-hours-help">
              Please select client, project,
              task and date. Then click Go
              button to generate your report
            </p>

            {/* FIRST ROW */}

            <div className="tl-project-hours-grid">

              <select
                value={client}
                onChange={(event) =>
                  setClient(event.target.value)
                }
              >
                <option value="">
                  Select client
                </option>

                <option value="WCPA">
                  WCPA
                </option>

                <option value="Client 2">
                  Client 2
                </option>
              </select>

              <select
                value={project}
                onChange={(event) =>
                  setProject(event.target.value)
                }
              >
                <option value="">
                  Select project
                </option>

                <option value="Audit">
                  Audit
                </option>

                <option value="Tax">
                  Tax
                </option>
              </select>

              <select
                value={task}
                onChange={(event) =>
                  setTask(event.target.value)
                }
              >
                <option value="">
                  Select task
                </option>

                <option value="Admin Work - Billable">
                  Admin Work - Billable
                </option>

                <option value="Review">
                  Review
                </option>
              </select>

              <div className="tl-project-hours-date">

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

              <div className="tl-project-hours-date">

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

            </div>

            {/* SECOND ROW */}

            <div className="tl-project-hours-bottom">

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
                className="tl-project-hours-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            {/* RESULT */}

            <section className="tl-project-hours-result">
              No record found
            </section>

          </div>

        </main>

      </div>

    </div>
  );
}

export default TeamLeadProjectHours;