const {
  app,
  BrowserWindow,
  dialog,
  Menu,
  net,
  ipcMain,
  powerMonitor,
  shell,
} = require("electron");
const path = require("path");
const { fileURLToPath } = require("url");

const APP_ORIGIN = "https://handdy-workspace.onrender.com";
const UPDATE_MANIFEST_URL = `${APP_ORIGIN}/desktop-release.json`;
const DEFAULT_RELEASE_PAGE_URL = `${APP_ORIGIN}/employee/app`;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

let lastPromptedVersion = null;

function compareVersions(firstVersion, secondVersion) {
  const firstParts = String(firstVersion).replace(/^v/i, "").split(".");
  const secondParts = String(secondVersion).replace(/^v/i, "").split(".");
  const partCount = Math.max(firstParts.length, secondParts.length);

  for (let index = 0; index < partCount; index += 1) {
    const firstPart = Number.parseInt(firstParts[index] || "0", 10) || 0;
    const secondPart = Number.parseInt(secondParts[index] || "0", 10) || 0;

    if (firstPart > secondPart) return 1;
    if (firstPart < secondPart) return -1;
  }

  return 0;
}

function getTrustedDashboardUrl(value) {
  try {
    const destination = new URL(value || DEFAULT_RELEASE_PAGE_URL, APP_ORIGIN);
    return destination.protocol === "https:" && destination.origin === APP_ORIGIN
      ? destination.href
      : DEFAULT_RELEASE_PAGE_URL;
  } catch {
    return DEFAULT_RELEASE_PAGE_URL;
  }
}

async function checkForAppUpdate(mainWindow) {
  try {
    const response = await net.fetch(UPDATE_MANIFEST_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Update server returned HTTP ${response.status}`);
    }

    const release = await response.json();
    const latestVersion = String(release.latestVersion || "").trim();

    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(latestVersion)) {
      throw new Error("Update manifest contains an invalid latestVersion");
    }

    const currentVersion = app.getVersion();
    if (
      compareVersions(currentVersion, latestVersion) >= 0 ||
      lastPromptedVersion === latestVersion
    ) {
      console.log(`[updater] Handdy ${currentVersion} is up to date.`);
      return;
    }

    lastPromptedVersion = latestVersion;
    const minimumVersion = String(release.minimumSupportedVersion || "").trim();
    const mandatory = Boolean(release.mandatory) || (
      minimumVersion && compareVersions(currentVersion, minimumVersion) < 0
    );
    const releasePageUrl = getTrustedDashboardUrl(release.releasePageUrl);
    const buttons = mandatory
      ? ["Open download page", "Exit Handdy"]
      : ["Open download page", "Later"];

    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Handdy update available",
      message: `Handdy ${latestVersion} is available`,
      detail: release.message || "Open the Handdy dashboard to download and install the latest version.",
      buttons,
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (result.response === 0) {
      await shell.openExternal(releasePageUrl);
      if (mandatory) app.quit();
    } else if (mandatory) {
      app.quit();
    }
  } catch (error) {
    console.error(`[updater] Update check failed: ${error.message}`);
  }
}

ipcMain.handle("system:get-idle-time", () =>
  powerMonitor.getSystemIdleTime()
);

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const destination = new URL(url);

      if (
        destination.protocol === "https:" &&
        destination.origin === APP_ORIGIN
      ) {
        shell.openExternal(destination.href);
      }
    } catch {
      // Ignore malformed or unapproved external URLs.
    }

    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    try {
      const destination = fileURLToPath(url);
      if (!destination.startsWith(`${path.resolve(__dirname)}${path.sep}`)) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  mainWindow.loadFile("index.html");

  mainWindow.webContents.once("did-finish-load", () => {
    void checkForAppUpdate(mainWindow);
  });

  const updateTimer = setInterval(() => {
    if (!mainWindow.isDestroyed()) void checkForAppUpdate(mainWindow);
  }, UPDATE_CHECK_INTERVAL_MS);
  updateTimer.unref();
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
