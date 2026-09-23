// Express also sends parser errors and rejected async route promises here.
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Request failed:", error);
  const status = error.type === "entity.too.large" ? 413
    : error.type === "entity.parse.failed" ? 400 : 500;
  return res.status(status).json({
    success: false,
    message: status === 413 ? "Request body is too large."
      : status === 400 ? "Invalid JSON request body."
        : "Unable to complete the request. Please try again.",
  });
};

module.exports = errorHandler;
