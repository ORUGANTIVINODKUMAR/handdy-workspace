import { useState } from "react";
import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadEmployeeInsights.css";

function TeamLeadEmployeeInsights() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [date, setDate] = useState("2026-08-25");

  const handleGo = () => {
    console.log({
      team,
      employee,
      date,
    });
  };

  return (
    <div className="tl-insights-layout">
      <TeamLeadSidebar />

      <main className="tl-insights-main">

        {/* TOP BAR */}
        <header className="tl-insights-topbar">
          <div />

          <div className="tl-insights-user">
            <span>♙</span>
            <strong>Sai Teja Kanjarla</strong>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="tl-insights-content">

          <h1>Employee Insights</h1>

          {/* FILTERS */}
          <div className="tl-insights-controls">

            <select
              value={team}
              onChange={(e) =>
                setTeam(e.target.value)
              }
            >
              <option value="">
                Select team
              </option>

              <option value="WCPA">
                WCPA
              </option>
            </select>

            <select
              value={employee}
              onChange={(e) =>
                setEmployee(e.target.value)
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
              onChange={(e) =>
                setDate(e.target.value)
              }
            />

            <button
              type="button"
              onClick={handleGo}
            >
              Go
            </button>

          </div>

          {/* MAIN GRID */}
          <div className="tl-insights-grid">

            {/* LEFT CONTENT */}
            <div className="tl-insights-left">

              {/* TOP ROW */}
              <div className="tl-insights-top-row">

                <div className="tl-insights-card tl-card-activity">
                  <h2>Activity</h2>
                  <p>No records found</p>
                </div>

                <div className="tl-insights-card tl-card-keystrokes">
                  <h2>Keystrokes Used</h2>
                  <p>No records found</p>
                </div>

              </div>

              {/* BOTTOM ROW */}
              <div className="tl-insights-bottom-row">

                <div className="tl-insights-card tl-card-apps">
                  <h2>Applications Used</h2>
                  <p>No records found</p>
                </div>

                <div className="tl-insights-card tl-card-websites">
                  <h2>Websites Used</h2>
                  <p>No records found</p>
                </div>

                <div className="tl-insights-card tl-card-productivity">
                  <h2>Productivity Report</h2>
                  <p>No records found</p>
                </div>

              </div>

            </div>

            {/* RIGHT SIDE */}
            <aside className="tl-insights-screenshots">

              <h2>
                Recent Screenshots
              </h2>

              <div className="tl-screenshots-empty">
                No screenshots found
              </div>

            </aside>

          </div>

        </div>

      </main>
    </div>
  );
}

export default TeamLeadEmployeeInsights;