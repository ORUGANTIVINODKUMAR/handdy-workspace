import { useEffect, useState } from "react";
import {
  checkIn,
  checkOut,
  getTodayAttendance,
} from "../../api/attendanceApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function AttendanceCard() {
  const [attendance, setAttendance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    const loadTodayAttendance = async () => {
      try {
        const data = await getTodayAttendance();

        if (isCurrent) {
          setAttendance(data.attendance);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(
            getApiErrorMessage(requestError, "Unable to load today's attendance.")
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadTodayAttendance();

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleCheckIn = async () => {
    try {
      setActionLoading("check-in");
      setMessage("");
      setError("");

      const data = await checkIn();

      setAttendance(data.attendance);
      setMessage(data.message);
    } catch (requestError) {
      const errorMessage =
        getApiErrorMessage(requestError, "Check-in failed.");

      setError(errorMessage);
    } finally {
      setActionLoading("");
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading("check-out");
      setMessage("");
      setError("");

      const data = await checkOut();

      setAttendance(data.attendance);
      setMessage(data.message);
    } catch (requestError) {
      const errorMessage =
        getApiErrorMessage(requestError, "Check-out failed.");

      setError(errorMessage);
    } finally {
      setActionLoading("");
    }
  };

  const formatTime = (dateValue) => {
    if (!dateValue) {
      return "Not recorded";
    }

    return new Date(dateValue).toLocaleTimeString();
  };

  if (isLoading) {
    return <p className="status-message" role="status">Loading attendance...</p>;
  }

  const hasCheckedIn = Boolean(attendance?.checkIn);
  const hasCheckedOut = Boolean(attendance?.checkOut);

  return (
    <section className="card attendance-card" aria-labelledby="attendance-heading">
      <p className="eyebrow">Today</p>
      <h2 id="attendance-heading">Attendance</h2>

      {message && <p className="status-message success-message" role="status">{message}</p>}
      {error && <p className="status-message error-message" role="alert">{error}</p>}

      <div className="attendance-details">
        <p><span>Status</span><strong>{attendance?.status || "Not checked in"}</strong></p>
        <p><span>Check-in time</span><strong>{formatTime(attendance?.checkIn)}</strong></p>
        <p><span>Check-out time</span><strong>{formatTime(attendance?.checkOut)}</strong></p>
        <p><span>Total hours</span><strong>{attendance?.totalHours ?? "Not available"}</strong></p>
      </div>

      {!hasCheckedIn && (
        <button
          type="button"
          onClick={handleCheckIn}
          disabled={Boolean(actionLoading)}
        >
          {actionLoading === "check-in" ? "Checking in..." : "Check In"}
        </button>
      )}

      {hasCheckedIn && !hasCheckedOut && (
        <button
          type="button"
          onClick={handleCheckOut}
          disabled={Boolean(actionLoading)}
        >
          {actionLoading === "check-out"
            ? "Checking out..."
            : "Check Out"}
        </button>
      )}

      {hasCheckedOut && <p className="status-message success-message">Attendance completed for today.</p>}
    </section>
  );
}

export default AttendanceCard;
