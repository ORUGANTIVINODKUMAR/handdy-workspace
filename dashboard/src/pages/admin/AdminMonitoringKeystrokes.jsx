import { useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import "../../styles/adminMonitoringKeystrokes.css";

function AdminMonitoringKeystrokes() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");

  const [fromDate, setFromDate] = useState("2026-08-27");
  const [toDate, setToDate] = useState("2026-08-27");

  const handleGo = () => {
    console.log({
      team,
      employee,
      fromDate,
      toDate,
    });
  };

  return (
    <DashboardLayout title="Keystrokes Monitoring Report">
      <div className="admin-monitoring-keystrokes-page">

        <p className="admin-monitoring-keystrokes-help">
          Please select the team, employee, date and click go button to generate the report
        </p>

        <div className="admin-monitoring-keystrokes-controls">

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

          <div className="admin-monitoring-keystrokes-date">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="admin-monitoring-keystrokes-date">
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
            className="admin-monitoring-keystrokes-go"
            onClick={handleGo}
          >
            Go
          </button>

        </div>

        <section className="admin-monitoring-keystrokes-result">

          <div className="admin-monitoring-keystrokes-table-wrapper">

            <table className="admin-monitoring-keystrokes-table">

              <thead>
                <tr>
                  <th>Employee name</th>
                  <th>Date</th>
                  <th>Total keystrokes</th>
                  <th>
                    Average keystrokes
                    <br />
                    per min
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan="4"
                    className="admin-monitoring-keystrokes-empty"
                  >
                    No record found
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

export default AdminMonitoringKeystrokes;