import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import "../../styles/adminSchedule.css";
import { API_BASE_URL } from "../../api/axiosInstance";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function AdminSchedule() {
  const [activeTab, setActiveTab] =
    useState("list");

  const [view, setView] =
    useState("day");

  const [team, setTeam] =
    useState("");

  const [employee, setEmployee] =
    useState("");

  const [shift, setShift] =
    useState("");

  const [date, setDate] =
    useState("");

  const [teams, setTeams] =
    useState([]);

  const [employees, setEmployees] =
    useState([]);

  const [shifts, setShifts] =
    useState([]);

  const [schedules, setSchedules] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [scheduleLoading, setScheduleLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [scheduleTitle, setScheduleTitle] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const hours = useMemo(
    () => [
      "12",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
    ],
    []
  );

  // =========================================
  // LOAD TEAMS + EMPLOYEES + SHIFTS
  // =========================================
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        setLoading(true);
        setError("");

        const headers =
          getAuthHeaders();

        const [
          teamsResponse,
          employeesResponse,
          shiftsResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE_URL}/teams`,
            {
              headers,
            }
          ),

          fetch(
            `${API_BASE_URL}/employees?limit=100`,
            {
              headers,
            }
          ),

          fetch(
            `${API_BASE_URL}/shifts?limit=100`,
            {
              headers,
            }
          ),
        ]);

        const teamsData =
          await teamsResponse.json();

        const employeesData =
          await employeesResponse.json();

        const shiftsData =
          await shiftsResponse.json();

        if (!teamsResponse.ok) {
          throw new Error(
            teamsData.message ||
              "Unable to load teams."
          );
        }

        if (!employeesResponse.ok) {
          throw new Error(
            employeesData.message ||
              "Unable to load employees."
          );
        }

        if (!shiftsResponse.ok) {
          throw new Error(
            shiftsData.message ||
              "Unable to load shifts."
          );
        }

        setTeams(
          teamsData.teams || []
        );

        setEmployees(
          employeesData.employees || []
        );

        setShifts(
          shiftsData.shifts || []
        );
      } catch (requestError) {
        console.error(
          "Schedule dropdown load error:",
          requestError
        );

        setError(
          requestError.message ||
            "Unable to load schedule data."
        );
      } finally {
        setLoading(false);
      }
    };

    loadDropdownData();
  }, []);

  // =========================================
  // LOAD SCHEDULES
  // =========================================
  const loadSchedules = useCallback(async (
    filters = {}
  ) => {
    try {
      setScheduleLoading(true);
      setError("");

      const params =
        new URLSearchParams();

      if (filters.team) {
        params.set(
          "team",
          filters.team
        );
      }

      if (filters.employee) {
        params.set(
          "employee",
          filters.employee
        );
      }

      if (filters.shift) {
        params.set(
          "shift",
          filters.shift
        );
      }

      if (filters.date) {
        params.set(
          "date",
          filters.date
        );
      }

      params.set(
        "limit",
        "100"
      );

      const response =
        await fetch(
          `${API_BASE_URL}/schedules?${params.toString()}`,
          {
            headers:
              getAuthHeaders(),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load schedules."
        );
      }

      setSchedules(
        data.schedules || []
      );
    } catch (requestError) {
      console.error(
        "Load schedule error:",
        requestError
      );

      setError(
        requestError.message ||
          "Unable to load schedules."
      );
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  // =========================================
  // LOAD ALL SCHEDULES ON FIRST PAGE LOAD
  // =========================================
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // =========================================
  // LIST SCHEDULE - GO
  // =========================================
  const handleListGo = () => {
    loadSchedules({
      team,
      employee,
      date,
    });
  };

  // =========================================
  // ADD SCHEDULE - GO
  // =========================================
  const handleAddGo = () => {
    setError("");
    setMessage("");

    if (!team) {
      setError(
        "Please select a team."
      );
      return;
    }

    if (!employee) {
      setError(
        "Please select an employee."
      );
      return;
    }

    if (!date) {
      setError(
        "Please select a date."
      );
      return;
    }

    if (!shift) {
      setError(
        "Please select a shift."
      );
      return;
    }

    setMessage(
      "Schedule details are ready. Click Save Schedule."
    );
  };

  // =========================================
  // SAVE SCHEDULE
  // =========================================
  const handleSaveSchedule =
    async () => {
      if (!team) {
        setError(
          "Please select a team."
        );
        return;
      }

      if (!employee) {
        setError(
          "Please select an employee."
        );
        return;
      }

      if (!shift) {
        setError(
          "Please select a shift."
        );
        return;
      }

      if (!date) {
        setError(
          "Please select a date."
        );
        return;
      }

      try {
        setSaving(true);
        setError("");
        setMessage("");

        const payload = {
          team,
          employee,
          shift,
          date,

          scheduleTitle:
            scheduleTitle.trim(),

          notes:
            notes.trim(),

          status: "Active",
        };

        const response =
          await fetch(
            `${API_BASE_URL}/schedules`,
            {
              method: "POST",

              headers:
                getAuthHeaders(),

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to save schedule."
          );
        }

        setMessage(
          "Schedule created successfully."
        );

        setScheduleTitle("");
        setNotes("");

        await loadSchedules();

        setActiveTab("list");
      } catch (requestError) {
        console.error(
          "Save schedule error:",
          requestError
        );

        setError(
          requestError.message ||
            "Unable to save schedule."
        );
      } finally {
        setSaving(false);
      }
    };

  // =========================================
  // DELETE SCHEDULE
  // =========================================
  const handleDeleteSchedule =
    async (scheduleId) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this schedule?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setError("");
        setMessage("");

        const response =
          await fetch(
            `${API_BASE_URL}/schedules/${scheduleId}`,
            {
              method: "DELETE",

              headers:
                getAuthHeaders(),
            }
          );

        const data =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to delete schedule."
          );
        }

        setMessage(
          "Schedule deleted successfully."
        );

        await loadSchedules({
          team,
          employee,
          date,
        });
      } catch (requestError) {
        setError(
          requestError.message ||
            "Unable to delete schedule."
        );
      }
    };

  // =========================================
  // FORMAT DATE
  // =========================================
  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    const parsedDate =
      new Date(value);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return value;
    }

    return parsedDate.toLocaleDateString();
  };

  // =========================================
  // FORMAT SHIFT TIME
  // =========================================
  const getShiftTime = (
    schedule
  ) => {
    const currentShift =
      schedule.shift;

    if (
      !currentShift ||
      typeof currentShift ===
        "string"
    ) {
      return "-";
    }

    if (
      !currentShift.startTime ||
      !currentShift.endTime
    ) {
      return "-";
    }

    return `${currentShift.startTime} - ${currentShift.endTime}`;
  };

  // =========================================
  // BREAK TIME
  // =========================================
  const getBreakTime = (
    schedule
  ) => {
    const currentShift =
      schedule.shift;

    if (
      !currentShift ||
      typeof currentShift ===
        "string" ||
      !Array.isArray(
        currentShift.breaks
      )
    ) {
      return "00:00:00";
    }

    let totalMinutes = 0;

    currentShift.breaks.forEach(
      (item) => {
        if (
          !item.startTime ||
          !item.endTime
        ) {
          return;
        }

        const [
          startHour,
          startMinute,
        ] = item.startTime
          .split(":")
          .map(Number);

        const [
          endHour,
          endMinute,
        ] = item.endTime
          .split(":")
          .map(Number);

        let start =
          startHour * 60 +
          startMinute;

        let end =
          endHour * 60 +
          endMinute;

        if (end < start) {
          end += 24 * 60;
        }

        totalMinutes +=
          Math.max(
            end - start,
            0
          );
      }
    );

    const hours =
      Math.floor(
        totalMinutes / 60
      );

    const minutes =
      totalMinutes % 60;

    return `${String(
      hours
    ).padStart(
      2,
      "0"
    )}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:00`;
  };

  return (
    <DashboardLayout title="Schedule">
      <section className="schedule-page">

        {/* =====================================
            MAIN TABS
        ===================================== */}

        <div className="schedule-main-tabs">
          <button
            type="button"
            className={
              activeTab === "list"
                ? "schedule-main-tab active"
                : "schedule-main-tab"
            }
            onClick={() =>
              setActiveTab(
                "list"
              )
            }
          >
            List schedule
          </button>

          <button
            type="button"
            className={
              activeTab === "add"
                ? "schedule-main-tab active"
                : "schedule-main-tab"
            }
            onClick={() =>
              setActiveTab(
                "add"
              )
            }
          >
            Add schedule
          </button>

          <button
            type="button"
            className={
              activeTab === "worked"
                ? "schedule-main-tab active"
                : "schedule-main-tab"
            }
            onClick={() =>
              setActiveTab(
                "worked"
              )
            }
          >
            Scheduled vs worked
          </button>
        </div>

        {/* =====================================
            MESSAGES
        ===================================== */}

        {error && (
          <div className="admin-error-box">
            {error}
          </div>
        )}

        {message && (
          <div className="schedule-success-message">
            {message}
          </div>
        )}

        {/* =====================================
            LIST SCHEDULE
        ===================================== */}

        {activeTab === "list" && (
          <div className="schedule-card">

            <p className="schedule-help">
              Please select team,
              employee and date.
              Then click Go button
              to generate your report
            </p>

            <div className="schedule-filter-row">

              {/* TEAM */}
              <select
                value={team}
                disabled={loading}
                onChange={(event) =>
                  setTeam(
                    event.target.value
                  )
                }
              >
                <option value="">
                  {loading
                    ? "Loading teams..."
                    : "Select team"}
                </option>

                {teams.map(
                  (item) => (
                    <option
                      key={
                        item._id
                      }
                      value={
                        item._id
                      }
                    >
                      {item.teamName ||
                        item.name ||
                        item.title ||
                        "Team"}
                    </option>
                  )
                )}
              </select>

              {/* EMPLOYEE */}
              <select
                value={employee}
                disabled={loading}
                onChange={(event) =>
                  setEmployee(
                    event.target.value
                  )
                }
              >
                <option value="">
                  {loading
                    ? "Loading employees..."
                    : "Select employee"}
                </option>

                {employees.map(
                  (item) => (
                    <option
                      key={
                        item._id
                      }
                      value={
                        item._id
                      }
                    >
                      {item.fullName ||
                        item.employeeId ||
                        item.email}
                    </option>
                  )
                )}
              </select>

              {/* DATE */}
              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
              />

              {/* GO */}
              <button
                type="button"
                className="schedule-go-btn"
                onClick={
                  handleListGo
                }
                disabled={
                  scheduleLoading
                }
              >
                {scheduleLoading
                  ? "..."
                  : "Go"}
              </button>
            </div>

            <div className="schedule-new-row">
              <button
                type="button"
                className="schedule-new-btn"
                onClick={() =>
                  setActiveTab(
                    "add"
                  )
                }
              >
                Add New Schedule
              </button>
            </div>

            <div className="schedule-table-wrapper">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Date</th>

                    <th>
                      Team name
                    </th>

                    <th>
                      Employee name
                    </th>

                    <th>
                      Schedule title
                    </th>

                    <th>
                      Shift
                    </th>

                    <th>
                      Shift time
                    </th>

                    <th>
                      Break time
                      <small>
                        (hh:mm:ss)
                      </small>
                    </th>

                    <th>
                      Notes
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {scheduleLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="schedule-empty"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : schedules.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="schedule-empty"
                      >
                        No record found
                      </td>
                    </tr>
                  ) : (
                    schedules.map(
                      (
                        schedule
                      ) => (
                        <tr
                          key={
                            schedule._id
                          }
                        >
                          <td>
                            {formatDate(
                              schedule.date
                            )}
                          </td>

                          <td>
                            {schedule
                              .team
                              ?.teamName ||
                              schedule
                                .team
                                ?.name ||
                              "-"}
                          </td>

                          <td>
                            {schedule
                              .employee
                              ?.fullName ||
                              schedule
                                .employee
                                ?.employeeId ||
                              "-"}
                          </td>

                          <td>
                            {schedule.scheduleTitle ||
                              "-"}
                          </td>

                          <td>
                            {schedule
                              .shift
                              ?.title ||
                              "-"}
                          </td>

                          <td>
                            {getShiftTime(
                              schedule
                            )}
                          </td>

                          <td>
                            {getBreakTime(
                              schedule
                            )}
                          </td>

                          <td>
                            {schedule.notes ||
                              "-"}
                          </td>

                          <td>
                            <div className="schedule-actions">
                              <button
                                type="button"
                                className="schedule-action-btn"
                                title="Delete schedule"
                                onClick={() =>
                                  handleDeleteSchedule(
                                    schedule._id
                                  )
                                }
                              >
                                ⊠
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =====================================
            ADD SCHEDULE
        ===================================== */}

        {activeTab === "add" && (
          <div className="schedule-card">

            <div className="schedule-view-tabs">
              <button
                type="button"
                className={
                  view === "day"
                    ? "schedule-view-btn active"
                    : "schedule-view-btn"
                }
                onClick={() =>
                  setView(
                    "day"
                  )
                }
              >
                Day view
              </button>

              <button
                type="button"
                className={
                  view === "week"
                    ? "schedule-view-btn active"
                    : "schedule-view-btn"
                }
                onClick={() =>
                  setView(
                    "week"
                  )
                }
              >
                Week view
              </button>

              <button
                type="button"
                className={
                  view === "month"
                    ? "schedule-view-btn active"
                    : "schedule-view-btn"
                }
                onClick={() =>
                  setView(
                    "month"
                  )
                }
              >
                Month view
              </button>
            </div>

            <p className="schedule-help">
              Please select team,
              employee, date and shift.
              Then click Go button.
            </p>

            <div className="schedule-add-filter-row">

              {/* TEAM */}
              <select
                value={team}
                disabled={loading}
                onChange={(event) =>
                  setTeam(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select team
                </option>

                {teams.map(
                  (item) => (
                    <option
                      key={
                        item._id
                      }
                      value={
                        item._id
                      }
                    >
                      {item.teamName ||
                        item.name ||
                        item.title ||
                        "Team"}
                    </option>
                  )
                )}
              </select>

              {/* EMPLOYEE */}
              <select
                value={employee}
                disabled={loading}
                onChange={(event) =>
                  setEmployee(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select employee
                </option>

                {employees.map(
                  (item) => (
                    <option
                      key={
                        item._id
                      }
                      value={
                        item._id
                      }
                    >
                      {item.fullName ||
                        item.employeeId ||
                        item.email}
                    </option>
                  )
                )}
              </select>

              {/* DATE */}
              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
              />

              {/* SHIFT */}
              <select
                value={shift}
                disabled={loading}
                onChange={(event) =>
                  setShift(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select shift
                </option>

                {shifts.map(
                  (item) => (
                    <option
                      key={
                        item._id
                      }
                      value={
                        item._id
                      }
                    >
                      {item.title}
                      {item.startTime &&
                      item.endTime
                        ? ` (${item.startTime} - ${item.endTime})`
                        : ""}
                    </option>
                  )
                )}
              </select>

              {/* GO */}
              <button
                type="button"
                className="schedule-go-btn"
                onClick={
                  handleAddGo
                }
              >
                Go
              </button>
            </div>

            {/* EXTRA FIELDS */}
            <div className="schedule-extra-fields">
              <div>
                <label>
                  Schedule title
                </label>

                <input
                  type="text"
                  value={
                    scheduleTitle
                  }
                  onChange={(event) =>
                    setScheduleTitle(
                      event.target.value
                    )
                  }
                  placeholder="Enter schedule title"
                />
              </div>

              <div>
                <label>
                  Notes
                </label>

                <input
                  type="text"
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Enter notes"
                />
              </div>
            </div>

            {/* SAVE */}
            <div className="schedule-save-row">
              <button
                type="button"
                className="schedule-save-btn"
                onClick={
                  handleSaveSchedule
                }
                disabled={
                  saving
                }
              >
                {saving
                  ? "Saving..."
                  : "Save Schedule"}
              </button>
            </div>

            {/* DAY TIMELINE */}
            {view === "day" && (
              <div className="schedule-timeline-wrapper">
                <table className="schedule-timeline">
                  <thead>
                    <tr>
                      <th
                        rowSpan={2}
                        className="schedule-employee-heading"
                      >
                        Team name and
                        <br />
                        Employee name
                      </th>

                      {hours.map(
                        (
                          hour,
                          index
                        ) => (
                          <th
                            key={`${hour}-${index}`}
                          >
                            {hour}
                          </th>
                        )
                      )}
                    </tr>

                    <tr>
                      <th
                        colSpan={12}
                        className="schedule-am-pm"
                      >
                        AM
                      </th>

                      <th
                        colSpan={12}
                        className="schedule-am-pm"
                      >
                        PM
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td
                        colSpan={25}
                        className="schedule-empty"
                      >
                        {team &&
                        employee &&
                        shift &&
                        date
                          ? "Ready to save schedule"
                          : "No record found"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {view === "week" && (
              <div className="schedule-placeholder">
                Week view will use
                saved schedules.
              </div>
            )}

            {view === "month" && (
              <div className="schedule-placeholder">
                Month view will use
                saved schedules.
              </div>
            )}
          </div>
        )}

        {/* =====================================
            SCHEDULED VS WORKED
        ===================================== */}

        {activeTab === "worked" && (
          <div className="schedule-card">

            <p className="schedule-help">
              Please select team,
              employee and date to
              compare scheduled time
              with worked time.
            </p>

            <div className="schedule-filter-row">

              <select
                value={team}
                onChange={(event) =>
                  setTeam(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select team
                </option>

                {teams.map(
                  (item) => (
                    <option
                      key={
                        item._id
                      }
                      value={
                        item._id
                      }
                    >
                      {item.teamName ||
                        item.name ||
                        "Team"}
                    </option>
                  )
                )}
              </select>

              <select
                value={employee}
                onChange={(event) =>
                  setEmployee(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select employee
                </option>

                {employees.map(
                  (item) => (
                    <option
                      key={
                        item._id
                      }
                      value={
                        item._id
                      }
                    >
                      {item.fullName ||
                        item.employeeId}
                    </option>
                  )
                )}
              </select>

              <input
                type="date"
                value={date}
                onChange={(event) =>
                  setDate(
                    event.target.value
                  )
                }
              />

              <button
                type="button"
                className="schedule-go-btn"
                onClick={
                  handleListGo
                }
              >
                Go
              </button>
            </div>

            <div className="schedule-placeholder">
              Scheduled vs worked
              calculation can be
              connected to attendance
              and time logs next.
            </div>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default AdminSchedule;
