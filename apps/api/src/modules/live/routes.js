import { Router } from "express";
import { ObjectId } from "mongodb";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { liveSessionSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";
import { parentObserverAccess } from "./parent-access.js";

function publicSession(item) {
  return {
    id: String(item._id), classroomId: String(item.classroomId),
    hostId: String(item.createdBy),
    lessonId: item.lessonId ? String(item.lessonId) : null,
    title: item.title ?? null, provider: item.provider,
    joinUrl: item.status === "live" ? item.joinUrl ?? null : null,
    status: item.status, startedAt: item.startedAt, endedAt: item.endedAt,
  };
}

const zoomRoomSchema = z.object({
  title: z.string().trim().min(3).max(120),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
}).strict();
const handDecisionSchema = z.object({
  studentId: z.string().regex(/^[a-f0-9]{24}$/),
  decision: z.enum(["approve", "deny", "revoke"]),
}).strict();

function requireInteractiveSession(item, allowPreparing = false) {
  if (!["zoom_video_sdk", "browser_webrtc"].includes(item.provider)) {
    throw new HttpError(400, "NOT_INTERACTIVE_ROOM", "This is not an interactive classroom session");
  }
  if (item.status !== "live" && !(allowPreparing && item.status === "preparing")) {
    throw new HttpError(409, "SESSION_ENDED", "Live session has ended");
  }
}

function publicHand(item, name) {
  if (!item) return null;
  return {
    studentId: String(item.studentId), displayName: name ?? null,
    status: item.status, raisedAt: item.raisedAt, decidedAt: item.decidedAt ?? null,
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

  router.get("/live-alerts", async (request, response) => {
    const memberships = await db.collection("classroom_members").find({
      userId: request.user._id, status: "active", role: "student",
    }).toArray();
    if (!memberships.length) return response.json({ alerts: [] });
    const classroomIds = memberships.map((item) => item.classroomId);
    const [sessions, classrooms] = await Promise.all([
      db.collection("live_sessions").find({
        classroomId: { $in: classroomIds }, provider: { $in: ["zoom_video_sdk", "browser_webrtc"] }, status: "live",
      }).toArray(),
      db.collection("classrooms").find({ _id: { $in: classroomIds }, status: "active" }).toArray(),
    ]);
    const names = new Map(classrooms.map((item) => [String(item._id), item.name]));
    response.json({ alerts: sessions.map((item) => ({
      session: publicSession(item), classroomName: names.get(String(item.classroomId)) ?? "O‘quv xonasi",
    })) });
  });

  async function createInteractive(request, response, provider) {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const input = zoomRoomSchema.parse(request.body);
    const lessonId = input.lessonId ? parseObjectId(input.lessonId) : null;
    if (lessonId && !await db.collection("lessons").findOne({ _id: lessonId, classroomId })) {
      throw new HttpError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    const item = {
      _id: new ObjectId(), classroomId, lessonId, title: input.title,
      provider, sessionName: "sinflab-" + randomBytes(18).toString("hex"),
      joinUrl: null, createdBy: request.user._id, status: "preparing",
      startedAt: null, endedAt: null, createdAt: new Date(),
    };
    await db.collection("live_sessions").insertOne(item);
    response.status(201).json({ session: publicSession(item) });
  }

  router.post("/:classroomId/live-sessions/browser", (request, response) => {
    return createInteractive(request, response, "browser_webrtc");
  });

  router.post("/:classroomId/live-sessions/zoom", (request, response) => {
    return createInteractive(request, response, "zoom_video_sdk");
  });

  router.post("/:classroomId/live-sessions/:sessionId/activate", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    requireInteractiveSession(item, true);
    if (!item.createdBy.equals(request.user._id)) throw new HttpError(403, "FORBIDDEN", "Only the room creator can start it");
    if (item.status === "live") return response.json({ session: publicSession(item) });
    const startedAt = new Date();
    await db.collection("live_sessions").updateOne(
      { _id: item._id, status: "preparing" }, { $set: { status: "live", startedAt } },
    );
    response.json({ session: publicSession({ ...item, status: "live", startedAt }) });
  });

  router.post("/:classroomId/live-sessions/:sessionId/zoom-token", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    if (item.provider !== "zoom_video_sdk") throw new HttpError(400, "NOT_ZOOM_ROOM", "This is not a Zoom session");
    requireInteractiveSession(item, membership.role !== "student" && item.createdBy.equals(request.user._id));
    if (!config.ZOOM_VIDEO_SDK_KEY || !config.ZOOM_VIDEO_SDK_SECRET) {
      throw new HttpError(503, "ZOOM_NOT_CONFIGURED", "Zoom Video SDK credentials are not configured");
    }
    const host = membership.role !== "student" && item.createdBy.equals(request.user._id);
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign({
      app_key: config.ZOOM_VIDEO_SDK_KEY,
      role_type: host ? 1 : 0,
      tpc: item.sessionName, version: 1,
      user_key: String(request.user._id),
      video_webrtc_mode: 1, audio_webrtc_mode: 1,
      iat: now, exp: now + 60 * 60 * 2,
    }, config.ZOOM_VIDEO_SDK_SECRET, { algorithm: "HS256" });
    response.json({ sessionName: item.sessionName, token, userName: request.user.displayName, host });
  });

  router.get("/:classroomId/live-sessions/:sessionId/hand", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    requireInteractiveSession(item);
    if (membership.role === "student") {
      const hand = await db.collection("live_hands").findOne({ sessionId: item._id, studentId: request.user._id });
      return response.json({ hand: publicHand(hand, request.user.displayName) });
    }
    const hands = await db.collection("live_hands").find({ sessionId: item._id }).toArray();
    const users = await db.collection("users").find({
      _id: { $in: hands.map((hand) => hand.studentId) },
    }).toArray();
    const names = new Map(users.map((user) => [String(user._id), user.displayName]));
    response.json({ hands: hands.map((hand) => publicHand(hand, names.get(String(hand.studentId)))) });
  });

  router.post("/:classroomId/live-sessions/:sessionId/hand/raise", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    requireInteractiveSession(item);
    const collection = db.collection("live_hands");
    const current = await collection.findOne({ sessionId: item._id, studentId: request.user._id });
    if (current?.status === "raised" || current?.status === "approved") {
      return response.json({ hand: publicHand(current, request.user.displayName) });
    }
    const now = new Date();
    const hand = current
      ? { ...current, status: "raised", raisedAt: now, decidedAt: null }
      : { _id: new ObjectId(), sessionId: item._id, classroomId, studentId: request.user._id,
        status: "raised", raisedAt: now, decidedAt: null };
    if (current) await collection.updateOne({ _id: current._id }, { $set: { status: "raised", raisedAt: now, decidedAt: null } });
    else await collection.insertOne(hand);
    response.status(current ? 200 : 201).json({ hand: publicHand(hand, request.user.displayName) });
  });

  router.post("/:classroomId/live-sessions/:sessionId/hand/lower", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    requireInteractiveSession(item);
    const hand = await db.collection("live_hands").findOne({ sessionId: item._id, studentId: request.user._id });
    if (!hand || !["raised", "approved"].includes(hand.status)) {
      throw new HttpError(409, "HAND_NOT_ACTIVE", "No active hand request");
    }
    const decidedAt = new Date();
    await db.collection("live_hands").updateOne({ _id: hand._id }, { $set: { status: "lowered", decidedAt } });
    response.json({ hand: publicHand({ ...hand, status: "lowered", decidedAt }, request.user.displayName) });
  });

  router.post("/:classroomId/live-sessions/:sessionId/hand/decision", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const item = await sessionFor(db, classroomId, request.params.sessionId);
    requireInteractiveSession(item);
    const input = handDecisionSchema.parse(request.body);
    if (!item.createdBy.equals(request.user._id)) {
      throw new HttpError(403, "FORBIDDEN", "Only the room host can decide hand requests");
    }
    const studentId = parseObjectId(input.studentId);
    const hand = await db.collection("live_hands").findOne({ sessionId: item._id, studentId });
    const required = input.decision === "revoke" ? "approved" : "raised";
    if (!hand || hand.status !== required) throw new HttpError(409, "HAND_NOT_ACTIVE", "Hand request state has changed");
    const status = { approve: "approved", deny: "denied", revoke: "revoked" }[input.decision];
    const decidedAt = new Date();
    const updated = await db.collection("live_hands").updateOne(
      { _id: hand._id, status: required }, { $set: { status, decidedAt } },
    );
    if (!updated.matchedCount) throw new HttpError(409, "HAND_NOT_ACTIVE", "Hand request state has changed");
    const user = await db.collection("users").findOne({ _id: studentId });
    response.json({ hand: publicHand({ ...hand, status, decidedAt }, user?.displayName) });
  });

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
    if (!["live", "preparing"].includes(item.status)) throw new HttpError(409, "SESSION_ENDED", "Live session has ended");
    const endedAt = new Date();
    const updated = await db.collection("live_sessions").updateOne({ _id: item._id, status: item.status }, {
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

export function parentLiveRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.get("/live-alerts", async (request, response) => {
    const links = await db.collection("parent_links").find({ parentId: request.user._id }).toArray();
    const memberships = await db.collection("classroom_members").find({ userId: { $in: links.map((link) => link.studentId) }, role: "student", status: "active" }).toArray();
    const classroomIds = [...new Map(memberships.map((item) => [String(item.classroomId), item.classroomId])).values()];
    if (!classroomIds.length) return response.json({ alerts: [] });
    const [sessions, classrooms] = await Promise.all([
      db.collection("live_sessions").find({ classroomId: { $in: classroomIds }, provider: { $in: ["zoom_video_sdk", "browser_webrtc"] }, status: "live" }).toArray(),
      db.collection("classrooms").find({ _id: { $in: classroomIds }, status: "active" }).toArray(),
    ]);
    const names = new Map(classrooms.map((room) => [String(room._id), room.name]));
    response.json({ alerts: sessions.filter((item) => names.has(String(item.classroomId))).map((item) => ({ session: publicSession(item), classroomName: names.get(String(item.classroomId)) })) });
  });

  router.post("/live-sessions/:sessionId/zoom-token", async (request, response) => {
    const item = await db.collection("live_sessions").findOne({ _id: parseObjectId(request.params.sessionId), provider: "zoom_video_sdk", status: "live" });
    if (!item) throw new HttpError(404, "SESSION_NOT_FOUND", "Live session not found");
    await parentObserverAccess(db, request.user._id, item.classroomId);
    if (!config.ZOOM_VIDEO_SDK_KEY || !config.ZOOM_VIDEO_SDK_SECRET) throw new HttpError(503, "ZOOM_NOT_CONFIGURED", "Zoom Video SDK credentials are not configured");
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign({ app_key: config.ZOOM_VIDEO_SDK_KEY, role_type: 0, tpc: item.sessionName, version: 1, user_key: String(request.user._id), video_webrtc_mode: 1, audio_webrtc_mode: 1, iat: now, exp: now + 60 * 60 * 2 }, config.ZOOM_VIDEO_SDK_SECRET, { algorithm: "HS256" });
    response.json({ sessionName: item.sessionName, token, userName: request.user.displayName, host: false, observer: true });
  });
  return router;
}
