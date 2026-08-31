import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";

function AdminWorkingToday() {
  const [date, setDate] = useState("");
  const [timezone, setTimezone] = useState("");

  const [rows] = useState([
    {
      id: 1,
      teamName: "Development",
      employeeName: "System Admin",
      workTime: "06:44:56",
      breakTime: "01:19:59",
    },
    {
      id: 2,
      teamName: "Testing",
      employeeName: "Test Employee",
      workTime: "06:29:21",
      breakTime: "02:02:28",
    },
  ]);

  const formatDisplayDate = (value) => {
    if (!value) {
      return "";
    }

    const selectedDate = new Date(`${value}T00:00:00`);

    return selectedDate.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const displayDate = formatDisplayDate(date);

  const handleGo = () => {
    console.log({
      date,
      timezone,
    });
  };

  return (
    <DashboardLayout title="Who is Working Today">
      <section className="admin-card working-today-card">

        <h2 className="working-today-title">
          Who is working today
          {displayDate ? ` - ${displayDate}` : ""}
        </h2>

        <div className="working-today-controls">

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

            <option value="UTC">
              UTC
            </option>
          </select>

          <button
            type="button"
            className="working-today-go-button"
            onClick={handleGo}
          >
            Go
          </button>

        </div>

        <div className="working-today-report">

          <div className="working-today-report-title">
            Who is working today
            {displayDate ? ` - ${displayDate}` : ""}
          </div>

          <div className="working-today-table-wrapper">

            <table className="working-today-table">

              <thead>
                <tr>
                  <th>Team name</th>

                  <th>
                    Employees name
                  </th>

                  <th>
                    Work time
                    <small> (hh:mm:ss)</small>
                  </th>

                  <th>
                    Break time
                    <small> (hh:mm:ss)</small>
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="4">
                      No record found
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.teamName}</td>

                      <td>
                        {row.employeeName}
                      </td>

                      <td>
                        {row.workTime}
                      </td>

                      <td>
                        {row.breakTime}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>

          </div>

        </div>

      </section>
    </DashboardLayout>
  );
}

export default AdminWorkingToday;