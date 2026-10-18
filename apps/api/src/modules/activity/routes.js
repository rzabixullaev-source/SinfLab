import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../auth/auth.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

const heartbeatSchema = z.object({
  area: z.enum(["overview", "lessons", "assignments", "quizzes", "ai", "games", "live", "labs", "progress", "chat", "materials", "members"]),
  seconds: z.number().int().min(1).max(30),
}).strict();

export async function activitySummary(db, classroomId, studentId) {
  const entries = await db.collection("learning_activity").find({ classroomId, studentId }).sort({ createdAt: -1 }).toArray();
  const secondsByArea = {};
  for (const entry of entries) secondsByArea[entry.area] = (secondsByArea[entry.area] ?? 0) + entry.seconds;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (6 - index));
    return { date: day.toISOString().slice(0, 10), seconds: 0 };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const entry of entries) {
    const day = byDate.get(new Date(entry.createdAt).toISOString().slice(0, 10));
    if (day) day.seconds += entry.seconds;
  }
  return {
    totalSeconds: entries.reduce((sum, entry) => sum + entry.seconds, 0),
    todaySeconds: days[6].seconds,
    weekSeconds: days.reduce((sum, day) => sum + day.seconds, 0),
    days,
    secondsByArea,
    lastActiveAt: entries[0]?.createdAt ?? null,
    recent: entries.slice(0, 20).map((entry) => ({ area: entry.area, seconds: entry.seconds, at: entry.createdAt })),
  };
}

export function activityRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.get("/:classroomId/teaching-overview", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    const acting = await db.collection("classroom_members").findOne({ classroomId, userId: request.user._id, status: "active" });
    if (!acting) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
    if (!["owner", "teacher", "assistant"].includes(acting.role)) throw new HttpError(403, "FORBIDDEN", "Staff membership required");
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - 6);
    const [students, entries, submissions] = await Promise.all([
      db.collection("classroom_members").find({ classroomId, role: "student", status: "active" }).toArray(),
      db.collection("learning_activity").find({ classroomId, createdAt: { $gte: since } }).toArray(),
      db.collection("submissions").find({ classroomId, status: "submitted" }).toArray(),
    ]);
    const activeIds = new Set(students.map((item) => String(item.userId)));
    const activeEntries = entries.filter((item) => activeIds.has(String(item.studentId)));
    response.json({ overview: {
      students: students.length,
      activeStudents: new Set(activeEntries.map((item) => String(item.studentId))).size,
      weekSeconds: activeEntries.reduce((sum, item) => sum + item.seconds, 0),
      awaitingFeedback: submissions.filter((item) => activeIds.has(String(item.studentId))).length,
    } });
  });

  router.post("/:classroomId/activity", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    const member = await db.collection("classroom_members").findOne({ classroomId, userId: request.user._id, status: "active" });
    if (!member) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
    if (member.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student membership required");
    const { area, seconds } = heartbeatSchema.parse(request.body);
    const now = new Date();
    const latest = (await db.collection("learning_activity").find({ classroomId, studentId: request.user._id }).sort({ createdAt: -1 }).limit(1).toArray())[0];
    // A repeated heartbeat cannot add more time than has elapsed since the previous one.
    const elapsed = latest ? Math.floor((now - latest.createdAt) / 1000) : seconds;
    const countedSeconds = Math.min(seconds, Math.max(0, elapsed));
    if (countedSeconds > 0) await db.collection("learning_activity").insertOne({
      _id: new ObjectId(), classroomId, studentId: request.user._id, area, seconds: countedSeconds, createdAt: now,
    });
    response.status(201).json({ countedSeconds });
  });

  router.get("/:classroomId/students/:studentId/activity", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    const studentId = parseObjectId(request.params.studentId);
    const acting = await db.collection("classroom_members").findOne({ classroomId, userId: request.user._id, status: "active" });
    if (!acting) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
    if (!["owner", "teacher", "assistant"].includes(acting.role)) throw new HttpError(403, "FORBIDDEN", "Staff membership required");
    const student = await db.collection("classroom_members").findOne({ classroomId, userId: studentId, role: "student", status: "active" });
    if (!student) throw new HttpError(404, "STUDENT_NOT_FOUND", "Student not found");
    response.json({ activity: await activitySummary(db, classroomId, studentId) });
  });

  router.get("/:classroomId/students/:studentId/report", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    const studentId = parseObjectId(request.params.studentId);
    const acting = await db.collection("classroom_members").findOne({ classroomId, userId: request.user._id, status: "active" });
    if (!acting) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
    if (!["owner", "teacher", "assistant"].includes(acting.role)) throw new HttpError(403, "FORBIDDEN", "Staff membership required");
    const student = await db.collection("classroom_members").findOne({ classroomId, userId: studentId, role: "student", status: "active" });
    if (!student) throw new HttpError(404, "STUDENT_NOT_FOUND", "Student not found");
    const { studentReport } = await import("./student-report.js");
    response.json({ report: await studentReport(db, classroomId, studentId) });
  });

  return router;
}
