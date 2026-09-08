const { contextBridge, ipcRenderer } = require("electron");

// The packaged desktop client uses the live CRM API. Developers can still
// override this with HANDDY_API_URL when running against a local/test server.
const apiBaseUrl =
  process.env.HANDDY_API_URL ||
  "https://handdy-workspace.onrender.com/api";

contextBridge.exposeInMainWorld("electronAPI", {
  getIdleDefaults: () => ipcRenderer.invoke("system:idle-defaults"),
  isElectron: true,
  platform: process.platform,
  apiBaseUrl,
  getSystemIdleTime: () => ipcRenderer.invoke("system:get-idle-time"),
});
