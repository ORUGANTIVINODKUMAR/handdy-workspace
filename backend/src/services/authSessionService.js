const crypto = require("crypto");
const AuthSession = require("../models/AuthSession");
const DeviceLoginRequest = require("../models/DeviceLoginRequest");

const SESSION_LIFETIME_MS = Math.max(60_000, Number(process.env.AUTH_SESSION_LIFETIME_MS) || 7 * 24 * 60 * 60 * 1000);
const LOGIN_REQUEST_LIFETIME_MS = Math.max(30_000, Number(process.env.LOGIN_REQUEST_LIFETIME_MS) || 2 * 60 * 1000);
const OFFLINE_GRACE_MS = Math.max(60_000, Number(process.env.AUTH_SESSION_OFFLINE_GRACE_MS) || 5 * 60 * 1000);
const LOGIN_REQUEST_RETENTION_MS = 24 * 60 * 60 * 1000;

const newId = () => crypto.randomUUID();
const newSecret = () => crypto.randomBytes(32).toString("base64url");
const hashSecret = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const normalizeDevice = (body = {}, req = {}) => {
  const fallback = hashSecret(`${req.ip || "unknown"}:${req.get?.("user-agent") || "unknown"}`).slice(0, 32);
  const deviceId = String(body.deviceId || fallback).trim().slice(0, 160);
  const deviceName = String(body.deviceName || (body.clientType === "web" ? "Web browser" : "CRM desktop app")).trim().slice(0, 160);
  return {
    deviceId,
    deviceName: deviceName || "Unknown device",
    clientType: body.clientType === "web" ? "web" : "desktop",
  };
};

const sessionExpiry = () => new Date(Date.now() + SESSION_LIFETIME_MS);

async function expireStaleSessions(employeeId) {
  const now = new Date();
  await AuthSession.updateMany(
    { employee: employeeId, status: "active", expiresAt: { $lte: now } },
    { $set: { status: "expired", revokedAt: now, revokeReason: "expired" } },
  );
  await AuthSession.updateMany(
    { employee: employeeId, status: "active", lastActivity: { $lte: new Date(now.getTime() - OFFLINE_GRACE_MS) } },
    { $set: { status: "expired", revokedAt: now, revokeReason: "device_offline" } },
  );
}

async function createSession(employeeId, device, status = "active") {
  const now = new Date();
  return AuthSession.create({
    employee: employeeId,
    sessionId: newId(),
    ...device,
    status,
    loginAt: status === "active" ? now : null,
    lastActivity: now,
    expiresAt: sessionExpiry(),
  });
}

async function replaceSameDeviceSession(activeSession, employeeId, device) {
  const now = new Date();
  const revoked = await AuthSession.findOneAndUpdate(
    { _id: activeSession._id, status: "active", deviceId: device.deviceId },
    { $set: { status: "revoked", revokedAt: now, revokeReason: "same_device_reauthentication" } },
  );
  if (!revoked) return null;
  try {
    return await createSession(employeeId, device, "active");
  } catch (error) {
    await AuthSession.updateOne(
      { _id: activeSession._id, status: "revoked", revokeReason: "same_device_reauthentication" },
      { $set: { status: "active", revokedAt: null, revokeReason: "" } },
    );
    throw error;
  }
}

async function createPendingRequest(employeeId, activeSession, device) {
  const pendingSession = await createSession(employeeId, device, "pending");
  const requestToken = newSecret();
  const now = Date.now();
  const request = await DeviceLoginRequest.create({
    requestId: newId(),
    requestTokenHash: hashSecret(requestToken),
    employee: employeeId,
    existingSession: activeSession._id,
    requestedSession: pendingSession._id,
    ...device,
    expiresAt: new Date(now + LOGIN_REQUEST_LIFETIME_MS),
    cleanupAt: new Date(now + LOGIN_REQUEST_LIFETIME_MS + LOGIN_REQUEST_RETENTION_MS),
  });
  return { request, requestToken, activeSession };
}

async function beginLoginSession(employeeId, device) {
  await expireStaleSessions(employeeId);

  // Browser sessions do not participate in desktop device approval. Refreshing
  // or reauthenticating the same browser replaces only that browser's session,
  // while other browsers and the single active desktop session remain valid.
  if (device.clientType === "web") {
    const now = new Date();
    await AuthSession.updateMany(
      {
        employee: employeeId,
        deviceId: device.deviceId,
        clientType: "web",
        status: "active",
      },
      {
        $set: {
          status: "revoked",
          revokedAt: now,
          revokeReason: "same_device_reauthentication",
        },
      },
    );
    return { kind: "active", session: await createSession(employeeId, device, "active") };
  }

  let activeSession = await AuthSession.findOne({
    employee: employeeId,
    clientType: "desktop",
    status: "active",
  });
  if (!activeSession) {
    try {
      return { kind: "active", session: await createSession(employeeId, device, "active") };
    } catch (error) {
      if (error.code !== 11000) throw error;
      activeSession = await AuthSession.findOne({
        employee: employeeId,
        clientType: "desktop",
        status: "active",
      });
    }
  }
  if (activeSession.deviceId === device.deviceId) {
    const session = await replaceSameDeviceSession(activeSession, employeeId, device);
    if (session) return { kind: "active", session };
    return beginLoginSession(employeeId, device);
  }
  return { kind: "pending", ...(await createPendingRequest(employeeId, activeSession, device)) };
}

async function expireLoginRequest(request) {
  if (!request || request.status !== "pending" || request.expiresAt > new Date()) return request;
  request.status = "expired";
  request.resolvedAt = new Date();
  await request.save();
  await AuthSession.updateOne({ _id: request.requestedSession, status: "pending" }, { $set: { status: "expired", revokedAt: new Date(), revokeReason: "request_expired" } });
  return request;
}

async function reconcileApprovingRequest(request) {
  if (!request || request.status !== "approving") return request;
  const now = new Date();
  let activated = await AuthSession.findOne({ _id: request.requestedSession, status: "active" });
  if (!activated) {
    await AuthSession.updateMany(
      {
        employee: request.employee,
        _id: { $ne: request.requestedSession },
        clientType: "desktop",
        status: "active",
      },
      { $set: { status: "revoked", revokedAt: now, revokeReason: "new_device_authorized" } },
    );
    activated = await AuthSession.findOneAndUpdate(
      { _id: request.requestedSession, status: "pending" },
      { $set: { status: "active", loginAt: now, lastActivity: now } },
      { returnDocument: "after" },
    ) || await AuthSession.findOne({ _id: request.requestedSession, status: "active" });
  }
  if (!activated) return request;
  request.status = "approved";
  request.resolvedAt = now;
  await request.save();
  await DeviceLoginRequest.updateMany(
    { _id: { $ne: request._id }, employee: request.employee, status: "pending" },
    { $set: { status: "superseded", resolvedAt: now } },
  );
  await AuthSession.updateMany(
    { _id: { $ne: activated._id }, employee: request.employee, status: "pending" },
    { $set: { status: "denied", revokedAt: now, revokeReason: "another_request_approved" } },
  );
  return request;
}

async function findRequestForRequester(requestId, requestToken) {
  if (!requestId || !requestToken) return null;
  const request = await DeviceLoginRequest.findOne({ requestId, requestTokenHash: hashSecret(requestToken) }).select("+requestTokenHash");
  const reconciled = await reconcileApprovingRequest(request);
  return expireLoginRequest(reconciled);
}

async function findPendingForSession(sessionDocument) {
  const request = await DeviceLoginRequest.findOne({
    existingSession: sessionDocument._id,
    employee: sessionDocument.employee,
    status: "pending",
    expiresAt: { $gt: new Date() },
  }).sort("createdAt");
  return request;
}

async function decideLoginRequest({ requestId, currentSession, decision }) {
  const now = new Date();
  const request = await DeviceLoginRequest.findOne({
    requestId,
    existingSession: currentSession._id,
    employee: currentSession.employee,
    status: "pending",
    expiresAt: { $gt: now },
  });
  if (!request) return null;

  if (decision === "deny") {
    request.status = "denied";
    request.resolvedAt = now;
    await request.save();
    await AuthSession.updateOne({ _id: request.requestedSession, status: "pending" }, { $set: { status: "denied", revokedAt: now, revokeReason: "login_denied" } });
    return request;
  }

  request.status = "approving";
  await request.save();
  const revoked = await AuthSession.findOneAndUpdate(
    { _id: currentSession._id, status: "active" },
    { $set: { status: "revoked", revokedAt: now, revokeReason: "new_device_authorized" } },
  );
  if (!revoked) {
    request.status = "superseded";
    request.resolvedAt = now;
    await request.save();
    return request;
  }

  try {
    const activated = await AuthSession.findOneAndUpdate(
      { _id: request.requestedSession, status: "pending" },
      { $set: { status: "active", loginAt: now, lastActivity: now } },
      { returnDocument: "after" },
    );
    if (!activated) throw new Error("The requested device session is no longer available.");
    request.status = "approved";
    request.resolvedAt = now;
    await request.save();
    await DeviceLoginRequest.updateMany(
      { _id: { $ne: request._id }, employee: currentSession.employee, status: "pending" },
      { $set: { status: "superseded", resolvedAt: now } },
    );
    await AuthSession.updateMany(
      { _id: { $ne: activated._id }, employee: currentSession.employee, status: "pending" },
      { $set: { status: "denied", revokedAt: now, revokeReason: "another_request_approved" } },
    );
    return request;
  } catch (error) {
    await AuthSession.updateOne(
      { _id: currentSession._id, status: "revoked", revokeReason: "new_device_authorized" },
      { $set: { status: "active", revokedAt: null, revokeReason: "" } },
    );
    request.status = "denied";
    request.resolvedAt = new Date();
    await request.save();
    throw error;
  }
}

async function revokeEmployeeSessions(employeeId, reason = "account_security_change", options = {}) {
  const { excludeSessionId } = options;
  const now = new Date();
  const sessionFilter = { employee: employeeId, status: { $in: ["active", "pending"] } };
  if (excludeSessionId) sessionFilter._id = { $ne: excludeSessionId };
  await AuthSession.updateMany(
    sessionFilter,
    { $set: { status: "revoked", revokedAt: now, revokeReason: reason } },
  );
  await DeviceLoginRequest.updateMany(
    { employee: employeeId, status: { $in: ["pending", "approving"] } },
    { $set: { status: "cancelled", resolvedAt: now } },
  );
}

async function ensureAuthSessionIndexes() {
  let indexes;
  try {
    indexes = await AuthSession.collection.indexes();
  } catch (error) {
    // A fresh database has no session collection until indexes are created.
    if (error.code !== 26) throw error;
    indexes = [];
  }
  const legacyIndex = indexes.find((index) => index.name === "employee_1_status_1" && index.unique);
  if (legacyIndex) await AuthSession.collection.dropIndex(legacyIndex.name);
  await AuthSession.createIndexes();
}

module.exports = {
  LOGIN_REQUEST_LIFETIME_MS,
  OFFLINE_GRACE_MS,
  normalizeDevice,
  beginLoginSession,
  findRequestForRequester,
  findPendingForSession,
  decideLoginRequest,
  revokeEmployeeSessions,
  ensureAuthSessionIndexes,
  hashSecret,
};
