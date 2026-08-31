import { useMemo, useState } from "react";

import TeamLeadSidebar from "./TeamLeadSidebar";

import "../../styles/teamLeadDashboard.css";
import "../../styles/teamLeadSidebar.css";
import "../../styles/teamLeadworkingToday.css";

function TeamLeadWorkingToday() {
  const storedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [date, setDate] = useState("2026-08-25");
  const [timezone, setTimezone] = useState("");

  const employeeName =
    storedUser.fullName || "Sai Teja Kanjarla";

  const displayDate = useMemo(() => {
    if (!date) return "";

    const [year, month, day] = date.split("-");

    return `${month}-${day}-${year}`;
  }, [date]);

  const rows = [
    {
      team: "WCPA",
      employee: "Alle Sonu Ram",
      workTime: "03:46:50",
      breakTime: "00:52:51",
    },
    {
      team: "WCPA",
      employee: "Anil Kumar",
      workTime: "03:21:03",
      breakTime: "01:24:28",
    },
    {
      team: "WCPA",
      employee: "Joshna Rani",
      workTime: "03:56:59",
      breakTime: "01:11:50",
    },
    {
      team: "WCPA",
      employee: "Purnima Kopperum",
      workTime: "03:08:43",
      breakTime: "01:42:44",
    },
    {
      team: "WCPA",
      employee: "Raghavendra Kovkuntla",
      workTime: "05:02:58",
      breakTime: "01:28:53",
    },
    {
      team: "WCPA",
      employee: employeeName,
      workTime: "03:41:02",
      breakTime: "00:53:26",
    },
  ];

  const handleGo = () => {
    console.log({
      date,
      timezone,
    });
  };

  return (
    <div className="tl-page">

      <TeamLeadSidebar />

      <div className="tl-main">

        <header className="tl-topbar">
          <div />

          <div className="tl-user">
            <span className="tl-user-icon">
              ♙
            </span>

            <strong>
              {employeeName}
            </strong>
          </div>
        </header>

        <main className="tl-content">

          <div className="tl-working-page">

            <h1>
              Who is working today - {displayDate}
            </h1>

            <div className="tl-working-controls">

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
              />

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

                <option value="America/New_York">
                  America/New_York
                </option>

                <option value="UTC">
                  UTC
                </option>
              </select>

              <button
                type="button"
                className="tl-working-go"
                onClick={handleGo}
              >
                Go
              </button>

            </div>

            <section className="tl-working-report">

              <div className="tl-working-report-title">
                Who is working today - {displayDate}
              </div>

              <div className="tl-working-report-body">

                <div className="tl-working-table-wrapper">

                  <table className="tl-working-table">

                    <thead>
                      <tr>
                        <th>
                          Team name
                        </th>

                        <th>
                          Employees name
                        </th>

                        <th>
                          Work time
                          <small>
                            {" "}
                            (hh:mm:ss)
                          </small>
                        </th>

                        <th>
                          Break time
                          <small>
                            {" "}
                            (hh:mm:ss)
                          </small>
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {rows.map((row, index) => (
                        <tr key={index}>

                          <td>
                            {row.team}
                          </td>

                          <td>
                            {row.employee}
                          </td>

                          <td>
                            {row.workTime}
                          </td>

                          <td>
                            {row.breakTime}
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>

              </div>

            </section>

          </div>

        </main>

      </div>

    </div>
  );
}

export default TeamLeadWorkingToday;
