const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");
const AuthSession = require("../models/AuthSession");

const protect = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required.",
      });
    }

    const token = authorizationHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const employee = await Employee.findById(decoded.employeeId).select(
      "+tokenVersion +idleTrackingExempt"
    );

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "The user associated with this token no longer exists.",
      });
    }

    if (!employee.isActive) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Your account is inactive.",
      });
    }

    if ((decoded.tokenVersion ?? 0) !== (employee.tokenVersion ?? 0)) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_REVOKED",
        message: "Authentication token has been revoked.",
      });
    }

    if (!decoded.sessionId || !decoded.deviceId) {
      return res.status(401).json({
        success: false,
        code: "SESSION_REQUIRED",
        message: "Please log in again to create a secure device session.",
      });
    }

    const authSession = await AuthSession.findOne({
      employee: employee._id,
      sessionId: decoded.sessionId,
      deviceId: decoded.deviceId,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    if (!authSession) {
      return res.status(401).json({
        success: false,
        code: "SESSION_REVOKED",
        message: "This device session is no longer active.",
      });
    }

    req.user = employee;
    req.authSession = authSession;

    if (!authSession.lastActivity || Date.now() - authSession.lastActivity.getTime() > 60_000) {
      AuthSession.updateOne({ _id: authSession._id, status: "active" }, { $set: { lastActivity: new Date() } })
        .catch((updateError) => console.error("Unable to update session activity:", updateError));
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token is invalid.",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  protect,
};
