// Shared controller error responder. Normalizes Mongoose CastErrors (bad
// ObjectId, bad type, etc.) into a 400, and everything else into a generic
// 500 — never echoing the raw driver/Mongoose error text back to the client,
// since that can leak internal details (field names, connection info,
// stack-shaped messages). The real error is still logged server-side.
const sendErrorResponse = (res, error, fallbackMessage = "Something went wrong. Please try again.") => {
  console.error(error);

  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format.",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

module.exports = sendErrorResponse;
