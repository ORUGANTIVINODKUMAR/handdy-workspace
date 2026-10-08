// Local wake-ups keep approvals fast. A bounded database fallback also covers
// writes made by another server instance. Notifications never grant access.
const listeners = new Map();

function subscribe(keys, listener) {
  for (const key of new Set(keys)) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(listener);
  }
  return () => {
    for (const key of keys) {
      const group = listeners.get(key);
      group?.delete(listener);
      if (!group?.size) listeners.delete(key);
    }
  };
}

function notify(keys) {
  const pending = new Set(keys.flatMap((key) => [...(listeners.get(key) || [])]));
  for (const listener of pending) listener();
}

function createLoginWaiter(req, res, keys) {
  let changed = false;
  let closed = Boolean(req.aborted || res.destroyed);
  let finishWait;
  let timer;
  const wake = () => {
    changed = true;
    finishWait?.();
  };
  const unsubscribe = subscribe(keys, wake);
  const close = () => { closed = true; finishWait?.(); };
  req.on?.("aborted", close);
  res.on?.("close", close);
  return {
    get closed() { return closed; },
    async wait(milliseconds) {
      if (closed) return;
      if (changed) { changed = false; return; }
      await new Promise((resolve) => {
        finishWait = () => {
          clearTimeout(timer);
          finishWait = undefined;
          changed = false;
          resolve();
        };
        timer = setTimeout(finishWait, Math.max(0, milliseconds));
      });
    },
    dispose() {
      close();
      unsubscribe();
      req.removeListener?.("aborted", close);
      res.removeListener?.("close", close);
    },
  };
}

function loginNotificationPlugin(schema, { requests = false } = {}) {
  const signal = (document, filter = {}) => {
    const keys = [];
    const employee = document?.employee || filter.employee;
    const session = requests ? document?.existingSession : document?._id || filter._id;
    if (employee && (typeof employee !== "object" || employee.toHexString)) keys.push(`employee:${employee}`);
    if (session && (typeof session !== "object" || session.toHexString)) keys.push(`session:${session}`);
    if (requests) {
      if (document?.status === "approving") return;
      keys.push("requests");
      if (document?.requestId || filter.requestId) keys.push(`request:${document?.requestId || filter.requestId}`);
    }
    notify(keys);
  };
  schema.post("save", function (document) { signal(document); });
  for (const operation of ["updateOne", "updateMany", "findOneAndUpdate"]) {
    schema.post(operation, function (result) {
      const update = this.getUpdate();
      // A session activity heartbeat must not wake every approval monitor.
      if (!requests && !update?.$set?.status && !update?.status) return;
      if (requests && (update?.$set?.status || update?.status) === "approving") return;
      signal(result?.employee ? result : null, this.getFilter());
    });
  }
}

module.exports = { createLoginWaiter, loginNotificationPlugin, notify, subscribe };
