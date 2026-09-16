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
let dataRefreshInterval = null;
let idleCheckInProgress = false;
let idlePolicy = null;
let currentTimeLog = null;
let automaticIdlePause = false;
let idleDefaults = null;
let logoutPending = false;
let logoutInProgress = false;
let timerAction = null;
let activeTaskIdleLogout = false;
let loginInProgress = false;

const IDLE_CHECK_INTERVAL_MS = 5000;
const DATA_REFRESH_INTERVAL_MS = 10 * 1000;
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
  clearInterval(dataRefreshInterval);
  idleMonitorInterval = idlePolicyRefreshInterval = timerInterval = dataRefreshInterval = null;
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

// Work selection state. The project/task <select> elements are rebuilt when
// data refreshes, so the employee's choice is kept here by MongoDB _id and
// re-applied after every rebuild instead of being read back from the DOM.
let selectedProjectId = "";
let selectedTaskId = "";
let projectsSignature = null;
let tasksSignature = null;
let tasksProjectId = "";
let projectRequestId = 0;
let taskRequestId = 0;

// TEMPORARY: work-selection diagnostics. Set to false (or remove) once verified.
const DEBUG_WORK_SELECTION = true;
const debugWorkSelection = (...args) => {
  if (DEBUG_WORK_SELECTION) console.log("[work-selection]", ...args);
};

function setSelectedProjectId(projectId, source) {
  const nextProjectId = String(projectId || "");
  if (nextProjectId === selectedProjectId) return;
  debugWorkSelection("selectedProjectId changed:", selectedProjectId || "(none)", "->", nextProjectId || "(none)", "via", source);
  if (!nextProjectId && DEBUG_WORK_SELECTION) console.trace("[work-selection] selectedProjectId cleared by", source);
  selectedProjectId = nextProjectId;
}

function setSelectedTaskId(taskId, source) {
  const nextTaskId = String(taskId || "");
  if (nextTaskId === selectedTaskId) return;
  debugWorkSelection("selectedTaskId changed:", selectedTaskId || "(none)", "->", nextTaskId || "(none)", "via", source);
  selectedTaskId = nextTaskId;
}

const hasOption = (select, value) =>
  Boolean(value) && [...select.options].some((option) => option.value === value);

// Adds an option for a restored active timer whose project/task is no longer
// in the assignable list, so the running work is still displayed.
function ensureOption(select, value, label) {
  if (!value || hasOption(select, value)) return;
  select.appendChild(new Option(label || "Unavailable", value));
  if (select === projectSelect) projectsSignature = null;
  if (select === taskSelect) tasksSignature = null;
}

function updateClientName() {
  if (!clientName) return;
  const selectedOption = projectSelect.selectedOptions[0];
  clientName.textContent = selectedProjectId && selectedOption?.value
    ? selectedOption.dataset.clientName || "Not assigned"
    : "Not selected";
}

function renderTaskPlaceholder(text) {
  tasksSignature = null;
  taskSelect.replaceChildren(new Option(text, ""));
  taskSelect.disabled = true;
}

async function loadProjects() {
  const token = getToken();

  if (!token || !projectSelect) {
    return false;
  }

  const requestId = ++projectRequestId;

  try {
    // Only active projects can be started (see POST /time-logs/start).
    const response = await fetch(
      `${API_BASE_URL}/projects?limit=100&status=Active`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (requestId !== projectRequestId) return false;

    if (!response.ok) {
      // Keep the current options and selection; a failed refresh must not
      // wipe what the employee has already chosen.
      workSelectionMessage.textContent =
        data.message || "Unable to load projects.";

      return false;
    }

    const projects = Array.isArray(data.projects) ? data.projects : [];
    debugWorkSelection("Projects refreshed:", projects.map((project) => ({ id: project._id, name: project.projectName })));
    debugWorkSelection("Current selectedProjectId:", selectedProjectId || "(none)");

    // Rebuilding the options closes an open dropdown and momentarily shows
    // the placeholder, so only rebuild when the project list really changed.
    const signature = JSON.stringify(
      projects.map((project) => [project._id, project.projectName, project.clientName])
    );

    if (signature !== projectsSignature) {
      projectSelect.replaceChildren(
        new Option("Select Project", ""),
        ...projects.map((project) => {
          const option = new Option(project.projectName, project._id);
          option.dataset.clientName = project.clientName || "Not assigned";
          return option;
        })
      );
      projectsSignature = signature;
    }

    if (selectedProjectId && !hasOption(projectSelect, selectedProjectId) && !currentTimeLog) {
      setSelectedProjectId("", "loadProjects: project is no longer active or assigned");
      setSelectedTaskId("", "loadProjects: project is no longer active or assigned");
    }

    projectSelect.value = selectedProjectId;
    updateClientName();
    workSelectionMessage.textContent = "";
    return true;
  } catch (error) {
    if (requestId === projectRequestId) {
      workSelectionMessage.textContent =
        "Unable to reach the backend server.";
    }
    return false;
  }
}

async function loadTasks(projectId, { background = false } = {}) {
  if (!taskSelect) return;

  const token = getToken();
  const requestId = ++taskRequestId;

  if (!projectId || !token) {
    tasksProjectId = "";
    renderTaskPlaceholder("Select Task");
    return;
  }

  // A background refresh keeps the current options until the response
  // arrives, so the chosen task never flickers back to the placeholder.
  const keepExistingTasks = background && tasksProjectId === projectId && tasksSignature !== null;
  if (!keepExistingTasks) {
    tasksProjectId = projectId;
    renderTaskPlaceholder("Loading tasks...");
  }

  debugWorkSelection("Loading tasks for project:", projectId);

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

    // Ignore responses for a project the employee has already moved away from.
    if (requestId !== taskRequestId || projectId !== selectedProjectId) return;

    debugWorkSelection("Task API response:", data);

    if (!response.ok) {
      if (keepExistingTasks) return;
      renderTaskPlaceholder("Unable to load tasks");
      workSelectionMessage.textContent =
        data.message || "Unable to load tasks.";

      return;
    }

    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    debugWorkSelection("Available tasks:", tasks.map((task) => ({ id: task._id, name: task.taskName })));

    if (tasks.length === 0) {
      renderTaskPlaceholder("No tasks available for this project");
      if (!currentTimeLog) setSelectedTaskId("", "loadTasks: project has no available tasks");
      return;
    }

    const signature = JSON.stringify(
      tasks.map((task) => [task._id, task.taskName, task.idleLogout === true])
    );

    if (signature !== tasksSignature) {
      taskSelect.replaceChildren(
        new Option("Select Task", ""),
        ...tasks.map((task) => {
          const option = new Option(task.taskName, task._id);
          option.dataset.idleLogout = String(task.idleLogout === true);
          return option;
        })
      );
      tasksSignature = signature;
    }

    if (selectedTaskId && !hasOption(taskSelect, selectedTaskId) && !currentTimeLog) {
      setSelectedTaskId("", "loadTasks: task is no longer active or assigned");
    }

    taskSelect.value = selectedTaskId;
    taskSelect.disabled = Boolean(currentTimeLog);
    workSelectionMessage.textContent = "";
  } catch (error) {
    if (requestId !== taskRequestId || projectId !== selectedProjectId || keepExistingTasks) return;
    renderTaskPlaceholder("Unable to load tasks");
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

async function refreshCurrentUser() {
  const token = getToken();
  if (!token || isLoginPage || logoutPending) return true;
  try {
    const response = await fetch(API_BASE_URL + "/auth/me", {
      cache: "no-store",
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(10000),
    });
    if ([401, 403].includes(response.status)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("./index.html");
      return false;
    }
    if (!response.ok) return true;
    const data = await response.json();
    const user = data.user || data;
    localStorage.setItem("user", JSON.stringify(user));
    // Background refresh: update the header/profile only. showLoggedInView
    // would also force the Timer tab every refresh.
    updateUserDetails(user);
    return true;
  } catch {
    return true;
  }
}

let desktopRefreshInFlight = null;

// The interval, window focus and visibilitychange can fire together. Sharing
// one in-flight refresh stops overlapping runs from reading each other's
// half-rebuilt dropdowns.
function refreshDesktopData() {
  if (!desktopRefreshInFlight) {
    desktopRefreshInFlight = runDesktopRefresh().finally(() => {
      desktopRefreshInFlight = null;
    });
  }
  return desktopRefreshInFlight;
}

async function runDesktopRefresh() {
  if (isLoginPage || !getToken() || logoutPending) return;
  if (!(await refreshCurrentUser())) return;
  await loadTodayTimesheet();
  // An active timer owns the project/task display; it is restored from the
  // backend by loadActiveTimer, not by the background refresh.
  if (currentTimeLog) return;

  await loadProjects();
  if (currentTimeLog) return;
  await loadTasks(selectedProjectId, { background: true });
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
  updateUserDetails(user);
}

function updateUserDetails(user) {
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

    // Restore the running work from the backend record (the only place the
    // selection is taken from the server rather than from the employee).
    if (timeLog.project) {
      setSelectedProjectId(timeLog.project._id, "loadActiveTimer: restore active timer");
      setSelectedTaskId(timeLog.task?._id, "loadActiveTimer: restore active timer");
      ensureOption(projectSelect, timeLog.project._id, timeLog.project.projectName);
      projectSelect.value = selectedProjectId;
      updateClientName();

      await loadTasks(timeLog.project._id);
    }

    if (timeLog.task) {
      ensureOption(taskSelect, timeLog.task._id, timeLog.task.taskName);
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

    // Only re-enable the task dropdown when it holds real task options.
    taskSelect.disabled =
      !selectedProjectId || tasksSignature === null;
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

  const projectId = selectedProjectId;
  const taskId = selectedTaskId;

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
    debugWorkSelection("Project selected:", projectSelect.value);

    // Keep the new project; only the previous project's task is cleared.
    setSelectedProjectId(projectSelect.value, "employee changed project");
    setSelectedTaskId("", "employee changed project");
    updateClientName();

    await loadTasks(selectedProjectId);
  }
);

taskSelect?.addEventListener("change", () => {
  debugWorkSelection("Task selected:", taskSelect.value);
  setSelectedTaskId(taskSelect.value, "employee changed task");
});

window.addEventListener("focus", refreshDesktopData);
window.addEventListener("online", refreshDesktopData);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshDesktopData();
});

loginForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    if (loginInProgress) {
      console.debug("[desktop-login] Duplicate submit ignored");
      return;
    }

    loginInProgress = true;

    const email = String(loginForm.elements.email?.value || "").trim();
    const password = String(loginForm.elements.password?.value || "");
    console.debug(`[desktop-login] Button clicked; email present: ${Boolean(email)}; password present: ${Boolean(password)}; API URL: ${API_BASE_URL}/auth/login`);

    message.textContent = "";

    const rememberedSessionToken = localStorage.getItem("rememberedSessionToken");
    const useRememberedSession = !email && !password && rememberedSessionToken;
    if ((!email || !password) && !useRememberedSession) {
      message.textContent =
        "Email and password are required.";
      loginInProgress = false;
      return;
    }

    try {
      loginButton.disabled = true;
      loginButton.textContent = "Logging in...";
      console.debug("[desktop-login] Request started");

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

      if (!data.token || !data.user) {
        throw new Error("Login response did not contain the expected session data");
      }

      localStorage.setItem(
        "token",
        data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );
      console.debug(`[desktop-login] Authentication success; role: ${data.user?.role || "unknown"}`);
      console.debug("[desktop-login] Token stored: yes; user stored: yes");

      if (data.rememberedSessionToken) {
        localStorage.setItem("rememberedSessionToken", data.rememberedSessionToken);
        localStorage.setItem("rememberedUser", JSON.stringify(data.user));
      }

      console.debug("[desktop-login] Navigating to: ./dashboard.html");
      window.location.replace("./dashboard.html");
    } catch (error) {
      console.error(`[desktop-auth] Login failed for ${API_BASE_URL}/auth/login:`, error.name, error.message);
      message.textContent = error.name === "TimeoutError"
        ? "The server is taking too long to respond. Please try again."
        : "Unable to reach the backend server. Please check your internet connection and try again.";
    } finally {
      loginInProgress = false;
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
    dataRefreshInterval = setInterval(refreshDesktopData, DATA_REFRESH_INTERVAL_MS);
  } else {
    showLoggedOutView();
  }
}

initializeApp();
