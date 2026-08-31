import { useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import "../../styles/adminMonitoringWebsites.css";

function AdminMonitoringWebsites() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [reportType, setReportType] = useState("detailed");

  const [fromDate, setFromDate] = useState("2026-08-27");
  const [toDate, setToDate] = useState("2026-08-27");

  const handleGo = () => {
    console.log({
      team,
      employee,
      reportType,
      fromDate,
      toDate,
    });
  };

  return (
    <DashboardLayout title="Websites Monitoring Report">
      <div className="admin-monitoring-websites-page">

        <p className="admin-monitoring-websites-help">
          Please select the team, employee, date and click go button to generate the report
        </p>

        <div className="admin-monitoring-websites-controls">

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
            value={reportType}
            onChange={(event) =>
              setReportType(event.target.value)
            }
          >
            <option value="detailed">
              Detailed
            </option>

            <option value="summary">
              Summary
            </option>
          </select>

          <div className="admin-monitoring-websites-date">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="admin-monitoring-websites-date">
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
            className="admin-monitoring-websites-go"
            onClick={handleGo}
          >
            Go
          </button>

        </div>

        <section className="admin-monitoring-websites-result">

          <div className="admin-monitoring-websites-table-wrapper">

            <table className="admin-monitoring-websites-table">

              <thead>
                <tr>
                  <th>URL's</th>
                  <th>From time</th>
                  <th>To time</th>
                  <th>Total time used</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan="4"
                    className="admin-monitoring-websites-empty"
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

export default AdminMonitoringWebsites;