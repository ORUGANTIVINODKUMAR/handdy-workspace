import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminTimesheetsDetailed() {
  const [team, setTeam] = useState("");
  const [employee, setEmployee] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timezone, setTimezone] = useState("");

  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState("");

  return (
    <DashboardLayout title="Detailed Timesheet">
      <section className="admin-card detailed-team-timesheet-card">
        <div className="detailed-team-heading-row">
          <h2>Detailed timesheet</h2>

          <div className="timesheet-filter-box">
            <button
              type="button"
              className="timesheet-filter-button"
              onClick={() =>
                setShowFilter((previous) => !previous)
              }
            >
              <span>{filterType || "Filter"}</span>
              <span>{showFilter ? "⌃" : "⌄"}</span>
            </button>

            {showFilter && (
              <div className="timesheet-filter-menu">
                <button
                  type="button"
                  className="timesheet-filter-option active"
                  onClick={() => {
                    setFilterType("");
                    setShowFilter(false);
                  }}
                >
                  Filter
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
                  onClick={() => {
                    setFilterType("Team");
                    setShowFilter(false);
                  }}
                >
                  Team
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
                  onClick={() => {
                    setFilterType("Employee");
                    setShowFilter(false);
                  }}
                >
                  Employee
                </button>

                <button
                  type="button"
                  className="timesheet-filter-option"
                  onClick={() => {
                    setFilterType("Project");
                    setShowFilter(false);
                  }}
                >
                  Project
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="timesheet-help-text">
          Please select team, employee and date and click Go to generate the report
        </p>

        <div className="detailed-team-controls">
          <select
            value={team}
            onChange={(event) =>
              setTeam(event.target.value)
            }
          >
            <option value="">Select team</option>
            <option value="development">
              Development Team
            </option>
            <option value="testing">
              Testing Team
            </option>
            <option value="support">
              Support Team
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

            <option value="admin">
              System Admin
            </option>
          </select>

          <div className="detailed-date-control">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="detailed-date-control">
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

            <option value="UTC">
              UTC
            </option>
          </select>

          <button
            type="button"
            className="detailed-team-go-button"
          >
            Go
          </button>
        </div>

        <div className="detailed-team-empty-report">
          No record found
        </div>
      </section>
    </DashboardLayout>
  );
}

export default AdminTimesheetsDetailed;