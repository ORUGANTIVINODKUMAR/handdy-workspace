const STORAGE_KEY = "crmDeviceId";

export function getDeviceIdentity() {
  let deviceId = localStorage.getItem(STORAGE_KEY);
  if (!deviceId) {
    deviceId = globalThis.crypto?.randomUUID?.()
      || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  return {
    deviceId,
    deviceName: `${navigator.platform || "Computer"} web browser`,
    clientType: "web",
  };
}
