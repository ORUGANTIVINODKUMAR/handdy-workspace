import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadTeamCountReport.css";

function TeamLeadTeamCountReport() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [fromDate, setFromDate] = useState("2026-08-25");
  const [toDate, setToDate] = useState("2026-08-25");
  const [timezone, setTimezone] = useState("");

  const employeeName =
    storedUser.fullName || "Sai Teja Kanjarla";

  const handleGo = () => {
    console.log({
      team,
      employee,
      fromDate,
      toDate,
      timezone,
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

          <div className="tl-team-count-page">

            <h1>
              Count Report
            </h1>

            <p className="tl-team-count-help">
              Please select team, employee and date.
              Then click go button to generate your report
            </p>

            <div className="tl-team-count-controls">

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

              <div className="tl-team-count-date">
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

              <div className="tl-team-count-date">
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

              <select
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
                className="tl-team-count-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            <section className="tl-team-count-card">

              <table className="tl-team-count-table">

                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total count</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td
                      colSpan="2"
                      className="tl-team-count-empty"
                    >
                      No records found
                    </td>
                  </tr>
                </tbody>

              </table>

            </section>

          </div>

        </main>

      </div>

    </div>
  );
}

export default TeamLeadTeamCountReport;