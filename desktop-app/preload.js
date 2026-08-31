const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  apiBaseUrl: process.env.HANDDY_API_URL || "http://localhost:5000/api",
});
