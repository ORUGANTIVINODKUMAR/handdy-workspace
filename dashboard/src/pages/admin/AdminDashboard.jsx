import { useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import "../../styles/adminDashboard.css";

function AdminDashboard() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");

  const [date, setDate] =
    useState("2026-08-26");

  const handleGo = () => {
    console.log({
      team,
      employee,
      date,
    });
  };

  return (
    <DashboardLayout title="Employee Insights">

      <div className="admin-insights-page">

        {/* =================================
            FILTERS
        ================================= */}

        <div className="admin-insights-filters">

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

            <option value="Sai Teja Kukudala">
              Sai Teja Kukudala
            </option>
          </select>


          <input
            type="date"
            value={date}
            onChange={(event) =>
              setDate(event.target.value)
            }
          />


          <button
            type="button"
            className="admin-insights-go"
            onClick={handleGo}
          >
            Go
          </button>

        </div>


        {/* =================================
            DASHBOARD GRID
        ================================= */}

        <div className="admin-insights-layout">

          {/* LEFT / CENTER */}

          <div className="admin-insights-main-grid">

            {/* TIMESHEET */}
            <section className="admin-insight-card admin-timesheet-card">

              <h2>
                Timesheet
              </h2>

              <p>
                No records found
              </p>

            </section>


            {/* KEYSTROKES */}
            <section className="admin-insight-card admin-keystrokes-card">

              <h2>
                Keystrokes Used
              </h2>

              <p>
                No records found
              </p>

            </section>


            {/* APPLICATIONS */}
            <section className="admin-insight-card admin-applications-card">

              <h2>
                Applications Used
              </h2>

              <p>
                No records found
              </p>

            </section>


            {/* WEBSITES */}
            <section className="admin-insight-card admin-websites-card">

              <h2>
                Websites Used
              </h2>

              <p>
                No records found
              </p>

            </section>


            {/* PRODUCTIVITY */}
            <section className="admin-insight-card admin-productivity-card">

              <h2>
                Productivity Report
              </h2>

              <p>
                No records found
              </p>

            </section>

          </div>


          {/* =================================
              RECENT SCREENSHOTS
          ================================= */}

          <aside className="admin-recent-screenshots">

            <h2>
              Recent Screenshots
            </h2>

            <div className="admin-screenshot-empty">
              No screenshots found
            </div>

          </aside>

        </div>

      </div>

    </DashboardLayout>
  );
}

export default AdminDashboard;