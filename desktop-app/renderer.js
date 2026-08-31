const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const message = document.getElementById("message");

const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const isLoginPage = document.body.dataset.page === "login";

const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");

const attendanceStatus = document.getElementById("attendanceStatus");
const checkInTime = document.getElementById("checkInTime");
const checkOutTime = document.getElementById("checkOutTime");
const totalHours = document.getElementById("totalHours");
const attendanceMessage = document.getElementById("attendanceMessage");

const checkInButton = document.getElementById("checkInButton");
const checkOutButton = document.getElementById("checkOutButton");

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

const pauseTimerButton = document.getElementById(
  "pauseTimerButton"
);

const resumeTimerButton = document.getElementById(
  "resumeTimerButton"
);

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

const showTimerView = (viewName) => {
  timerViewPanels.forEach((panel) => {
    panel.hidden = panel.dataset.timerPanel !== viewName;
  });

  timerNavigationButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.timerView === viewName);
  });
};

timerNavigationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showTimerView(button.dataset.timerView);
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
      `${API_BASE_URL}/tasks?project=${encodeURIComponent(projectId)}&limit=100`,
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
    return "Not recorded";
  }

  return new Date(value).toLocaleTimeString();
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

function updateAttendanceUI(attendance) {
  if (!attendance) {
    attendanceStatus.textContent = "Not checked in";
    checkInTime.textContent = "Not recorded";
    checkOutTime.textContent = "Not recorded";
    totalHours.textContent = "Not available";

    checkInButton.disabled = false;
    checkOutButton.disabled = true;

    return;
  }

  if (attendance.checkOut) {
    attendanceStatus.textContent = "Checked out";
  } else {
    attendanceStatus.textContent = "Checked in";
  }

  checkInTime.textContent = formatTime(
    attendance.checkIn
  );

  checkOutTime.textContent = formatTime(
    attendance.checkOut
  );

  totalHours.textContent =
    attendance.totalHours !== undefined &&
      attendance.totalHours !== null
      ? attendance.totalHours
      : "Not available";

  checkInButton.disabled = true;

  checkOutButton.disabled = Boolean(
    attendance.checkOut
  );
}

async function getTodayAttendance() {
  const token = getToken();

  if (!token) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/attendance/today`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      attendanceMessage.textContent =
        data.message ||
        "Unable to load attendance.";

      return;
    }

    updateAttendanceUI(data.attendance);
  } catch (error) {
    attendanceMessage.textContent =
      "Unable to reach the backend server.";
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

function startLiveDuration(timeLog) {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  const updateDuration = () => {
    const workedSeconds =
      calculateWorkedSeconds(timeLog);

    timerDuration.textContent =
      formatDuration(workedSeconds);
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
      timerStatus.textContent = "Idle";
      timerDuration.textContent = "00:00:00";

      startTimerButton.disabled = false;
      pauseTimerButton.disabled = true;
      resumeTimerButton.disabled = true;
      stopTimerButton.disabled = true;

      return;
    }

    const timeLog = data.timeLog;

    timerStatus.textContent =
      timeLog.status === "paused"
        ? "Paused"
        : "Running";

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
      resumeTimerButton.disabled = true;

      startLiveDuration(timeLog);
    } else {
      pauseTimerButton.disabled = true;
      resumeTimerButton.disabled = false;

      const workedSeconds =
        calculateWorkedSeconds(timeLog);

      timerDuration.textContent =
        formatDuration(workedSeconds);
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

    timerStatus.textContent = "Idle";

    timerDuration.textContent = formatDuration(
      data.timeLog.totalWorkedSeconds || 0
    );

    timerMessage.textContent =
      data.message || "Timer stopped successfully.";

    startTimerButton.disabled = false;
    pauseTimerButton.disabled = true;
    resumeTimerButton.disabled = true;
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
async function pauseTimer() {
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      timerMessage.textContent =
        data.message || "Unable to pause timer.";

      pauseTimerButton.disabled = false;
      return;
    }

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    const workedSeconds =
      calculateWorkedSeconds(data.timeLog);

    timerDuration.textContent =
      formatDuration(workedSeconds);

    timerStatus.textContent = "Paused";

    timerMessage.textContent =
      data.message || "Timer paused successfully.";

    startTimerButton.disabled = true;
    pauseTimerButton.disabled = true;
    resumeTimerButton.disabled = false;
    stopTimerButton.disabled = false;

    projectSelect.disabled = true;
    taskSelect.disabled = true;
  } catch (error) {
    timerMessage.textContent =
      "Unable to reach the backend server.";

    pauseTimerButton.disabled = false;
  }
}
async function resumeTimer() {
  const token = getToken();

  timerMessage.textContent = "";

  if (!token) {
    timerMessage.textContent = "You must be logged in.";
    return;
  }

  try {
    resumeTimerButton.disabled = true;

    const response = await fetch(
      `${API_BASE_URL}/time-logs/resume`,
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
        data.message || "Unable to resume timer.";

      resumeTimerButton.disabled = false;
      return;
    }

    timerStatus.textContent = "Running";

    timerMessage.textContent =
      data.message || "Timer resumed successfully.";

    startTimerButton.disabled = true;
    pauseTimerButton.disabled = false;
    resumeTimerButton.disabled = true;
    stopTimerButton.disabled = false;

    projectSelect.disabled = true;
    taskSelect.disabled = true;

    startLiveDuration(data.timeLog);
  } catch (error) {
    timerMessage.textContent =
      "Unable to reach the backend server.";

    resumeTimerButton.disabled = false;
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

    timerStatus.textContent = "Running";

    startLiveDuration(data.timeLog);

    timerMessage.textContent =
      data.message ||
      "Timer started successfully.";

    startTimerButton.disabled = true;
    pauseTimerButton.disabled = false;
    resumeTimerButton.disabled = true;
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

loginForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    message.textContent = "";

    if (!email || !password) {
      message.textContent =
        "Email and password are required.";

      return;
    }

    try {
      loginButton.disabled = true;
      loginButton.textContent = "Logging in...";

      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        message.textContent =
          data.message || "Login failed.";

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

      window.location.replace("./dashboard.html");
    } catch (error) {
      message.textContent =
        "Unable to reach the backend server.";
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  }
);

checkInButton?.addEventListener(
  "click",
  async () => {
    const token = getToken();

    attendanceMessage.textContent = "";

    try {
      checkInButton.disabled = true;

      const response = await fetch(
        `${API_BASE_URL}/attendance/check-in`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        attendanceMessage.textContent =
          data.message ||
          "Check-in failed.";

        return;
      }

      attendanceMessage.textContent =
        data.message ||
        "Check-in successful.";

      updateAttendanceUI(
        data.attendance
      );
    } catch (error) {
      attendanceMessage.textContent =
        "Unable to reach the backend server.";
    } finally {
      await getTodayAttendance();
    }
  }
);

checkOutButton?.addEventListener(
  "click",
  async () => {
    const token = getToken();

    attendanceMessage.textContent = "";

    try {
      checkOutButton.disabled = true;

      const response = await fetch(
        `${API_BASE_URL}/attendance/check-out`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        attendanceMessage.textContent =
          data.message ||
          "Check-out failed.";

        return;
      }

      attendanceMessage.textContent =
        data.message ||
        "Check-out successful.";

      updateAttendanceUI(
        data.attendance
      );
    } catch (error) {
      attendanceMessage.textContent =
        "Unable to reach the backend server.";
    } finally {
      await getTodayAttendance();
    }
  }
);

startTimerButton?.addEventListener(
  "click",
  startTimer
);
stopTimerButton?.addEventListener(
  "click",
  stopTimer
);
pauseTimerButton?.addEventListener(
  "click",
  pauseTimer
);
resumeTimerButton?.addEventListener(
  "click",
  resumeTimer
);
logoutButton?.addEventListener(
  "click",
  async () => {
    const token = getToken();

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Local sign-out still completes when the backend is unavailable.
      }
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.replace("./index.html");
  }
);

async function initializeApp() {
  const storedUser = getStoredUser();
  const token = getToken();

  if (isLoginPage && storedUser && token) {
    window.location.replace("./dashboard.html");
    return;
  }

  if (!isLoginPage && (!storedUser || !token)) {
    window.location.replace("./index.html");
    return;
  }

  if (storedUser && token) {
    showLoggedInView(storedUser);

    await getTodayAttendance();
    await loadProjects();
    await loadActiveTimer();
  } else {
    showLoggedOutView();
  }
}

initializeApp();
