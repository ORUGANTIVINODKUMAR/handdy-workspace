const test = require("node:test");
const assert = require("node:assert/strict");

const AuthSession = require("../src/models/AuthSession");
const DeviceLoginRequest = require("../src/models/DeviceLoginRequest");
const { beginLoginSession, decideLoginRequest, findRequestForRequester } = require("../src/services/authSessionService");

const equals = (left, right) => String(left) === String(right);
const matches = (document, filter) => Object.entries(filter).every(([key, expected]) => {
  const actual = document[key];
  if (expected && typeof expected === "object" && !(expected instanceof Date)) {
    if (expected.$ne !== undefined && equals(actual, expected.$ne)) return false;
    if (expected.$in && !expected.$in.includes(actual)) return false;
    if (expected.$gt && !(actual > expected.$gt)) return false;
    if (expected.$lte && !(actual <= expected.$lte)) return false;
    return true;
  }
  return equals(actual, expected);
});

const applyUpdate = (document, update) => Object.assign(document, update.$set || {});

test("PC1 can deny PC2 or transfer the only active session without touching timer state", async () => {
  const sessions = [];
  const requests = [];
  const originals = {
    session: {
      updateMany: AuthSession.updateMany,
      updateOne: AuthSession.updateOne,
      findOne: AuthSession.findOne,
      findOneAndUpdate: AuthSession.findOneAndUpdate,
      create: AuthSession.create,
    },
    request: {
      create: DeviceLoginRequest.create,
      findOne: DeviceLoginRequest.findOne,
      updateMany: DeviceLoginRequest.updateMany,
    },
  };

  AuthSession.create = async (data) => {
    const document = { _id: `session-${sessions.length + 1}`, ...data };
    sessions.push(document);
    return document;
  };
  AuthSession.findOne = async (filter) => sessions.find((item) => matches(item, filter)) || null;
  AuthSession.updateOne = async (filter, update) => {
    const item = sessions.find((entry) => matches(entry, filter));
    if (item) applyUpdate(item, update);
    return { modifiedCount: item ? 1 : 0 };
  };
  AuthSession.updateMany = async (filter, update) => {
    const found = sessions.filter((item) => matches(item, filter));
    found.forEach((item) => applyUpdate(item, update));
    return { modifiedCount: found.length };
  };
  AuthSession.findOneAndUpdate = async (filter, update) => {
    const item = sessions.find((entry) => matches(entry, filter));
    if (item) applyUpdate(item, update);
    return item || null;
  };
  DeviceLoginRequest.create = async (data) => {
    const document = { _id: `request-${requests.length + 1}`, status: "pending", createdAt: new Date(), ...data };
    document.save = async () => document;
    requests.push(document);
    return document;
  };
  DeviceLoginRequest.findOne = (filter) => {
    const document = requests.find((item) => matches(item, filter)) || null;
    return {
      select: async () => document,
      then: (resolve, reject) => Promise.resolve(document).then(resolve, reject),
    };
  };
  DeviceLoginRequest.updateMany = async (filter, update) => {
    const found = requests.filter((item) => matches(item, filter));
    found.forEach((item) => applyUpdate(item, update));
    return { modifiedCount: found.length };
  };

  try {
    const pc1 = await beginLoginSession("employee-1", { deviceId: "pc-1", deviceName: "PC 1", clientType: "desktop" });
    assert.equal(pc1.kind, "active");

    const browser = await beginLoginSession("employee-1", { deviceId: "browser-1", deviceName: "Web browser", clientType: "web" });
    assert.equal(browser.kind, "active");
    assert.equal(requests.length, 0);
    assert.equal(sessions.filter((item) => item.status === "active" && item.clientType === "desktop").length, 1);
    assert.equal(sessions.filter((item) => item.status === "active" && item.clientType === "web").length, 1);

    const browserAgain = await beginLoginSession("employee-1", { deviceId: "browser-1", deviceName: "Web browser", clientType: "web" });
    assert.equal(browserAgain.kind, "active");
    assert.equal(requests.length, 0);
    assert.equal(sessions.filter((item) => item.status === "active" && item.clientType === "desktop").length, 1);
    assert.equal(sessions.filter((item) => item.status === "active" && item.clientType === "web").length, 1);

    const firstPc2Attempt = await beginLoginSession("employee-1", { deviceId: "pc-2", deviceName: "PC 2", clientType: "desktop" });
    assert.equal(firstPc2Attempt.kind, "pending");
    await decideLoginRequest({ requestId: firstPc2Attempt.request.requestId, currentSession: pc1.session, decision: "deny" });
    assert.equal(pc1.session.status, "active");
    assert.equal(firstPc2Attempt.request.status, "denied");

    const secondPc2Attempt = await beginLoginSession("employee-1", { deviceId: "pc-2", deviceName: "PC 2", clientType: "desktop" });
    await decideLoginRequest({ requestId: secondPc2Attempt.request.requestId, currentSession: pc1.session, decision: "allow" });
    assert.equal(pc1.session.status, "revoked");
    assert.equal(secondPc2Attempt.request.status, "approved");
    assert.equal(sessions.find((item) => item._id === secondPc2Attempt.request.requestedSession).status, "active");
    assert.equal(sessions.filter((item) => item.status === "active" && item.clientType === "desktop").length, 1);
    assert.equal(sessions.filter((item) => item.status === "active" && item.clientType === "web").length, 1);

    const interruptedTransfer = await beginLoginSession("employee-1", { deviceId: "pc-3", deviceName: "PC 3", clientType: "desktop" });
    interruptedTransfer.request.status = "approving";
    sessions.find((item) => item.status === "active" && item.clientType === "desktop").status = "revoked";
    const recovered = await findRequestForRequester(interruptedTransfer.request.requestId, interruptedTransfer.requestToken);
    assert.equal(recovered.status, "approved");
    assert.equal(sessions.find((item) => item._id === interruptedTransfer.request.requestedSession).status, "active");
    assert.equal(sessions.filter((item) => item.status === "active" && item.clientType === "desktop").length, 1);
    assert.equal(sessions.filter((item) => item.status === "active" && item.clientType === "web").length, 1);
  } finally {
    Object.assign(AuthSession, originals.session);
    Object.assign(DeviceLoginRequest, originals.request);
  }
});
