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
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");
const { fileURLToPath } = require("url");
const { PRODUCTION_APP_ORIGIN, resolveApiBaseUrl } = require("./api-config");

// Pin the existing package-derived profile before changing the display name.
// This preserves saved employee sessions in both development and packaged builds.
app.setPath("userData", app.getPath("userData"));
app.setName("CRM");

// Development clients share the local API; packaged clients share production.
// HANDDY_API_URL remains the explicit override for staging or custom builds.
process.env.CRM_API_BASE_URL = resolveApiBaseUrl({
  isPackaged: app.isPackaged,
  override: process.env.HANDDY_API_URL,
});

ipcMain.on("config:get-api-base-url", (event) => {
  event.returnValue = process.env.CRM_API_BASE_URL;
});

function getPersistentDeviceInfo() {
  const deviceFile = path.join(app.getPath("userData"), "device.json");
  try {
    const saved = JSON.parse(fs.readFileSync(deviceFile, "utf8"));
    if (typeof saved.deviceId === "string" && saved.deviceId.length >= 16) {
      return { deviceId: saved.deviceId, deviceName: saved.deviceName || os.hostname(), clientType: "desktop" };
    }
  } catch {
    // The first run (or a damaged file) creates a fresh installation identity.
  }
  const device = { deviceId: crypto.randomUUID(), deviceName: os.hostname(), clientType: "desktop" };
  fs.mkdirSync(path.dirname(deviceFile), { recursive: true });
  fs.writeFileSync(deviceFile, JSON.stringify(device, null, 2), { mode: 0o600 });
  return device;
}

ipcMain.on("config:get-device-info", (event) => {
  event.returnValue = getPersistentDeviceInfo();
});

const APP_ORIGIN = PRODUCTION_APP_ORIGIN;
const UPDATE_MANIFEST_URL = `${APP_ORIGIN}/desktop-release.json`;
const DEFAULT_RELEASE_PAGE_URL = `${APP_ORIGIN}/employee/app`;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

let lastPromptedVersion = null;
let mainWindowRef = null;

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
      console.log(`[updater] CRM ${currentVersion} is up to date.`);
      return;
    }

    lastPromptedVersion = latestVersion;
    const minimumVersion = String(release.minimumSupportedVersion || "").trim();
    const mandatory = Boolean(release.mandatory) || (
      minimumVersion && compareVersions(currentVersion, minimumVersion) < 0
    );
    const releasePageUrl = getTrustedDashboardUrl(release.releasePageUrl);
    const buttons = mandatory
      ? ["Open download page", "Exit CRM"]
      : ["Open download page", "Later"];

    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "CRM update available",
      message: `CRM ${latestVersion} is available`,
      detail: release.message || "Open the CRM dashboard to download and install the latest version.",
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
ipcMain.handle("system:idle-defaults", () => require("./idle-policy-defaults.json"));

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: "CRM",
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

  mainWindowRef = mainWindow;

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

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[electron] Page failed to load: ${errorCode} ${errorDescription} ${validatedURL}`);
  });

  mainWindow.webContents.once("did-finish-load", () => {
    console.log(`[electron] Page loaded: ${mainWindow.webContents.getURL()}`);
    void checkForAppUpdate(mainWindow);
  });

  const updateTimer = setInterval(() => {
    if (!mainWindow.isDestroyed()) void checkForAppUpdate(mainWindow);
  }, UPDATE_CHECK_INTERVAL_MS);
  updateTimer.unref();

  // On macOS, window-all-closed doesn't quit the app, so repeated
  // close/reopen cycles would otherwise leak one updateTimer interval per
  // closed window.
  mainWindow.on("closed", () => {
    clearInterval(updateTimer);
    if (mainWindowRef === mainWindow) mainWindowRef = null;
  });
}

const ownsSession = app.requestSingleInstanceLock();
if (!ownsSession) app.quit();

// A second launch (e.g. double-clicking the app icon while it's already
// running, possibly minimized) quits immediately via the lock above; bring
// the existing window to the foreground instead of leaving the user with no
// visible response.
app.on("second-instance", () => {
  if (!mainWindowRef || mainWindowRef.isDestroyed()) return;
  if (mainWindowRef.isMinimized()) mainWindowRef.restore();
  mainWindowRef.show();
  mainWindowRef.focus();
});

app.whenReady().then(() => {
  if (!ownsSession) return;
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
