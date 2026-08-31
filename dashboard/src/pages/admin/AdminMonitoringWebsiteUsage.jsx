import { useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import "../../styles/adminMonitoringWebsiteUsage.css";

function AdminMonitoringWebsiteUsage() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [website, setWebsite] = useState("");

  const [fromDate, setFromDate] = useState("2026-08-27");
  const [toDate, setToDate] = useState("2026-08-27");

  const handleGo = () => {
    console.log({
      team,
      employee,
      website,
      fromDate,
      toDate,
    });
  };

  return (
    <DashboardLayout title="Website usage details">
      <div className="admin-monitoring-website-usage-page">

        <p className="admin-monitoring-website-usage-help">
          Please select the team, employee, website, date and click go button to generate the report
        </p>

        <div className="admin-monitoring-website-usage-controls">

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

          {/* WEBSITE */}
          <select
            value={website}
            onChange={(event) =>
              setWebsite(event.target.value)
            }
          >
            <option value="">
              Select Website
            </option>

            <option value="google.com">
              google.com
            </option>

            <option value="youtube.com">
              youtube.com
            </option>

            <option value="outlook.com">
              outlook.com
            </option>
          </select>

          {/* FROM */}
          <div className="admin-monitoring-website-usage-date">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          {/* TO */}
          <div className="admin-monitoring-website-usage-date">
            <label>To</label>

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
            className="admin-monitoring-website-usage-go"
            onClick={handleGo}
          >
            Go
          </button>

        </div>

        {/* RESULT */}
        <section className="admin-monitoring-website-usage-result">

          <div className="admin-monitoring-website-usage-table-wrapper">

            <table className="admin-monitoring-website-usage-table">

              <thead>
                <tr>
                  <th>Websites</th>

                  <th>Date</th>

                  <th>
                    Total time of websites
                    <small>(hh:mm:ss)</small>
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td
                    colSpan="3"
                    className="admin-monitoring-website-usage-empty"
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

export default AdminMonitoringWebsiteUsage;