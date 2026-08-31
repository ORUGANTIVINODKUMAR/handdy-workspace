import { useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import "../../styles/adminMonitoringApplicationUsage.css";

function AdminMonitoringApplicationUsage() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [application, setApplication] = useState("");

  const [fromDate, setFromDate] = useState("2026-08-27");
  const [toDate, setToDate] = useState("2026-08-27");

  const handleGo = () => {
    console.log({
      team,
      employee,
      application,
      fromDate,
      toDate,
    });
  };

  return (
    <DashboardLayout title="Application usage details">
      <div className="admin-monitoring-app-usage-page">

        <div className="admin-monitoring-app-usage-note">
          (Keystroke &amp; mouse click count is available only for Windows and Ubuntu)
        </div>

        <p className="admin-monitoring-app-usage-help">
          Please select the team, employee, application, date and click go button to generate the report
        </p>

        <div className="admin-monitoring-app-usage-controls">

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

          <select
            value={application}
            onChange={(event) =>
              setApplication(event.target.value)
            }
          >
            <option value="">
              Select application
            </option>

            <option value="Google Chrome">
              Google Chrome
            </option>

            <option value="Microsoft Edge">
              Microsoft Edge
            </option>

            <option value="Visual Studio Code">
              Visual Studio Code
            </option>
          </select>

          <div className="admin-monitoring-app-usage-date">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="admin-monitoring-app-usage-date">
            <label>To</label>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(event.target.value)
              }
            />
          </div>

          <button
            type="button"
            className="admin-monitoring-app-usage-go"
            onClick={handleGo}
          >
            Go
          </button>

        </div>

        <section className="admin-monitoring-app-usage-result">

          <div className="admin-monitoring-app-usage-table-wrapper">

            <table className="admin-monitoring-app-usage-table">

              <thead>
                <tr>
                  <th>Application name</th>

                  <th>Date</th>

                  <th>
                    Total time of application
                    <small>(hh:mm:ss)</small>
                  </th>

                  <th>Total keystrokes</th>

                  <th>
                    Average keystrokes
                    <br />
                    per hour
                  </th>

                  <th>Total mouse clicks</th>

                  <th>
                    Average mouse clicks
                    <br />
                    per hour
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan="7"
                    className="admin-monitoring-app-usage-empty"
                  >
                    No records found
                  </td>
                </tr>
              </tbody>

            </table>

          </div>

        </section>

      </div>
    </DashboardLayout>
  );
}

export default AdminMonitoringApplicationUsage;