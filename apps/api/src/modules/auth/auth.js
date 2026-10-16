import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { HttpError } from "../../shared/errors.js";

function bearerToken(header) {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

export function issueToken(userId, secret) {
  return jwt.sign({ sub: userId.toString() }, secret, {
    algorithm: "HS256",
    expiresIn: "7d",
    issuer: "sinflab-api",
    audience: "sinflab-web",
  });
}

export function requireAuth({ db, config }) {
  return async (request, _response, next) => {
    try {
      const token = bearerToken(request.headers.authorization);
      if (!token) throw new HttpError(401, "UNAUTHORIZED", "Sign in required");
      let payload;
      try {
        payload = jwt.verify(token, config.JWT_SECRET, {
          algorithms: ["HS256"],
          issuer: "sinflab-api",
          audience: "sinflab-web",
        });
      } catch {
        throw new HttpError(401, "INVALID_TOKEN", "Session is invalid or expired");
      }
      if (!/^[a-f0-9]{24}$/.test(payload.sub)) {
        throw new HttpError(401, "INVALID_TOKEN", "Session is invalid");
      }
      const user = await db.collection("users").findOne({ _id: new ObjectId(payload.sub) });
      if (!user) throw new HttpError(401, "INVALID_TOKEN", "User no longer exists");
      request.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function publicUser(user) {
  return {
    id: user._id.toString(),
    displayName: user.displayName,
    email: user.emailLower,
    createdAt: user.createdAt,
  };
}
