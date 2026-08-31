import { useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import "../../styles/adminTimesheetsCountReport.css";

function AdminTimesheetsCountReport() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [fromDate, setFromDate] = useState("2026-08-27");
  const [toDate, setToDate] = useState("2026-08-27");
  const [timezone, setTimezone] = useState("");

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
    <DashboardLayout title="Count Report">
      <div className="admin-count-report-page">

        <p className="admin-count-report-help">
          Please select team, employee and date. Then click go button to generate your report
        </p>

        <div className="admin-count-report-controls">

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

          <div className="admin-count-report-date">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="admin-count-report-date">
            <label>To</label>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(event.target.value)
              }
            />
          </div>

          <select
            className="admin-count-report-timezone"
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
            className="admin-count-report-go"
            onClick={handleGo}
          >
            Go
          </button>

        </div>

        <section className="admin-count-report-result">

          <table className="admin-count-report-table">

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
                  className="admin-count-report-empty"
                >
                  No records found
                </td>
              </tr>
            </tbody>

          </table>

        </section>

      </div>
    </DashboardLayout>
  );
}

export default AdminTimesheetsCountReport;