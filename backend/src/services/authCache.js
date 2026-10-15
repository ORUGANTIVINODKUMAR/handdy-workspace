// Short-lived cache for the Employee + AuthSession pair that `protect` loads on
// every request. It removes two Atlas reads from each polling request.
//
// Safety: the whole cache is cleared whenever an Employee or AuthSession is
// written (revocation, deactivation, password change, device approval), and
// entries also expire after TTL_MS in case a write happens on another server
// instance. Set AUTH_CACHE_TTL_MS=0 to turn the cache off.
const TTL_MS = Number.parseInt(process.env.AUTH_CACHE_TTL_MS ?? "15000", 10);
const MAX_ENTRIES = 500;
const entries = new Map();

const keyFor = (employeeId, sessionId, deviceId) => `${employeeId}:${sessionId}:${deviceId}`;

function getAuthEntry(employeeId, sessionId, deviceId) {
  if (!(TTL_MS > 0)) return null;
  const key = keyFor(employeeId, sessionId, deviceId);
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return null;
  }
  return entry;
}

function setAuthEntry(employeeId, sessionId, deviceId, value) {
  if (!(TTL_MS > 0)) return value;
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
  const entry = { ...value, expiresAt: Date.now() + TTL_MS };
  entries.set(keyFor(employeeId, sessionId, deviceId), entry);
  return entry;
}

function clearAuthCache() {
  entries.clear();
}

// Mongoose plugin: any write to the model clears the cache. Writes that only
// refresh `lastActivity` pass `{ skipAuthCacheClear: true }` so the heartbeat
// itself does not defeat the cache.
function authCachePlugin(schema) {
  for (const operation of ["save", "insertMany", "updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete", "replaceOne", "findOneAndReplace", "bulkWrite"]) {
    schema.post(operation, function () {
      const options = typeof this?.getOptions === "function" ? this.getOptions() : null;
      if (options?.skipAuthCacheClear) return;
      clearAuthCache();
    });
  }
}

module.exports = { getAuthEntry, setAuthEntry, clearAuthCache, authCachePlugin };
