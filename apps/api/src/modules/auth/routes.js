import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { loginSchema, registerSchema } from "@sinflab/contracts";
import { HttpError } from "../../shared/errors.js";
import { issueToken, publicUser, requireAuth } from "./auth.js";

export function authRouter({ db, config }) {
  const router = Router();
  const clientKey = (request) => {
    const railwayIp = config.TRUST_PROXY_HOPS > 0 ? request.get("x-real-ip") : null;
    const address = railwayIp && isIP(railwayIp) ? railwayIp : request.ip || request.socket.remoteAddress;
    return ipKeyGenerator(address || "unknown");
  };
  const limitResponse = (_request, response) => response.status(429).json({
    error: { code: "AUTH_RATE_LIMIT", message: "Too many authentication requests. Try again in 15 minutes." },
  });
  const networkLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    keyGenerator: clientKey,
    handler: limitResponse,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  const accountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    keyGenerator: (request) => createHash("sha256").update(String(request.body?.email || "").trim().toLowerCase()).digest("hex"),
    handler: limitResponse,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  router.post("/register", networkLimiter, async (request, response) => {
    const input = registerSchema.parse(request.body);
    const existing = await db.collection("users").findOne({ emailLower: input.email });
    if (existing) throw new HttpError(409, "EMAIL_TAKEN", "Email is already registered");
    const now = new Date();
    const user = {
      _id: new ObjectId(),
      displayName: input.displayName,
      emailLower: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await db.collection("users").insertOne(user);
    } catch (error) {
      if (error?.code === 11000) throw new HttpError(409, "EMAIL_TAKEN", "Email is already registered");
      throw error;
    }
    response.status(201).json({
      user: publicUser(user),
      token: issueToken(user._id, config.JWT_SECRET),
    });
  });

  router.post("/login", networkLimiter, accountLimiter, async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await db.collection("users").findOne({ emailLower: input.email });
    if (!user || typeof user.passwordHash !== "string" || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }
    response.json({
      user: publicUser(user),
      token: issueToken(user._id, config.JWT_SECRET),
    });
  });

  router.get("/me", requireAuth({ db, config }), (request, response) => {
    response.json({ user: publicUser(request.user) });
  });

  return router;
}
