const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const RETRY_INTERVAL_MS = 15 * 60 * 1000;
const STARTUP_DELAY_MS = 15 * 1000;

// Independent of renderer/auth/timer state. Installation is left to the
// updater's supported quit hook, after the existing close handshake succeeds.
function createUpdateService({
  app,
  autoUpdater,
  logger,
  Notification,
  platform = process.platform,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  if (!app.isPackaged || platform !== "win32") return null;

  let timer = null;
  let stopped = false;
  let checking = false;
  let downloaded = false;
  let progressBucket = -1;

  autoUpdater.logger = logger;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  logger.info(`[Updater] Current version: ${app.getVersion()}`);
  autoUpdater.on("checking-for-update", () => logger.info("[Updater] Checking GitHub Releases for updates..."));
  autoUpdater.on("update-available", (info) => {
    progressBucket = -1;
    logger.info(`[Updater] Update available: ${info.version}; downloading automatically.`);
  });
  autoUpdater.on("update-not-available", () => logger.info("[Updater] No new version available."));
  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.min(100, Math.max(0, Math.floor(progress.percent)));
    const bucket = Math.floor(percent / 10);
    if (!Number.isFinite(percent) || bucket === progressBucket) return;
    progressBucket = bucket;
    logger.info(`[Updater] Download progress: ${percent}% (${progress.transferred}/${progress.total} bytes)`);
  });
  autoUpdater.on("error", (error) => {
    logger.error(`[Updater] Update error: ${error.message || String(error)}. CRM can continue running.`);
  });
  autoUpdater.on("update-downloaded", (info) => {
    if (downloaded) return;
    downloaded = true;
    if (timer) cancel(timer);
    timer = null;
    logger.info(`[Updater] Update downloaded: ${info.version}. It will install when CRM closes normally.`);
    try {
      if (Notification.isSupported()) {
        new Notification({
          title: "CRM Update Ready",
          body: `Version ${info.version} has been downloaded. It will install when you close CRM. Continue working and reopen CRM after installation finishes.`,
        }).show();
      }
    } catch (error) {
      logger.warn(`[Updater] Could not show update notification: ${error.message}`);
    }
  });

  function queueCheck(delay) {
    if (stopped || downloaded) return;
    timer = schedule(() => { timer = null; void check(); }, delay);
    timer.unref?.();
  }

  async function check() {
    if (stopped || downloaded || checking) return;
    if (timer) cancel(timer);
    timer = null;
    checking = true;
    let nextDelay = CHECK_INTERVAL_MS;
    try {
      const result = await autoUpdater.checkForUpdates();
      // checkForUpdates resolves before the automatic download finishes.
      // Await its promise to catch failures and avoid overlapping retries.
      if (result?.downloadPromise) await result.downloadPromise;
    } catch (error) {
      logger.warn(`[Updater] Check/download failed: ${error.message || String(error)}. Retrying in 15 minutes.`);
      nextDelay = RETRY_INTERVAL_MS;
    } finally {
      checking = false;
      queueCheck(nextDelay);
    }
  }

  function stop() {
    stopped = true;
    if (timer) cancel(timer);
    timer = null;
  }

  // will-quit follows successful window closure; a cancelled close keeps
  // update checks running. Do not remove electron-updater's quit listener.
  app.once("will-quit", stop);
  queueCheck(STARTUP_DELAY_MS);
  return { check, stop };
}

function startAppUpdater(app) {
  if (!app.isPackaged || process.platform !== "win32") return;
  try {
    const { autoUpdater } = require("electron-updater");
    const logger = require("electron-log/main");
    const { Notification } = require("electron");
    const path = require("path");
    logger.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), "logs", "updater.log");
    logger.transports.file.maxSize = 1024 * 1024;
    logger.transports.file.level = "info";
    logger.transports.console.level = "info";
    return createUpdateService({ app, autoUpdater, logger, Notification });
  } catch (error) {
    console.error(`[Updater] Could not initialize updates: ${error.message}. CRM can continue running.`);
  }
}

module.exports = { createUpdateService, startAppUpdater, CHECK_INTERVAL_MS, RETRY_INTERVAL_MS, STARTUP_DELAY_MS };
