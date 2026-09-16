const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");
const rememberedLogin = document.getElementById("rememberedLogin");
const rememberedAvatar = document.getElementById("rememberedAvatar");
const rememberedName = document.getElementById("rememberedName");
const rememberedEmail = document.getElementById("rememberedEmail");
const quickLoginButton = document.getElementById("quickLoginButton");
const differentAccountButton = document.getElementById("differentAccountButton");

const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const isLoginPage = document.body.dataset.page === "login";

const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");

const todayDate = document.getElementById("todayDate");
const todayTotal = document.getElementById("todayTotal");
const todayIdle = document.getElementById("todayIdle");
const todaySessions = document.getElementById("todaySessions");
const todayTasks = document.getElementById("todayTasks");
const todayTimesheetBody = document.getElementById("todayTimesheetBody");
const todayTimesheetEmpty = document.getElementById("todayTimesheetEmpty");
const timesheetMessage = document.getElementById("timesheetMessage");
const refreshTimesheetButton = document.getElementById(
  "refreshTimesheetButton"
);

const projectSelect = document.getElementById("projectSelect");
const taskSelect = document.getElementById("taskSelect");
const workSelectionMessage = document.getElementById(
  "workSelectionMessage"
);
const profileFullName = document.getElementById("profileFullName");
const profileEmployeeId = document.getElementById("profileEmployeeId");
const profileRole = document.getElementById("profileRole");
const profileDepartment = document.getElementById("profileDepartment");
const profileDesignation = document.getElementById("profileDesignation");
const profileEmail = document.getElementById("profileEmail");
const profileStatus = document.getElementById("profileStatus");
const timerStatus = document.getElementById("timerStatus");
const timerDuration = document.getElementById("timerDuration");
const timerMessage = document.getElementById("timerMessage");

const startTimerButton = document.getElementById(
  "startTimerButton"
);

const breakTimerButton = document.getElementById("breakTimerButton");
const pauseTimerButton = breakTimerButton;
const resumeTimerButton = null;
const breakClock = document.getElementById("breakClock");
const breakDuration = document.getElementById("breakDuration");

const stopTimerButton = document.getElementById(
  "stopTimerButton"
);

const logoutButton = document.getElementById("logoutButton");
const timerNavigationButtons = document.querySelectorAll("[data-timer-view]");
const timerViewPanels = document.querySelectorAll("[data-timer-panel]");
const accountMenuButton = document.getElementById("accountMenuButton");
const accountMenu = document.getElementById("accountMenu");
const clientName = document.getElementById("clientName");
const currentDate = document.getElementById("currentDate");
const addNoteButton = document.getElementById("addNoteButton");
const timerNote = document.getElementById("timerNote");

const API_BASE_URL =
  window.electronAPI?.apiBaseUrl || "http://localhost:5000/api";
let timerInterval = null;
let idleMonitorInterval = null;
let idlePolicyRefreshInterval = null;
let idleCheckInProgress = false;
let idlePolicy = null;
let currentTimeLog = null;
let automaticIdlePause = false;
let idleDefaults = null;
let logoutPending = false;
let logoutInProgress = false;
let timerAction = null;
let activeTaskIdleLogout = false;

const IDLE_CHECK_INTERVAL_MS = 5000;
const ACTIVE_AGAIN_SECONDS = 2;

const showTimerView = (viewName) => {
  timerViewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.timerPanel !== viewName;
  });

  timerNavigationButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.timerView === viewName);
  });
};

timerNavigationButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const viewName = button.dataset.timerView;

    showTimerView(viewName);

    if (viewName === "dashboard") {
      await loadTodayTimesheet();
    }
  });
});

if (accountMenuButton) {
  accountMenuButton.addEventListener("click", () => {
    accountMenu.hidden = !accountMenu.hidden;
  });
}

document.addEventListener("click", (event) => {
  if (accountMenu && !event.target.closest(".account-area")) accountMenu.hidden = true;
});

if (addNoteButton) {
  addNoteButton.addEventListener("click", () => {
    timerNote.hidden = !timerNote.hidden;
    if (!timerNote.hidden) timerNote.focus();
  });
}

function getToken() {
  return localStorage.getItem("token");
}

function getOpenPauseReason(timeLog) {
  const openPause = [...(timeLog?.pauses || [])]
    .reverse()
    .find((pause) => !pause.resumedAt);

  return openPause?.reason || "manual";
}

function isIntentionalBreak(timeLog = currentTimeLog) {
  return timeLog?.status === "paused" && ["break", "manual"].includes(getOpenPauseReason(timeLog));
}

function normalizedDesktopPolicy(policy = {}) {
  const idle = Number(policy.idleThresholdMinutes);
  const thresholdMinutes = Number.isInteger(idle) && idle >= idleDefaults.minIdleMinutes && idle <= idleDefaults.maxIdleMinutes
    ? idle : idleDefaults.idleThresholdMinutes;
  const logout = Number(policy.autoLogoutMinutes);
  return {
    thresholdSeconds: thresholdMinutes * 60,
    logoutSeconds: (Number.isInteger(logout) && logout > thresholdMinutes && logout <= idleDefaults.maxLogoutMinutes
      ? logout : Math.max(idleDefaults.autoLogoutMinutes, thresholdMinutes + 1)) * 60,
    exempt: Boolean(policy.idleTrackingExempt),
  };
}

async function loadIdlePolicy() {
  const token = getToken();
  if (!token || logoutPending || !window.electronAPI?.getSystemIdleTime) return;
  if (!idleDefaults) idleDefaults = await window.electronAPI.getIdleDefaults();
  // Retain the last known policy during an outage; use shared defaults on first load.
  idlePolicy ||= normalizedDesktopPolicy();
  try {
    const response = await fetch(API_BASE_URL + "/settings/idle-policy", {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return;
    const data = await response.json();
    if (getToken() === token && !logoutPending) idlePolicy = normalizedDesktopPolicy(data.idlePolicy);
  } catch {
    // OS-idle security monitoring continues with the last policy or safe defaults.
  }
}

function clearSessionLoops() {
  clearInterval(idleMonitorInterval);
  clearInterval(idlePolicyRefreshInterval);
  clearInterval(timerInterval);
  idleMonitorInterval = idlePolicyRefreshInterval = timerInterval = null;
  automaticIdlePause = false;
}

async function runTimerAction(action) {
  if (logoutPending || !getToken() || timerAction) return;
  timerAction = action();
  try { return await timerAction; } finally { timerAction = null; }
}

async function signOut(inactivity = false) {
  if (logoutInProgress || !getToken()) return;
  logoutInProgress = true;
  logoutPending = true;
  automaticIdlePause = false;
  const token = getToken();
  try {
    // Finish an already submitted timer action before closing the timer.
    if (timerAction) await timerAction;
    {
      [startTimerButton, pauseTimerButton, resumeTimerButton, stopTimerButton].forEach(button => {
        if (button) button.disabled = true;
      });
      const response = await fetch(API_BASE_URL + "/time-logs/active", {
        headers: { Authorization: "Bearer " + token },
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const data = await response.json();
        currentTimeLog = data.timeLog || null;
        if (["running", "paused"].includes(currentTimeLog?.status)) {
          const stopResponse = await fetch(API_BASE_URL + "/time-logs/stop", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
            body: JSON.stringify({ logoutReason: inactivity ? "inactivity" : "manual" }),
            signal: AbortSignal.timeout(10000),
          });
          if (!stopResponse.ok && stopResponse.status !== 404) throw new Error("Timer close pending");
          currentTimeLog = null;
        }
      } else if (response.status !== 401 && response.status !== 403) {
        throw new Error("Timer status unavailable");
      }
    }
    try {
      await fetch(API_BASE_URL + "/auth/logout", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      // Once pause is confirmed, local sign-out completes even if logout is offline.
    }
    clearSessionLoops();
    currentTimeLog = null;
    if (timerDuration) timerDuration.textContent = "00:00:00";
    if (timerStatus) timerStatus.textContent = "Idle";
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    ["activeTimer", "currentTimeLog", "timerState", "timerStartedAt", "timerElapsedSeconds"].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    if (inactivity) sessionStorage.setItem("inactivityLogout", "1");
    window.location.replace("./index.html");
  } catch {
    // Never discard the access token needed to close a potentially active backend timer.
    // Keep timer controls locked and retry through the SAME idle loop after an outage.
    if (timerMessage) timerMessage.textContent = "CRM is waiting for a connection to pause your timer and sign you out.";
  } finally {
    logoutInProgress = false;
  }
}

async function checkSystemIdleState() {
  if (idleCheckInProgress || !idlePolicy || !getToken()) return;
  idleCheckInProgress = true;
  try {
    const idleSeconds = await window.electronAPI.getSystemIdleTime();
    if (!getToken() || isIntentionalBreak() || !activeTaskIdleLogout) return;
    if (logoutPending || idleSeconds >= idlePolicy.logoutSeconds) {
      await signOut(true);
    } else if (!idlePolicy.exempt && currentTimeLog?.status === "running" && idleSeconds >= idlePolicy.thresholdSeconds) {
      await runTimerAction(() => pauseTimer("idle"));
    } else if (!idlePolicy.exempt && currentTimeLog?.status === "paused" && automaticIdlePause && idleSeconds <= ACTIVE_AGAIN_SECONDS) {
      await runTimerAction(() => resumeTimer("idle"));
    }
  } catch {
    if (timerMessage) timerMessage.textContent = "CRM could not check inactivity. Please try again.";
  } finally {
    idleCheckInProgress = false;
  }
}

function startIdleMonitor() {
  clearInterval(idleMonitorInterval);
  idleMonitorInterval = null;
  if (!idlePolicy || !getToken() || isLoginPage) return;
  idleMonitorInterval = setInterval(checkSystemIdleState, IDLE_CHECK_INTERVAL_MS);
}
window.addEventListener("beforeunload", clearSessionLoops);
function updateProfileUI(user) {
  profileFullName.textContent =
    user.fullName || "Not available";

  profileEmployeeId.textContent =
    user.employeeId || "Not available";

  profileRole.textContent =
    user.role || "Not available";

  profileDepartment.textContent =
    user.department || "Not available";

  profileDesignation.textContent =
    user.designation || "Not available";

  profileEmail.textContent =
    user.email || "Not available";

  profileStatus.textContent =
    user.isActive ? "Active" : "Inactive";
}
function getStoredUser() {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

async function loadProjects() {
  const token = getToken();

  if (!token) {
    return;
  }

  workSelectionMessage.textContent = "";

  projectSelect.innerHTML =
    '<option value="">Select Project</option>';

  try {
    const response = await fetch(
      `${API_BASE_URL}/projects?limit=100`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      workSelectionMessage.textContent =
        data.message || "Unable to load projects.";

      return;
    }

    data.projects.forEach((project) => {
      const option = document.createElement("option");

      option.value = project._id;
      option.dataset.clientName = project.clientName || "Not assigned";

      option.textContent = project.projectName;

      projectSelect.appendChild(option);
    });
  } catch (error) {
    workSelectionMessage.textContent =
      "Unable to reach the backend server.";
  }
}

async function loadTasks(projectId) {
  const token = getToken();
  taskSelect.innerHTML =
    '<option value="">Select Task</option>';

  taskSelect.disabled = true;
  workSelectionMessage.textContent = "";

  if (!projectId || !token) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/tasks?project=${encodeURIComponent(projectId)}&active=true&limit=100`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      workSelectionMessage.textContent =
        data.message || "Unable to load tasks.";

      return;
    }

    if (data.tasks.length === 0) {
      workSelectionMessage.textContent =
        "No tasks are assigned to you for this project.";

      return;
    }

    data.tasks.forEach((task) => {
      const option = document.createElement("option");

      option.value = task._id;
      option.dataset.idleLogout = String(task.idleLogout === true);

      option.textContent = task.taskName;

      taskSelect.appendChild(option);
    });

    taskSelect.disabled = false;
  } catch (error) {
    workSelectionMessage.textContent =
      "Unable to reach the backend server.";
  }
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getRememberedUser() {
  const storedUser = localStorage.getItem("rememberedUser");
  if (!storedUser) return null;
  try { return JSON.parse(storedUser); } catch { return null; }
}

function showLoggedInView(user) {
  if (loginSection) loginSection.hidden = true;
  if (appSection) appSection.hidden = false;
  showTimerView("timer");

  userName.textContent = user.fullName || "Employee";
  userRole.textContent = (user.role || "employee").replace("_", " ");
  currentDate.textContent = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  updateProfileUI(user);
}

function showLoggedOutView() {
  if (loginSection) loginSection.hidden = false;
  if (appSection) appSection.hidden = true;
}

function isToday(value) {
  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function getTimeLogWorkedSeconds(timeLog) {
  if (
    timeLog.status === "stopped" &&
    Number.isFinite(Number(timeLog.totalWorkedSeconds))
  ) {
    return Math.max(Number(timeLog.totalWorkedSeconds), 0);
  }

  return calculateWorkedSeconds(timeLog);
}

function getTimeLogIdleSeconds(timeLog) {
  if (
    timeLog.status === "stopped" &&
    Number.isFinite(Number(timeLog.totalIdleSeconds))
  ) {
    return Math.max(Number(timeLog.totalIdleSeconds), 0);
  }

  const now = Date.now();
  return (timeLog.pauses || []).reduce((total, pause) => {
    if (pause.reason !== "idle" || !pause.pausedAt) {
      return total;
    }

    const end = pause.resumedAt
      ? new Date(pause.resumedAt).getTime()
      : now;
    const start = new Date(pause.pausedAt).getTime();

    return total + Math.max(0, Math.floor((end - start) / 1000));
  }, 0);
}

function appendTimesheetCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.appendChild(cell);
}

function renderTodayTimesheet(timeLogs) {
  const totalSeconds = timeLogs.reduce(
    (total, timeLog) => total + getTimeLogWorkedSeconds(timeLog),
    0
  );
  const totalIdleSeconds = timeLogs.reduce(
    (total, timeLog) => total + getTimeLogIdleSeconds(timeLog),
    0
  );
  const taskIds = new Set(
    timeLogs.map((timeLog) =>
      String(timeLog.task?._id || timeLog.task || "unassigned")
    )
  );

  todayDate.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  todayTotal.textContent = formatDuration(totalSeconds);
  todayIdle.textContent = formatDuration(totalIdleSeconds);
  todaySessions.textContent = String(timeLogs.length);
  todayTasks.textContent = String(taskIds.size);
  todayTimesheetBody.textContent = "";
  todayTimesheetEmpty.hidden = timeLogs.length > 0;

  timeLogs.forEach((timeLog) => {
    const row = document.createElement("tr");
    const status = timeLog.status || "unknown";

    appendTimesheetCell(
      row,
      timeLog.project?.projectName || "Unassigned"
    );
    appendTimesheetCell(
      row,
      timeLog.task?.taskName || "Unassigned"
    );
    appendTimesheetCell(row, formatTime(timeLog.startedAt));
    appendTimesheetCell(
      row,
      timeLog.stoppedAt ? formatTime(timeLog.stoppedAt) : "Active"
    );

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `timesheet-status timesheet-status-${status}`;
    statusBadge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    appendTimesheetCell(
      row,
      formatDuration(getTimeLogIdleSeconds(timeLog))
    );
    appendTimesheetCell(
      row,
      formatDuration(getTimeLogWorkedSeconds(timeLog))
    );
    todayTimesheetBody.appendChild(row);
  });
}

async function loadTodayTimesheet() {
  const token = getToken();

  if (!token) {
    return;
  }

  timesheetMessage.textContent = "Loading today’s task time…";
  refreshTimesheetButton.disabled = true;

  try {
    const response = await fetch(
      `${API_BASE_URL}/time-logs/history?limit=100`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      timesheetMessage.textContent =
        data.message ||
        "Unable to load today’s timesheet.";

      return;
    }

    const todaysTimeLogs = (data.timeLogs || []).filter((timeLog) =>
      isToday(timeLog.startedAt)
    );

    renderTodayTimesheet(todaysTimeLogs);
    timesheetMessage.textContent = "";
  } catch (error) {
    timesheetMessage.textContent =
      "Unable to reach the backend server.";
  } finally {
    refreshTimesheetButton.disabled = false;
  }
}
function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    hours,
    minutes,
    seconds,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function calculateWorkedSeconds(timeLog) {
  const now = new Date();
  const startedAt = new Date(timeLog.startedAt);

  let pausedMilliseconds = 0;

  for (const pause of timeLog.pauses || []) {
    const pausedAt = new Date(pause.pausedAt);

    const pauseEnd = pause.resumedAt
      ? new Date(pause.resumedAt)
      : now;

    pausedMilliseconds +=
      pauseEnd.getTime() - pausedAt.getTime();
  }

  const elapsedMilliseconds =
    now.getTime() - startedAt.getTime();

  return Math.max(
    Math.floor(
      (elapsedMilliseconds - pausedMilliseconds) / 1000
    ),
    0
  );
}

function calculateBreakSeconds(timeLog) {
  const now = Date.now();
  const currentBreak = [...(timeLog?.pauses || [])]
    .reverse()
    .find((pause) => ["break", "manual"].includes(pause.reason) && pause.pausedAt && !pause.resumedAt);
  if (!currentBreak) return 0;
  return Math.max(0, Math.floor((now - new Date(currentBreak.pausedAt).getTime()) / 1000));
}

function updateBreakUI(timeLog = currentTimeLog) {
  const onBreak = isIntentionalBreak(timeLog);
  if (breakClock) breakClock.hidden = !onBreak;
  if (breakDuration) breakDuration.textContent = formatDuration(calculateBreakSeconds(timeLog));
  if (breakTimerButton) breakTimerButton.textContent = onBreak ? "End Break" : "Break";
}

function startLiveDuration(timeLog) {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  const updateDuration = () => {
    const workedSeconds =
      calculateWorkedSeconds(timeLog);

    timerDuration.textContent =
      formatDuration(workedSeconds);
    updateBreakUI(timeLog);
  };

  updateDuration();

  timerInterval = setInterval(
    updateDuration,
    1000
  );
}
async function loadActiveTimer() {
  const token = getToken();

  if (!token) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/time-logs/active`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      timerMessage.textContent =
        data.message || "Unable to load active timer.";

      return;
    }

    if (!data.timeLog) {
      currentTimeLog = null;
      automaticIdlePause = false;
      activeTaskIdleLogout = false;
      timerStatus.textContent = "Not Started";
      timerDuration.textContent = "00:00:00";
      updateBreakUI(null);

      startTimerButton.disabled = false;
      pauseTimerButton.disabled = true;
      if (resumeTimerButton) resumeTimerButton.disabled = true;
      stopTimerButton.disabled = true;

      return;
    }

    const timeLog = data.timeLog;
    currentTimeLog = timeLog;
    activeTaskIdleLogout = timeLog.task?.idleLogout === true;
    // Restored timers require a manual Resume after authentication or app restart.
    automaticIdlePause = false;

    timerStatus.textContent =
      timeLog.status === "paused"
        ? getOpenPauseReason(timeLog) === "idle"
          ? "Paused due to inactivity"
          : "On Break"
        : "Working";
    updateBreakUI(timeLog);

    if (timeLog.project) {
      projectSelect.value = timeLog.project._id;

      await loadTasks(timeLog.project._id);
    }

    if (timeLog.task) {
      taskSelect.value = timeLog.task._id;
    }

    projectSelect.disabled = true;
    taskSelect.disabled = true;

    startTimerButton.disabled = true;

    if (timeLog.status === "running") {
      pauseTimerButton.disabled = false;
      if (resumeTimerButton) resumeTimerButton.disabled = true;

      startLiveDuration(timeLog);
    } else {
      pauseTimerButton.disabled = getOpenPauseReason(timeLog) === "idle";

      const workedSeconds =
        calculateWorkedSeconds(timeLog);

      timerDuration.textContent =
        formatDuration(workedSeconds);
      if (isIntentionalBreak(timeLog)) startLiveDuration(timeLog);
    }

    stopTimerButton.disabled = false;
  } catch (error) {
    timerMessage.textContent =
      "Unable to load active timer.";
  }
}
async function stopTimer() {
  const token = getToken();

  timerMessage.textContent = "";

  if (!token) {
    timerMessage.textContent = "You must be logged in.";
    return;
  }

  try {
    stopTimerButton.disabled = true;

    const response = await fetch(
      `${API_BASE_URL}/time-logs/stop`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      timerMessage.textContent =
        data.message || "Unable to stop timer.";

      stopTimerButton.disabled = false;
      return;
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    currentTimeLog = null;
    automaticIdlePause = false;
    activeTaskIdleLogout = false;
    timerStatus.textContent = "Stopped";
    updateBreakUI(null);

    timerDuration.textContent = formatDuration(
      data.timeLog.totalWorkedSeconds || 0
    );

    timerMessage.textContent =
      data.message || "Timer stopped successfully.";

    startTimerButton.disabled = false;
    pauseTimerButton.disabled = true;
    if (resumeTimerButton) resumeTimerButton.disabled = true;
    stopTimerButton.disabled = true;

    projectSelect.disabled = false;

    taskSelect.disabled =
      !projectSelect.value;
  } catch (error) {
    timerMessage.textContent =
      "Unable to reach the backend server.";

    stopTimerButton.disabled = false;
  }
}
async function pauseTimer(reason = "manual") {
  const token = getToken();

  timerMessage.textContent = "";

  if (!token) {
    timerMessage.textContent = "You must be logged in.";
    return;
  }

  try {
    pauseTimerButton.disabled = true;

    const response = await fetch(
      `${API_BASE_URL}/time-logs/pause`,
      {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      timerMessage.textContent =
        data.message || "Unable to pause timer.";

      pauseTimerButton.disabled = false;
      return;
    }

    if (data.skipped) {
      pauseTimerButton.disabled = false;
      return;
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    currentTimeLog = data.timeLog;
    automaticIdlePause = reason === "idle";

    const workedSeconds =
      calculateWorkedSeconds(data.timeLog);

    timerDuration.textContent =
      formatDuration(workedSeconds);

    timerStatus.textContent = reason === "idle" ? "Idle" : "On Break";
    updateBreakUI(data.timeLog);
    if (reason === "break") startLiveDuration(data.timeLog);

    timerMessage.textContent =
      data.message || "Timer paused successfully.";

    startTimerButton.disabled = true;
    pauseTimerButton.disabled = reason === "idle";
    stopTimerButton.disabled = false;

    projectSelect.disabled = true;
    taskSelect.disabled = true;
  } catch (error) {
    timerMessage.textContent =
      "Unable to reach the backend server.";

    pauseTimerButton.disabled = false;
  }
}
async function resumeTimer(reason = "manual") {
  const token = getToken();

  timerMessage.textContent = "";

  if (!token) {
    timerMessage.textContent = "You must be logged in.";
    return;
  }

  try {
    pauseTimerButton.disabled = true;

    const response = await fetch(
      `${API_BASE_URL}/time-logs/resume`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (reason === "idle" && response.status === 404) {
        automaticIdlePause = false;
        return;
      }

      timerMessage.textContent =
        data.message || "Unable to resume timer.";

      pauseTimerButton.disabled = false;
      return;
    }

    currentTimeLog = data.timeLog;
    automaticIdlePause = false;
    timerStatus.textContent = "Working";
    updateBreakUI(data.timeLog);

    timerMessage.textContent =
      data.message || "Timer resumed successfully.";

    startTimerButton.disabled = true;
    pauseTimerButton.disabled = false;
    if (resumeTimerButton) resumeTimerButton.disabled = true;
    stopTimerButton.disabled = false;

    projectSelect.disabled = true;
    taskSelect.disabled = true;

    startLiveDuration(data.timeLog);
  } catch (error) {
    timerMessage.textContent =
      "Unable to reach the backend server.";

    pauseTimerButton.disabled = false;
  }
}
async function startTimer() {
  const token = getToken();

  const projectId = projectSelect.value;
  const taskId = taskSelect.value;

  timerMessage.textContent = "";

  if (!token) {
    timerMessage.textContent =
      "You must be logged in.";

    return;
  }

  if (!projectId || !taskId) {
    timerMessage.textContent =
      "Please select a project and task first.";

    return;
  }

  try {
    startTimerButton.disabled = true;

    const response = await fetch(
      `${API_BASE_URL}/time-logs/start`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          project: projectId,
          task: taskId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      timerMessage.textContent =
        data.message ||
        "Unable to start timer.";

      startTimerButton.disabled = false;

      return;
    }

    timerStatus.textContent = "Working";

    currentTimeLog = data.timeLog;
    activeTaskIdleLogout = data.timeLog.task?.idleLogout === true
      || taskSelect.selectedOptions[0]?.dataset.idleLogout === "true";
    automaticIdlePause = false;
    updateBreakUI(data.timeLog);
    startLiveDuration(data.timeLog);

    timerMessage.textContent =
      data.message ||
      "Timer started successfully.";

    startTimerButton.disabled = true;
    pauseTimerButton.disabled = false;
    if (resumeTimerButton) resumeTimerButton.disabled = true;
    stopTimerButton.disabled = false;

    projectSelect.disabled = true;
    taskSelect.disabled = true;
  } catch (error) {
    timerMessage.textContent =
      "Unable to reach the backend server.";

    startTimerButton.disabled = false;
  }
}

projectSelect?.addEventListener(
  "change",
  async () => {
    const projectId = projectSelect.value;
    const selectedProject = projectSelect.selectedOptions[0];
    clientName.textContent = selectedProject?.dataset.clientName || "Not selected";

    await loadTasks(projectId);
  }
);

window.addEventListener("focus", async () => {
  if (isLoginPage || !getToken() || currentTimeLog || !projectSelect?.value) return;
  const selectedTaskId = taskSelect.value;
  await loadTasks(projectSelect.value);
  if ([...taskSelect.options].some((option) => option.value === selectedTaskId)) {
    taskSelect.value = selectedTaskId;
  }
});

loginForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    message.textContent = "";

    const rememberedSessionToken = localStorage.getItem("rememberedSessionToken");
    const useRememberedSession = !email && !password && rememberedSessionToken;
    if ((!email || !password) && !useRememberedSession) {
      message.textContent =
        "Email and password are required.";

      return;
    }

    try {
      loginButton.disabled = true;
      loginButton.textContent = "Logging in...";

      const response = await fetch(
        `${API_BASE_URL}${useRememberedSession ? "/auth/quick-login" : "/auth/login"}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(useRememberedSession ? { rememberedSessionToken } : { email, password }),
          signal: AbortSignal.timeout(15000),
        }
      );

      const data = await response.json();
      console.debug(`[desktop-auth] Login response: ${response.status} ${response.url}`);

      if (!response.ok) {
        if (useRememberedSession && [401, 403].includes(response.status)) {
          localStorage.removeItem("rememberedSessionToken");
          localStorage.removeItem("rememberedUser");
          if (rememberedLogin) rememberedLogin.hidden = true;
          if (loginForm) loginForm.hidden = false;
        }
        message.textContent = useRememberedSession
          ? "Your remembered session has expired. Enter your email and password."
          : response.status === 401
            ? "Invalid email or password."
            : response.status === 403
              ? "Your account is inactive or not permitted to use CRM."
              : response.status >= 500
                ? "Server error. Please try again later."
                : data.message || "Login failed.";

        return;
      }

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      if (data.rememberedSessionToken) {
        localStorage.setItem("rememberedSessionToken", data.rememberedSessionToken);
        localStorage.setItem("rememberedUser", JSON.stringify(data.user));
      }

      window.location.replace("./dashboard.html");
    } catch (error) {
      console.error(`[desktop-auth] Login failed for ${API_BASE_URL}/auth/login:`, error.name, error.message);
      message.textContent = error.name === "TimeoutError"
        ? "The server is taking too long to respond. Please try again."
        : "Unable to reach the backend server. Please check your internet connection and try again.";
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  }
);

refreshTimesheetButton?.addEventListener(
  "click",
  loadTodayTimesheet
);

quickLoginButton?.addEventListener("click", () => {
  emailInput.value = "";
  passwordInput.value = "";
  loginForm.requestSubmit();
});

differentAccountButton?.addEventListener("click", () => {
  rememberedLogin.hidden = true;
  loginForm.hidden = false;
  message.textContent = "";
  emailInput.focus();
});

startTimerButton?.addEventListener(
  "click",
  () => runTimerAction(startTimer)
);
stopTimerButton?.addEventListener(
  "click",
  () => runTimerAction(stopTimer)
);
breakTimerButton?.addEventListener("click", () => runTimerAction(() =>
  isIntentionalBreak() ? resumeTimer("break") : pauseTimer("break")
));
logoutButton?.addEventListener("click", () => signOut(logoutPending));

async function initializeApp() {
  const storedUser = getStoredUser();
  const token = getToken();
  if (isLoginPage && sessionStorage.getItem("inactivityLogout")) {
    message.textContent = "You were logged out after 3 minutes of inactivity.";
    sessionStorage.removeItem("inactivityLogout");
  }

  if (isLoginPage && !token && localStorage.getItem("rememberedSessionToken")) {
    const rememberedUser = getRememberedUser();
    if (rememberedLogin && rememberedUser) {
      const rememberedDisplayName = rememberedUser.fullName || rememberedUser.name || "Employee";
      rememberedName.textContent = rememberedDisplayName;
      rememberedEmail.textContent = rememberedUser.email || "Remembered CRM account";
      rememberedAvatar.textContent = rememberedDisplayName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
      rememberedLogin.hidden = false;
      loginForm.hidden = true;
    } else {
      message.textContent = "Click Login to continue with the remembered session.";
    }
  }

  if (isLoginPage && storedUser && token) {
    window.location.replace("./dashboard.html");
    return;
  }

  if (!isLoginPage && (!storedUser || !token)) {
    window.location.replace("./index.html");
    return;
  }

  if (storedUser && token) {
    try {
      const response = await fetch(API_BASE_URL + "/auth/me", {
        headers: { Authorization: "Bearer " + token },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.replace("./index.html");
        return;
      }
      if (!response.ok) throw new Error("Session unavailable");
    } catch {
      // Monitoring still starts with safe defaults while connectivity recovers.
      timerMessage.textContent = "CRM could not refresh your session. Please check your connection.";
    }
    showLoggedInView(storedUser);

    await loadIdlePolicy();
    startIdleMonitor();
    await loadProjects();
    if (logoutPending || !getToken()) return;
    await loadActiveTimer();
    if (logoutPending || !getToken()) return;
    await loadTodayTimesheet();
    if (logoutPending || !getToken()) return;

    idlePolicyRefreshInterval = setInterval(async () => {
      await loadIdlePolicy();
      startIdleMonitor();
    }, 60 * 1000);
  } else {
    showLoggedOutView();
  }
}

initializeApp();
