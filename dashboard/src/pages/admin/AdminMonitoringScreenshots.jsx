import { useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";

import "../../styles/adminMonitoringScreenshots.css";

function AdminMonitoringScreenshots() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");

  const [fromDate, setFromDate] = useState("2026-08-27");
  const [toDate, setToDate] = useState("2026-08-27");

  const [showTimeFilter, setShowTimeFilter] = useState(false);

  const [timeFrom, setTimeFrom] = useState("00:00");
  const [timeTo, setTimeTo] = useState("00:00");

  const handleGo = () => {
    console.log({
      team,
      employee,
      fromDate,
      toDate,
      showTimeFilter,
      timeFrom,
      timeTo,
    });
  };

  const handleToggleTimeFilter = () => {
    setShowTimeFilter((previous) => !previous);
  };

  return (
    <DashboardLayout title="Screenshots Monitoring Report">
      <div className="admin-monitoring-screenshots-page">

        <p className="admin-monitoring-screenshots-help">
          Please select the team, employee, date and click go button to generate the report
        </p>

        <div className="admin-monitoring-screenshots-controls">

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

          {/* FROM */}
          <div className="admin-monitoring-screenshots-date">
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
          <div className="admin-monitoring-screenshots-date">
            <label>To</label>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(event.target.value)
              }
            />
          </div>

          {/* TIME FILTER */}
          {showTimeFilter && (
            <>
              <div className="admin-monitoring-screenshots-time">
                <label>Time from</label>

                <input
                  type="time"
                  value={timeFrom}
                  onChange={(event) =>
                    setTimeFrom(event.target.value)
                  }
                />
              </div>

              <div className="admin-monitoring-screenshots-time">
                <label>Time to</label>

                <input
                  type="time"
                  value={timeTo}
                  onChange={(event) =>
                    setTimeTo(event.target.value)
                  }
                />
              </div>
            </>
          )}

          {/* GO */}
          <button
            type="button"
            className="admin-monitoring-screenshots-go"
            onClick={handleGo}
          >
            Go
          </button>

        </div>

        {/* FILTER LINK */}
        <div className="admin-monitoring-screenshots-filter-row">

          <button
            type="button"
            className="admin-monitoring-screenshots-filter-link"
            onClick={handleToggleTimeFilter}
          >
            {showTimeFilter
              ? "Remove time filter"
              : "Filter screenshots by time"}
          </button>

        </div>

        {/* RESULT */}
        <section className="admin-monitoring-screenshots-result">

          <div className="admin-monitoring-screenshots-divider" />

          <div className="admin-monitoring-screenshots-empty">
            No screen found
          </div>

        </section>

      </div>
    </DashboardLayout>
  );
}

export default AdminMonitoringScreenshots;