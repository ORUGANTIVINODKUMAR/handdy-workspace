const crypto = require("crypto");

const REMEMBERED_SESSION_DAYS = Math.max(1, Number(process.env.REMEMBERED_SESSION_DAYS) || 30);

const createRememberedSession = () => {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + REMEMBERED_SESSION_DAYS * 24 * 60 * 60 * 1000),
  };
};

const hashRememberedSession = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

const revokeRememberedSession = async (EmployeeModel, employeeId, token) => {
  if (!EmployeeModel || !employeeId || !token || typeof token !== "string") return;
  const tokenHash = hashRememberedSession(token);
  await EmployeeModel.updateOne(
    { _id: employeeId },
    { $pull: { rememberedSessions: { tokenHash } } }
  );
  // Remove the pre-array legacy credential too, while deployments finish
  // migrating older employee records.
  await EmployeeModel.updateOne(
    { _id: employeeId, rememberedSessionTokenHash: tokenHash },
    { $set: { rememberedSessionTokenHash: null, rememberedSessionExpires: null } }
  );
};

module.exports = { createRememberedSession, hashRememberedSession, revokeRememberedSession };
