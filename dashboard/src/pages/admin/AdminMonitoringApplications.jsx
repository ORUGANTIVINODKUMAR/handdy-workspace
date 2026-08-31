import { useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import "../../styles/adminMonitoringApplications.css";

function AdminMonitoringApplications() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [reportType, setReportType] = useState("detailed");

  const [fromDate, setFromDate] =
    useState("2026-08-27");

  const [toDate, setToDate] =
    useState("2026-08-27");

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
    <DashboardLayout title="Applications Monitoring Report">
      <div className="admin-monitoring-applications-page">

        <div className="admin-monitoring-applications-title-note">
          (This report data is updated as of 08-26-2026)
        </div>

        <p className="admin-monitoring-applications-help">
          Please select the team, employee, date and click go button to generate the report
        </p>

        <div className="admin-monitoring-applications-controls">

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

            <option value="Sai Teja Kukudala">
              Sai Teja Kukudala
            </option>
          </select>

          {/* REPORT TYPE */}
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

          {/* FROM DATE */}
          <div className="admin-monitoring-applications-date">
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
          <div className="admin-monitoring-applications-date">
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

          {/* GO */}
          <button
            type="button"
            className="admin-monitoring-applications-go"
            onClick={handleGo}
          >
            Go
          </button>

        </div>

        {/* RESULT */}
        <section className="admin-monitoring-applications-result">

          <div className="admin-monitoring-applications-table-wrapper">

            <table className="admin-monitoring-applications-table">

              <thead>
                <tr>
                  <th>Applications</th>
                  <th>Start time</th>
                  <th>End time</th>
                  <th>Total time used</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan="4"
                    className="admin-monitoring-applications-empty"
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

export default AdminMonitoringApplications;