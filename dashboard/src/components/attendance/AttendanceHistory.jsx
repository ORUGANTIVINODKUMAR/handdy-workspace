import { useEffect, useState } from "react";
import { getAttendanceHistory } from "../../api/attendanceApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function AttendanceHistory() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    const loadAttendanceHistory = async () => {
      try {
        const data = await getAttendanceHistory();

        if (isCurrent) {
          setRecords(data.attendance || []);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(
            getApiErrorMessage(
              requestError,
              "Unable to load attendance history."
            )
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadAttendanceHistory();

    return () => {
      isCurrent = false;
    };
  }, []);

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(`${date}T00:00:00`).toLocaleDateString();
  };

  const formatTime = (dateTime) => {
    if (!dateTime) {
      return "Not recorded";
    }

    return new Date(dateTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <section className="card">
        <p className="status-message">Loading attendance history...</p>
      </section>
    );
  }

  return (
    <section
      className="card attendance-history-card"
      aria-labelledby="attendance-history-heading"
    >
      <div className="card-heading">
        <div>
          <p className="eyebrow">Personal attendance</p>
          <h2 id="attendance-history-heading">
            Attendance History
          </h2>
        </div>
      </div>

      {error && (
        <p className="status-message error-message" role="alert">
          {error}
        </p>
      )}

      {!error && records.length === 0 && (
        <p className="status-message">
          No attendance history is available.
        </p>
      )}

      {!error && records.length > 0 && (
        <div className="attendance-history-table-wrapper">
          <table className="attendance-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Total Hours</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr key={record._id}>
                  <td>{formatDate(record.date)}</td>
                  <td>{record.status || "-"}</td>
                  <td>{formatTime(record.checkIn)}</td>
                  <td>{formatTime(record.checkOut)}</td>
                  <td>
                    {record.totalHours ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AttendanceHistory;