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

module.exports = { createRememberedSession, hashRememberedSession };
