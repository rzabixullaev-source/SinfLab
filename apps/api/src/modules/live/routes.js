import { Router } from "express";
import { ObjectId } from "mongodb";
import { liveSessionSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

function publicSession(item) {
  return {
    id: String(item._id), classroomId: String(item.classroomId),
    lessonId: String(item.lessonId), provider: item.provider,
    joinUrl: item.status === "live" ? item.joinUrl : null,
    status: item.status, startedAt: item.startedAt, endedAt: item.endedAt,
  };
}

async function sessionFor(db, classroomId, sessionIdText) {
  const item = await db.collection("live_sessions").findOne({
    _id: parseObjectId(sessionIdText), classroomId,
  });
  if (!item) throw new HttpError(404, "SESSION_NOT_FOUND", "Live session not found");
  return item;
}

export function liveRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/:classroomId/live-sessions", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const input = liveSessionSchema.parse(request.body);
    const lessonId = parseObjectId(input.lessonId);
    if (!await db.collection("lessons").findOne({ _id: lessonId, classroomId })) {
      throw new HttpError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    const item = {
      _id: new ObjectId(), classroomId, lessonId,
      provider: input.provider, joinUrl: input.joinUrl,
      createdBy: request.user._id, status: "live",
      startedAt: new Date(), endedAt: null,
    };
    await db.collection("live_sessions").insertOne(item);
    response.status(201).json({ session: publicSession(item) });
  });

  router.get("/:classroomId/live-sessions", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const filter = membership.role === "student" ? { classroomId, status: "live" } : { classroomId };
    const sessions = await db.collection("live_sessions").find(filter).toArray();
    response.json({ sessions: sessions.map(publicSession) });
  });

  router.post("/:classroomId/live-sessions/:sessionId/check-in", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    if (item.status !== "live") throw new HttpError(409, "SESSION_ENDED", "Live session has ended");
    const existing = await db.collection("attendance").findOne({
      sessionId: item._id, userId: request.user._id, leftAt: null,
    });
    if (existing) return response.json({ attendance: { id: String(existing._id), joinedAt: existing.joinedAt } });
    const attendance = {
      _id: new ObjectId(), sessionId: item._id, classroomId,
      userId: request.user._id, joinedAt: new Date(), leftAt: null,
    };
    await db.collection("attendance").insertOne(attendance);
    response.status(201).json({ attendance: { id: String(attendance._id), joinedAt: attendance.joinedAt } });
  });

  router.post("/:classroomId/live-sessions/:sessionId/check-out", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    const attendance = await db.collection("attendance").findOne({
      sessionId: item._id, userId: request.user._id, leftAt: null,
    });
    if (!attendance) throw new HttpError(404, "ATTENDANCE_NOT_FOUND", "No active attendance");
    const leftAt = new Date();
    await db.collection("attendance").updateOne({ _id: attendance._id, leftAt: null }, { $set: { leftAt } });
    response.json({ attendance: { id: String(attendance._id), joinedAt: attendance.joinedAt, leftAt } });
  });

  router.post("/:classroomId/live-sessions/:sessionId/end", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    if (item.status !== "live") throw new HttpError(409, "SESSION_ENDED", "Live session has ended");
    const endedAt = new Date();
    const updated = await db.collection("live_sessions").updateOne({ _id: item._id, status: "live" }, {
      $set: { status: "ended", endedAt },
    });
    if (!updated.matchedCount) throw new HttpError(409, "SESSION_ENDED", "Live session has ended");
    response.json({ session: publicSession({ ...item, status: "ended", endedAt }) });
  });

  router.get("/:classroomId/live-sessions/:sessionId/attendance", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    const rows = await db.collection("attendance").find({ sessionId: item._id }).toArray();
    response.json({ attendance: rows.map((row) => ({
      id: String(row._id), userId: String(row.userId), joinedAt: row.joinedAt, leftAt: row.leftAt,
    })) });
  });

  return router;
}
