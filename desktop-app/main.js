const {
  app,
  BrowserWindow,
  dialog,
  Menu,
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
const { startAppUpdater } = require("./app-updater");

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
let mainWindowRef = null;
const closeReadyWindows = new WeakSet();
const closeFallbackTimers = new WeakMap();

ipcMain.on("app:close-ready", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) return;
  closeReadyWindows.add(window);
  const fallbackTimer = closeFallbackTimers.get(window);
  if (fallbackTimer) clearTimeout(fallbackTimer);
  closeFallbackTimers.delete(window);
  window.close();
});

ipcMain.on("app:close-cancelled", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window.isDestroyed()) return;
  const fallbackTimer = closeFallbackTimers.get(window);
  if (fallbackTimer) clearTimeout(fallbackTimer);
  closeFallbackTimers.delete(window);
});

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
      backgroundThrottling: false,
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
  });

  mainWindow.on("close", (event) => {
    if (closeReadyWindows.has(mainWindow)) return;
    event.preventDefault();

    if (!closeFallbackTimers.has(mainWindow)) {
      mainWindow.webContents.send("app:before-close");
      const fallbackTimer = setTimeout(() => {
        if (mainWindow.isDestroyed()) return;
        closeFallbackTimers.delete(mainWindow);
        // A hung renderer is not proof that the backend timer stopped.
        // Keep the window open so the employee can retry the close request.
        void dialog.showMessageBox(mainWindow, {
          type: "warning",
          title: "Timer stop not confirmed",
          message: "CRM could not confirm that your timer stopped.",
          detail: "The app is staying open. Check your connection and close it again.",
          buttons: ["OK"],
          noLink: true,
        });
      }, 25_000);
      fallbackTimer.unref();
      closeFallbackTimers.set(mainWindow, fallbackTimer);
    }
  });

  mainWindow.on("closed", () => {
    const fallbackTimer = closeFallbackTimers.get(mainWindow);
    if (fallbackTimer) clearTimeout(fallbackTimer);
    closeFallbackTimers.delete(mainWindow);
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
  startAppUpdater(app);

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
