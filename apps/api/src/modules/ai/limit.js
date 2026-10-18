import { rateLimit } from "express-rate-limit";
import { HttpError } from "../../shared/errors.js";

export const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (request) => String(request.user._id),
  handler: (_request, _response, next) => next(new HttpError(429, "AI_RATE_LIMIT", "AI request limit reached; try again later")),
});
