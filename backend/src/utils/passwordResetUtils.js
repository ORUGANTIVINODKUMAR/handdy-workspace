const crypto = require("crypto");

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const hashResetToken = (rawToken) =>
  crypto.createHash("sha256").update(String(rawToken)).digest("hex");

const generatePasswordResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");

  return {
    rawToken,
    tokenHash: hashResetToken(rawToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
};

module.exports = {
  RESET_TOKEN_TTL_MS,
  generatePasswordResetToken,
  hashResetToken,
};
