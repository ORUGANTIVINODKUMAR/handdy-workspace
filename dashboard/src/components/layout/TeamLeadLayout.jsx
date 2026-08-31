import { useState } from "react";
import TeamLeadLayout from "../../components/layout/TeamLeadLayout";

function TeamLeadDashboard() {
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [task, setTask] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timezone, setTimezone] = useState("");

  return (
    <TeamLeadLayout>
      <section className="teamlead-report-page">

        <h1>
          Report based on the client, project and task
        </h1>

        <p className="teamlead-report-help">
          Please select client, project, task and date.
          Then click Go button to generate your report.
        </p>

        <div className="teamlead-report-controls">

          <select
            value={client}
            onChange={(event) =>
              setClient(event.target.value)
            }
          >
            <option value="">
              Select client
            </option>
          </select>

          <select
            value={project}
            onChange={(event) =>
              setProject(event.target.value)
            }
          >
            <option value="">
              Select project
            </option>
          </select>

          <select
            value={task}
            onChange={(event) =>
              setTask(event.target.value)
            }
          >
            <option value="">
              Select task
            </option>
          </select>

          <div className="teamlead-date-control">
            <label>From</label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(event.target.value)
              }
            />
          </div>

          <div className="teamlead-date-control">
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
            className="teamlead-go-button"
          >
            Go
          </button>

        </div>

        <div className="teamlead-report-result">
          No record found
        </div>

      </section>
    </TeamLeadLayout>
  );
}

export default TeamLeadDashboard;