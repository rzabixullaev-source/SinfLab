import { Router } from "express";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { rateLimit } from "express-rate-limit";
import { loginSchema, registerSchema } from "@sinflab/contracts";
import { HttpError } from "../../shared/errors.js";
import { issueToken, publicUser, requireAuth } from "./auth.js";

export function authRouter({ db, config }) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  router.post("/register", limiter, async (request, response) => {
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
    await db.collection("users").insertOne(user);
    response.status(201).json({
      user: publicUser(user),
      token: issueToken(user._id, config.JWT_SECRET),
    });
  });

  router.post("/login", limiter, async (request, response) => {
    const input = loginSchema.parse(request.body);
    const user = await db.collection("users").findOne({ emailLower: input.email });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
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
