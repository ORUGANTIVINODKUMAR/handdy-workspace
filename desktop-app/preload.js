const { contextBridge, ipcRenderer } = require("electron");

const apiBaseUrl = ipcRenderer.sendSync("config:get-api-base-url");
const deviceInfo = ipcRenderer.sendSync("config:get-device-info");

contextBridge.exposeInMainWorld("electronAPI", {
  getIdleDefaults: () => ipcRenderer.invoke("system:idle-defaults"),
  isElectron: true,
  platform: process.platform,
  apiBaseUrl,
  deviceInfo,
  getSystemIdleTime: () => ipcRenderer.invoke("system:get-idle-time"),
});
