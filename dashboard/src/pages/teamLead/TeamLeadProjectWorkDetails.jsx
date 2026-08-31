import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadProjectWorkDetails.css";

function TeamLeadProjectWorkDetails() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [project, setProject] = useState("");

  const [fromDate, setFromDate] =
    useState("2026-08-25");

  const [toDate, setToDate] =
    useState("2026-08-25");

  const [timezone, setTimezone] =
    useState("Asia/Kolkata");

  const employeeName =
    storedUser.fullName || "Sai Teja Kanjarla";

  const handleGo = () => {
    console.log({
      team,
      employee,
      project,
      fromDate,
      toDate,
      timezone,
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

          <div className="tl-project-work-page">

            <h1>
              Project work details
            </h1>

            <p className="tl-project-work-help">
              Please select team, employee,
              project and date and click go
              button to generate the report
            </p>

            {/* FIRST ROW */}
            <div className="tl-project-work-grid">

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

                <option value="Audit">
                  Audit
                </option>

                <option value="Tax">
                  Tax
                </option>
              </select>

              {/* FROM */}
              <div className="tl-project-work-date">
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

              {/* TO */}
              <div className="tl-project-work-date">
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
            <div className="tl-project-work-bottom">

              <select
                value={timezone}
                onChange={(event) =>
                  setTimezone(
                    event.target.value
                  )
                }
              >
                <option value="Asia/Kolkata">
                  (GMT +5:30) Bombay,
                  Calcutta, Madras, New Delhi
                </option>

                <option value="America/New_York">
                  (GMT -5:00) Eastern Time
                </option>

                <option value="UTC">
                  UTC
                </option>
              </select>

              <button
                type="button"
                className="tl-project-work-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            {/* REPORT */}
            <section className="tl-project-work-report">

              <div className="tl-project-work-report-title">
                Project work report
              </div>

              <div className="tl-project-work-report-body">

                <table className="tl-project-work-table">

                  <thead>
                    <tr>
                      <th>
                        Employee name
                      </th>

                      <th>
                        Project name
                      </th>

                      <th>
                        Total hours worked
                        <small>
                          (hh:mm:ss)
                        </small>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td
                        colSpan="3"
                        className="tl-project-work-empty"
                      >
                        No records found
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

export default TeamLeadProjectWorkDetails;