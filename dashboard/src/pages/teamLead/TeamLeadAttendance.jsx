import { useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadAttendance.css";

function TeamLeadAttendance() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [month, setMonth] = useState("2026-08");
  const [timezone, setTimezone] = useState("");

  const employeeName =
    storedUser.fullName || "Sai Teja Kanjarla";

  const handleGo = () => {
    console.log({
      team,
      employee,
      month,
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

          <div className="tl-attendance-page">

            <h1>
              Attendance
            </h1>

            <p className="tl-attendance-help">
              Please select team, employee and date.
              Then click go button to generate your report
            </p>

            <div className="tl-attendance-controls">

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

              {/* MONTH */}

              <input
                type="month"
                value={month}
                onChange={(event) =>
                  setMonth(event.target.value)
                }
              />

              {/* TIMEZONE */}

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

              {/* GO */}

              <button
                type="button"
                className="tl-attendance-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            <section className="tl-attendance-card">

              <div className="tl-attendance-empty">
                No record found
              </div>

            </section>

          </div>

        </main>

      </div>

    </div>
  );
}

export default TeamLeadAttendance;