import { useEffect, useRef, useState } from "react";
import {
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  getActiveTimer,
} from "../../api/timerApi";
import getApiErrorMessage from "../../utils/getApiErrorMessage";

function TaskTimer({ selectedProject, selectedTask }) {
  const [status, setStatus] = useState("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const intervalRef = useRef(null);
  const startedAtRef = useRef(null);
  const accumulatedSecondsRef = useRef(0);

  const hasSelection = Boolean(selectedProject && selectedTask);

  const clearTimerInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startLiveCounter = () => {
    clearTimerInterval();

    intervalRef.current = setInterval(() => {
      if (!startedAtRef.current) {
        return;
      }

      const currentSessionSeconds = Math.floor(
        (Date.now() - startedAtRef.current) / 1000
      );

      setElapsedSeconds(
        accumulatedSecondsRef.current + currentSessionSeconds
      );
    }, 1000);
  };

  const restoreActiveTimer = async () => {
    try {
      const data = await getActiveTimer();

      if (!data.timeLog) {
        return;
      }

      const timeLog = data.timeLog;

      setStatus(timeLog.status);

      if (timeLog.status === "running") {
        const startedAt = new Date(timeLog.startedAt).getTime();

        const totalPausedSeconds = (timeLog.pauses || []).reduce(
          (total, pause) => {
            if (!pause.resumedAt) {
              return total;
            }

            const pausedAt = new Date(pause.pausedAt).getTime();
            const resumedAt = new Date(pause.resumedAt).getTime();

            return total + Math.floor((resumedAt - pausedAt) / 1000);
          },
          0
        );

        const workedSeconds = Math.max(
          0,
          Math.floor((Date.now() - startedAt) / 1000) -
          totalPausedSeconds
        );

        accumulatedSecondsRef.current = workedSeconds;
        startedAtRef.current = Date.now();

        setElapsedSeconds(workedSeconds);
        startLiveCounter();
      }

      if (timeLog.status === "paused") {
        const pausedAt =
          timeLog.pauses?.[timeLog.pauses.length - 1]?.pausedAt;

        if (pausedAt) {
          const totalElapsedSeconds = Math.floor(
            (new Date(pausedAt).getTime() -
              new Date(timeLog.startedAt).getTime()) /
            1000
          );

          const completedPauseSeconds = (timeLog.pauses || []).reduce(
            (total, pause) => {
              if (!pause.resumedAt) {
                return total;
              }

              return (
                total +
                Math.floor(
                  (new Date(pause.resumedAt).getTime() -
                    new Date(pause.pausedAt).getTime()) /
                  1000
                )
              );
            },
            0
          );

          const workedSeconds = Math.max(
            0,
            totalElapsedSeconds - completedPauseSeconds
          );

          accumulatedSecondsRef.current = workedSeconds;
          startedAtRef.current = null;

          setElapsedSeconds(workedSeconds);
        }
      }
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "Unable to restore active timer."
        )
      );
    }
  };


  useEffect(() => {
    restoreActiveTimer();

    return () => {
      clearTimerInterval();
    };
    // restore once on mount; timer helpers use refs for mutable state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = async () => {
    try {
      setIsActionLoading(true);
      setMessage("");
      setError("");

      const data = await startTimer(selectedProject, selectedTask);

      setStatus("running");
      setElapsedSeconds(0);

      accumulatedSecondsRef.current = 0;
      startedAtRef.current = new Date(data.timeLog.startedAt).getTime();

      startLiveCounter();

      setMessage(data.message);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to start timer.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setIsActionLoading(true);
      setMessage("");
      setError("");

      const data = await pauseTimer();

      clearTimerInterval();

      if (startedAtRef.current) {
        const currentSessionSeconds = Math.floor(
          (Date.now() - startedAtRef.current) / 1000
        );

        accumulatedSecondsRef.current += currentSessionSeconds;
        setElapsedSeconds(accumulatedSecondsRef.current);
      }

      startedAtRef.current = null;

      setStatus("paused");
      setMessage(data.message);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to pause timer.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setIsActionLoading(true);
      setMessage("");
      setError("");

      const data = await resumeTimer();

      startedAtRef.current = Date.now();

      setStatus("running");

      startLiveCounter();

      setMessage(data.message);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to resume timer.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setIsActionLoading(true);
      setMessage("");
      setError("");

      const data = await stopTimer();

      clearTimerInterval();

      setStatus("stopped");
      setElapsedSeconds(data.timeLog.totalWorkedSeconds || 0);

      accumulatedSecondsRef.current =
        data.timeLog.totalWorkedSeconds || 0;

      startedAtRef.current = null;

      setMessage(data.message);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "Unable to stop timer.")
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return [hours, minutes, remainingSeconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  return (
    <section className="card timer-card" aria-labelledby="timer-heading">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Personal time</p>
          <h2 id="timer-heading">Task Timer</h2>
        </div>

        <span className="status-badge">{status}</span>
      </div>

      <p className="timer-duration" aria-label="Elapsed time">
        {formatDuration(elapsedSeconds)}
      </p>

      {message && (
        <p className="status-message success-message" role="status">
          {message}
        </p>
      )}

      {error && (
        <p className="status-message error-message" role="alert">
          {error}
        </p>
      )}

      <div className="timer-controls">
        <button
          type="button"
          aria-label="Start task timer"
          onClick={handleStart}
          disabled={
            !hasSelection ||
            status === "running" ||
            status === "paused" ||
            isActionLoading
          }
        >
          {isActionLoading && status === "idle"
            ? "Starting..."
            : "Start"}
        </button>

        <button
          type="button"
          aria-label="Pause task timer"
          onClick={handlePause}
          disabled={status !== "running" || isActionLoading}
        >
          Pause
        </button>

        <button
          type="button"
          aria-label="Resume task timer"
          onClick={handleResume}
          disabled={status !== "paused" || isActionLoading}
        >
          Resume
        </button>

        <button
          type="button"
          aria-label="Stop task timer"
          onClick={handleStop}
          disabled={
            !["running", "paused"].includes(status) ||
            isActionLoading
          }
        >
          Stop
        </button>
      </div>
    </section>
  );
}

export default TaskTimer;
