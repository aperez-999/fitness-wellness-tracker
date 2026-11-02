export function errorHandler(err, _req, res, _next) {
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;

  // Client errors (such as malformed JSON) keep their message and are not logged:
  // body-parser attaches the raw request body, which can contain a password.
  if (status < 500) {
    return res.status(status).json({ message: err.message || "Request failed" });
  }

  console.error(err);
  res.status(status).json({ message: "Internal server error" });
}
