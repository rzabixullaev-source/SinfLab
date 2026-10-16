export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(error, _request, response, _next) {
  if (error?.name === "ZodError") {
    return response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.issues },
    });
  }
  if (error?.type === "entity.parse.failed") {
    return response.status(400).json({
      error: { code: "BAD_JSON", message: "Request body is not valid JSON" },
    });
  }
  if (error?.type === "entity.too.large") {
    return response.status(413).json({
      error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" },
    });
  }
  if (error instanceof HttpError) {
    return response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
  }
  if (error?.code === 11000) {
    return response.status(409).json({
      error: { code: "DUPLICATE", message: "This value is already in use" },
    });
  }
  console.error(error);
  return response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}
