const jwt = require("jsonwebtoken");

const generateToken = (employeeId, tokenVersion = 0) => {
  return jwt.sign(
    {
      employeeId,
      tokenVersion,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

module.exports = generateToken;
