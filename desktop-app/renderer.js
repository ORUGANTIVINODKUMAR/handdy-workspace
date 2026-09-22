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
const todayBreak = document.getElementById("todayBreak");
const timesheetBreakDuration = document.getElementById("timesheetBreakDuration");
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
const deviceLoginModal = document.getElementById("deviceLoginModal");
const requestingDeviceName = document.getElementById("requestingDeviceName");
const deviceLoginMessage = document.getElementById("deviceLoginMessage");
const keepThisDeviceButton = document.getElementById("keepThisDeviceButton");
const allowNewDeviceButton = document.getElementById("allowNewDeviceButton");

const API_BASE_URL =
  window.electronAPI?.apiBaseUrl || "http://localhost:5000/api";
const DEVICE_INFO = window.electronAPI?.deviceInfo || {
  deviceId: "desktop-development-device",
  deviceName: "CRM desktop app",
  clientType: "desktop",
};
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
let deviceApprovalMonitorActive = false;
let pendingDeviceLoginRequest = null;
// Idle seconds observed on the previous poll. getSystemIdleTime() counts
// continuously since the last real input, so a brief activity burst that
// happens between two polls can already have climbed back past
// ACTIVE_AGAIN_SECONDS by the time the next poll runs. Tracking the previous
// reading lets us detect a drop (this poll's idle seconds < last poll's),
// which is evidence real activity happened since the last check, even when
// the instantaneous value no longer looks "just active".
let lastIdleSeconds = 0;

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

  const user = getStoredUser();
  if (user) localStorage.setItem(`desktop-view:${user._id || user.email || "user"}`, viewName);
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

// Shared classification used by both the "Idle time" total and the timeline
// table so they can never disagree: any pause reason other than an
// intentional break/manual pause counts as idle.
function isIdlePauseReason(reason) {
  return !["break", "manual"].includes(reason);
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
  deviceApprovalMonitorActive = false;
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
    if (inactivity) {
      sessionStorage.setItem("inactivityLogout", "1");
      // Read the configured minutes right now (not a value cached earlier in
      // this session) so the login page can show the policy that actually
      // triggered this logout; idlePolicy itself does not survive the
      // upcoming full-page navigation to index.html.
      const logoutMinutes = idlePolicy ? Math.round(idlePolicy.logoutSeconds / 60) : NaN;
      if (Number.isFinite(logoutMinutes) && logoutMinutes > 0) {
        sessionStorage.setItem("inactivityLogoutMinutes", String(logoutMinutes));
      }
    }
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
    const previousIdleSeconds = lastIdleSeconds;
    lastIdleSeconds = idleSeconds;
    if (!getToken() || isIntentionalBreak()) return;
    // Session-level auto-logout: applies to every logged-in, non-break session
    // regardless of whether a timer is running or that task's idleLogout flag.
    // (idlePolicy.exempt intentionally does NOT block this - it only exempts
    // an employee's active work from being auto-paused for idleness, see below.)
    if (logoutPending || idleSeconds >= idlePolicy.logoutSeconds) {
      await signOut(true);
      return;
    }
    // Per-task auto-pause/resume: only applies while the running task opted
    // into idle enforcement (activeTaskIdleLogout) and the employee isn't
    // idle-tracking exempt.
    if (!activeTaskIdleLogout || idlePolicy.exempt) return;
    if (currentTimeLog?.status === "running" && idleSeconds >= idlePolicy.thresholdSeconds) {
      await runTimerAction(() => pauseTimer("idle"));
    } else if (
      currentTimeLog?.status === "paused" &&
      automaticIdlePause &&
      (idleSeconds <= ACTIVE_AGAIN_SECONDS || idleSeconds < previousIdleSeconds)
    ) {
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

function getWorkSelectionStorageKey() {
  const user = getStoredUser();
  return `desktop-work-selection:${user?._id || user?.email || "user"}`;
}

function restoreWorkSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(getWorkSelectionStorageKey()) || "{}");
    selectedProjectId = String(saved.projectId || "");
    selectedTaskId = String(saved.taskId || "");
  } catch {
    selectedProjectId = "";
    selectedTaskId = "";
  }
}

function saveWorkSelection() {
  localStorage.setItem(getWorkSelectionStorageKey(), JSON.stringify({
    projectId: selectedProjectId,
    taskId: selectedTaskId,
  }));
}

function setSelectedProjectId(projectId, source) {
  const nextProjectId = String(projectId || "");
  if (nextProjectId === selectedProjectId) return;
  selectedProjectId = nextProjectId;
  saveWorkSelection();
}

function setSelectedTaskId(taskId, source) {
  const nextTaskId = String(taskId || "");
  if (nextTaskId === selectedTaskId) return;
  selectedTaskId = nextTaskId;
  saveWorkSelection();
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

    if (!response.ok) {
      if (keepExistingTasks) return;
      renderTaskPlaceholder("Unable to load tasks");
      workSelectionMessage.textContent =
        data.message || "Unable to load tasks.";

      return;
    }

    const tasks = Array.isArray(data.tasks) ? data.tasks : [];

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

function endRevokedDeviceSession(reason = "This account is now active on another device.") {
  deviceApprovalMonitorActive = false;
  clearSessionLoops();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  ["activeTimer", "currentTimeLog", "timerState", "timerStartedAt", "timerElapsedSeconds"].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  sessionStorage.setItem("sessionEndedMessage", reason);
  window.location.replace("./index.html");
}

async function waitForDeviceApproval(loginRequest) {
  message.textContent = `Waiting for approval on ${loginRequest.activeDevice?.deviceName || "the active device"}...`;
  while (loginInProgress) {
    const response = await fetch(`${API_BASE_URL}/auth/login-requests/${encodeURIComponent(loginRequest.requestId)}/wait`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestToken: loginRequest.requestToken }),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await response.json();
    if (response.status === 202) continue;
    if (!response.ok) {
      message.textContent = data.message || "The login request was not approved.";
      return null;
    }
    return data;
  }
  return null;
}

function showDeviceLoginRequest(loginRequest) {
  pendingDeviceLoginRequest = loginRequest;
  requestingDeviceName.textContent = loginRequest.deviceName || "Another device";
  deviceLoginMessage.textContent = "";
  keepThisDeviceButton.disabled = false;
  allowNewDeviceButton.disabled = false;
  deviceLoginModal.hidden = false;
}

async function monitorDeviceLoginRequests() {
  if (deviceApprovalMonitorActive || isLoginPage || !getToken()) return;
  deviceApprovalMonitorActive = true;
  while (deviceApprovalMonitorActive && getToken() && !logoutPending) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-requests/pending`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        signal: AbortSignal.timeout(25_000),
      });
      const data = await response.json();
      if ([401, 403].includes(response.status)) {
        endRevokedDeviceSession(data.message);
        return;
      }
      if (response.ok && data.loginRequest) {
        showDeviceLoginRequest(data.loginRequest);
        deviceApprovalMonitorActive = false;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      if (error.name !== "TimeoutError") await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function decideDeviceLogin(decision) {
  if (!pendingDeviceLoginRequest) return;
  keepThisDeviceButton.disabled = true;
  allowNewDeviceButton.disabled = true;
  deviceLoginMessage.textContent = decision === "allow" ? "Authorizing the new device..." : "Keeping this device active...";
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login-requests/${encodeURIComponent(pendingDeviceLoginRequest.requestId)}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ decision }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to save the decision.");
    if (decision === "allow") {
      endRevokedDeviceSession("You allowed this account to continue on the new device.");
      return;
    }
    pendingDeviceLoginRequest = null;
    deviceLoginModal.hidden = true;
    void monitorDeviceLoginRequests();
  } catch (error) {
    deviceLoginMessage.textContent = error.message;
    keepThisDeviceButton.disabled = false;
    allowNewDeviceButton.disabled = false;
  }
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
      const data = await response.json().catch(() => ({}));
      endRevokedDeviceSession(data.message);
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
  const savedView = localStorage.getItem(`desktop-view:${user._id || user.email || "user"}`);
  showTimerView(savedView === "dashboard" ? "dashboard" : "timer");
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

function appendTimesheetCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.appendChild(cell);
}

function validTimelineTime(value) {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function buildTimeLogTimeline(timeLog, now = Date.now()) {
  const sessionStart = validTimelineTime(timeLog?.startedAt);
  if (sessionStart === null) return [];
  const stoppedAt = validTimelineTime(timeLog?.stoppedAt);
  const sessionEnd = stoppedAt ?? now;
  if (sessionEnd < sessionStart) return [];

  const pauses = [...(timeLog.pauses || [])]
    .map((pause) => ({
      ...pause,
      startMs: validTimelineTime(pause.pausedAt),
      endMs: validTimelineTime(pause.resumedAt),
    }))
    .filter((pause) => pause.startMs !== null)
    .sort((first, second) => first.startMs - second.startMs);
  const counters = { work: 0, break: 0, idle: 0 };
  const entries = [];
  let cursor = sessionStart;

  const addEntry = (type, startMs, endMs, open = false) => {
    if (endMs < startMs) return;
    counters[type] += 1;
    entries.push({
      type,
      sequence: counters[type],
      start: new Date(startMs),
      end: open ? null : new Date(endMs),
      milliseconds: Math.max(0, endMs - startMs),
      seconds: Math.max(0, Math.floor((endMs - startMs) / 1000)),
      open,
    });
  };

  pauses.forEach((pause) => {
    const pauseStart = Math.min(sessionEnd, Math.max(sessionStart, pause.startMs));
    if (pauseStart > cursor) addEntry("work", cursor, pauseStart);
    const openPause = pause.endMs === null && stoppedAt === null;
    const pauseEnd = Math.min(sessionEnd, Math.max(pauseStart, pause.endMs ?? sessionEnd));
    addEntry(isIdlePauseReason(pause.reason) ? "idle" : "break", pauseStart, pauseEnd, openPause);
    cursor = Math.max(cursor, pauseEnd);
  });

  if (cursor < sessionEnd || (entries.length === 0 && cursor === sessionEnd)) {
    addEntry("work", cursor, sessionEnd, stoppedAt === null);
  }

  const workEntries = entries.filter((entry) => entry.type === "work");
  const timestampWorkedSeconds = Math.floor(
    workEntries.reduce((total, entry) => total + entry.milliseconds, 0) / 1000
  );
  const targetWorkedSeconds = timeLog.status === "stopped"
    && Number.isFinite(Number(timeLog.totalWorkedSeconds))
    ? Math.floor(Math.max(0, Number(timeLog.totalWorkedSeconds)))
    : timestampWorkedSeconds;
  if (targetWorkedSeconds > 0 && workEntries.length === 0) {
    const reconciliationEntry = {
      type: "work",
      sequence: 1,
      start: new Date(sessionStart),
      end: new Date(sessionStart),
      milliseconds: 0,
      seconds: 0,
      open: false,
      reconciled: true,
    };
    entries.unshift(reconciliationEntry);
    workEntries.push(reconciliationEntry);
  }
  let workRemainder = targetWorkedSeconds
    - workEntries.reduce((total, entry) => total + entry.seconds, 0);
  const remainderOrder = [...workEntries].sort(
    (first, second) => (second.milliseconds % 1000) - (first.milliseconds % 1000)
  );
  for (let index = 0; workRemainder > 0 && remainderOrder.length; index += 1) {
    remainderOrder[index % remainderOrder.length].seconds += 1;
    workRemainder -= 1;
  }
  const reductionOrder = [...workEntries].sort((first, second) => second.seconds - first.seconds);
  for (let index = 0; workRemainder < 0 && reductionOrder.some((entry) => entry.seconds > 0); index += 1) {
    const entry = reductionOrder[index % reductionOrder.length];
    if (entry.seconds > 0) {
      entry.seconds -= 1;
      workRemainder += 1;
    }
  }
  return entries;
}

function appendTimelineTypeCell(row, entry, timeLog) {
  const cell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `timesheet-entry-badge timesheet-entry-${entry.type}`;
  badge.textContent = entry.type;
  cell.appendChild(badge);
  if (entry.type === "work") {
    const project = document.createElement("span");
    project.className = "timesheet-entry-project";
    project.textContent = timeLog.project?.projectName || "Unassigned";
    cell.appendChild(project);
  }
  row.appendChild(cell);
}

function buildChronologicalTimeline(timeLogs, now = Date.now()) {
  return timeLogs
    .flatMap((timeLog, timeLogIndex) =>
      buildTimeLogTimeline(timeLog, now).map((entry, entryIndex) => ({
        timeLog,
        entry,
        timeLogIndex,
        entryIndex,
      }))
    )
    .sort((first, second) =>
      first.entry.start.getTime() - second.entry.start.getTime()
      || first.timeLogIndex - second.timeLogIndex
      || first.entryIndex - second.entryIndex
    );
}

function summarizeTimeline(timeline) {
  return timeline.reduce((totals, { entry }) => {
    if (entry.type === "work") totals.workSeconds += entry.seconds;
    if (entry.type === "idle") totals.idleSeconds += entry.seconds;
    if (entry.type === "break" && !entry.open) totals.breakSeconds += entry.seconds;
    return totals;
  }, { workSeconds: 0, breakSeconds: 0, idleSeconds: 0 });
}

function renderTodayTimesheet(timeLogs) {
  const timeline = buildChronologicalTimeline(timeLogs);
  const {
    workSeconds: totalSeconds,
    idleSeconds: totalIdleSeconds,
    breakSeconds: totalBreakSeconds,
  } = summarizeTimeline(timeline);
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
  todayBreak.textContent = formatDuration(totalBreakSeconds);
  todayIdle.textContent = formatDuration(totalIdleSeconds);
  todaySessions.textContent = String(timeLogs.length);
  todayTasks.textContent = String(taskIds.size);
  todayTimesheetBody.textContent = "";
  todayTimesheetEmpty.hidden = timeLogs.length > 0;

  timeline.forEach(({ timeLog, entry }) => {
      const row = document.createElement("tr");
      row.className = `timesheet-timeline-row timesheet-${entry.type}-row`;
      appendTimelineTypeCell(row, entry, timeLog);
      appendTimesheetCell(
        row,
        entry.type === "work"
          ? `${timeLog.task?.taskName || "Task"} · Work ${entry.sequence}`
          : `${entry.type === "break" ? "Break" : "Idle"} ${entry.sequence}`
      );
      appendTimesheetCell(row, formatTime(entry.start));
      appendTimesheetCell(row, entry.end ? formatTime(entry.end) : "In progress");

      const status = entry.open
        ? entry.type === "break" ? "break" : entry.type === "idle" ? "paused" : "running"
        : "completed";
      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = `timesheet-status timesheet-status-${status}`;
      statusBadge.textContent = entry.open
        ? entry.type === "break" ? "On break" : entry.type === "idle" ? "Idle" : "Running"
        : "Completed";
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      appendTimesheetCell(row, entry.type === "idle" ? formatDuration(entry.seconds) : "—");
      appendTimesheetCell(row, formatDuration(entry.seconds));
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

    // An overnight session started before midnight but still active (not yet
    // stopped) should always show in "today's" view, even though its
    // startedAt falls on the previous calendar day. Completed sessions keep
    // their existing start-day attribution.
    const todaysTimeLogs = (data.timeLogs || []).filter((timeLog) =>
      isToday(timeLog.startedAt) || timeLog.status === "running" || timeLog.status === "paused"
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

function calculateCurrentWorkSeconds(timeLog, now = Date.now()) {
  const startedAt = validTimelineTime(timeLog?.startedAt);
  if (startedAt === null) return 0;

  const intentionalBreaks = (timeLog.pauses || [])
    .filter((pause) => ["break", "manual"].includes(pause.reason) && pause.pausedAt)
    .sort((first, second) =>
      new Date(first.pausedAt).getTime() - new Date(second.pausedAt).getTime()
    );
  const activeBreak = [...intentionalBreaks].reverse().find((pause) => !pause.resumedAt);
  const lastCompletedBreak = [...intentionalBreaks].reverse().find((pause) => pause.resumedAt);
  const segmentStart = lastCompletedBreak
    ? validTimelineTime(lastCompletedBreak.resumedAt)
    : startedAt;
  if (segmentStart === null) return 0;

  const openPause = [...(timeLog.pauses || [])]
    .reverse()
    .find((pause) => pause.pausedAt && !pause.resumedAt);
  const segmentEnd = activeBreak
    ? validTimelineTime(activeBreak.pausedAt)
    : openPause
      ? validTimelineTime(openPause.pausedAt)
      : now;
  const resolvedEnd = segmentEnd ?? now;
  const idleMilliseconds = (timeLog.pauses || []).reduce((total, pause) => {
    if (!isIdlePauseReason(pause.reason) || !pause.pausedAt) return total;
    const pauseStart = Math.max(segmentStart, validTimelineTime(pause.pausedAt) ?? resolvedEnd);
    const pauseEnd = Math.min(
      resolvedEnd,
      pause.resumedAt ? validTimelineTime(pause.resumedAt) ?? resolvedEnd : resolvedEnd
    );
    return total + Math.max(0, pauseEnd - pauseStart);
  }, 0);

  return Math.max(0, Math.floor((resolvedEnd - segmentStart - idleMilliseconds) / 1000));
}

function calculateBreakSeconds(timeLog) {
  if (!isIntentionalBreak(timeLog)) return 0;
  const now = Date.now();
  const currentBreak = [...(timeLog?.pauses || [])]
    .reverse()
    .find((pause) => ["break", "manual"].includes(pause.reason) && pause.pausedAt && !pause.resumedAt);
  if (!currentBreak) return 0;
  return Math.max(0, Math.floor((now - new Date(currentBreak.pausedAt).getTime()) / 1000));
}

function updateBreakUI(timeLog = currentTimeLog) {
  const onBreak = isIntentionalBreak(timeLog);
  if (breakClock) breakClock.hidden = false;
  const currentBreakDuration = formatDuration(calculateBreakSeconds(timeLog));
  if (breakDuration) breakDuration.textContent = currentBreakDuration;
  if (timesheetBreakDuration) timesheetBreakDuration.textContent = currentBreakDuration;
  if (breakTimerButton) breakTimerButton.textContent = onBreak ? "End Break" : "Start Break";
}

// Notes can only be attached when a new timer is started (there is no
// "update note on a running timer" endpoint), so the note controls stay
// disabled - never hidden, so the feature is still discoverable - whenever
// a timer is already running or paused.
function updateNoteControlsUI(timeLog = currentTimeLog) {
  const timerActive = Boolean(timeLog);
  if (addNoteButton) {
    addNoteButton.disabled = timerActive;
    addNoteButton.title = timerActive
      ? "Notes can only be added when starting a new timer."
      : "";
  }
  if (timerNote) {
    timerNote.disabled = timerActive;
  }
}

function stopLiveDuration() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startLiveDuration(timeLog) {
  stopLiveDuration();

  const updateDuration = () => {
    const workedSeconds =
      calculateCurrentWorkSeconds(timeLog);

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

    stopLiveDuration();
    if (!data.timeLog) {
      currentTimeLog = null;
      automaticIdlePause = false;
      activeTaskIdleLogout = false;
      timerStatus.textContent = "Not Started";
      timerDuration.textContent = "00:00:00";
      updateBreakUI(null);
      updateNoteControlsUI(null);

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
          ? "Idle"
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
    updateNoteControlsUI(timeLog);

    startTimerButton.disabled = true;

    if (timeLog.status === "running") {
      pauseTimerButton.disabled = false;
      if (resumeTimerButton) resumeTimerButton.disabled = true;

      startLiveDuration(timeLog);
    } else {
      pauseTimerButton.disabled = getOpenPauseReason(timeLog) === "idle";

      const workedSeconds =
        calculateCurrentWorkSeconds(timeLog);

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

    stopLiveDuration();

    currentTimeLog = null;
    automaticIdlePause = false;
    activeTaskIdleLogout = false;
    timerStatus.textContent = "Stopped";
    updateBreakUI(null);
    updateNoteControlsUI(null);

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

    stopLiveDuration();

    currentTimeLog = data.timeLog;
    automaticIdlePause = reason === "idle";

    const workedSeconds =
      calculateCurrentWorkSeconds(data.timeLog);

    timerDuration.textContent =
      formatDuration(workedSeconds);

    timerStatus.textContent = reason === "idle" ? "Idle" : "On Break";
    updateBreakUI(data.timeLog);
    updateNoteControlsUI(data.timeLog);
    if (reason === "break") startLiveDuration(data.timeLog);

    timerMessage.textContent =
      reason === "break" ? "Break started successfully." : data.message || "Timer paused successfully.";

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

    stopLiveDuration();
    currentTimeLog = data.timeLog;
    automaticIdlePause = false;
    timerStatus.textContent = "Working";
    updateBreakUI(data.timeLog);
    updateNoteControlsUI(data.timeLog);

    timerMessage.textContent =
      reason === "break" ? "Break ended successfully." : data.message || "Timer resumed successfully.";

    startTimerButton.disabled = true;
    pauseTimerButton.disabled = false;
    if (resumeTimerButton) resumeTimerButton.disabled = true;
    stopTimerButton.disabled = false;

    projectSelect.disabled = true;
    taskSelect.disabled = true;

    startLiveDuration(data.timeLog);
    if (reason === "break") void loadTodayTimesheet();
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
          note: (timerNote?.value || "").trim() || undefined,
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
    updateNoteControlsUI(data.timeLog);
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

    if (timerNote) {
      timerNote.value = "";
      timerNote.hidden = true;
    }
  } catch (error) {
    timerMessage.textContent =
      "Unable to reach the backend server.";

    startTimerButton.disabled = false;
  }
}

projectSelect?.addEventListener(
  "change",
  async () => {
    // Keep the new project; only the previous project's task is cleared.
    setSelectedProjectId(projectSelect.value, "employee changed project");
    setSelectedTaskId("", "employee changed project");
    updateClientName();

    await loadTasks(selectedProjectId);
  }
);

taskSelect?.addEventListener("change", () => {
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

          body: JSON.stringify(useRememberedSession
            ? { rememberedSessionToken, ...DEVICE_INFO }
            : { email, password, ...DEVICE_INFO }),
          signal: AbortSignal.timeout(15000),
        }
      );

      let data = await response.json();
      console.debug(`[desktop-auth] Login response: ${response.status} ${response.url}`);

      if (response.status === 409 && data.code === "DEVICE_APPROVAL_REQUIRED") {
        data = await waitForDeviceApproval(data.loginRequest);
        if (!data) return;
      } else if (!response.ok) {
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
logoutButton?.addEventListener("click", () => signOut(false));
keepThisDeviceButton?.addEventListener("click", () => decideDeviceLogin("deny"));
allowNewDeviceButton?.addEventListener("click", () => decideDeviceLogin("allow"));

async function initializeApp() {
  const storedUser = getStoredUser();
  const token = getToken();
  if (isLoginPage && sessionStorage.getItem("inactivityLogout")) {
    const logoutMinutes = Number(sessionStorage.getItem("inactivityLogoutMinutes"));
    message.textContent = Number.isFinite(logoutMinutes) && logoutMinutes > 0
      ? `You were logged out after ${logoutMinutes} minute${logoutMinutes === 1 ? "" : "s"} of inactivity.`
      : "You were logged out after a period of inactivity.";
    sessionStorage.removeItem("inactivityLogout");
    sessionStorage.removeItem("inactivityLogoutMinutes");
  }
  if (isLoginPage && sessionStorage.getItem("sessionEndedMessage")) {
    message.textContent = sessionStorage.getItem("sessionEndedMessage");
    sessionStorage.removeItem("sessionEndedMessage");
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
    restoreWorkSelection();
    showLoggedInView(storedUser);

    await loadIdlePolicy();
    startIdleMonitor();
    void monitorDeviceLoginRequests();
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
