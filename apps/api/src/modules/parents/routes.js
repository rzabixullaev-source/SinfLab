import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../auth/auth.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";
import { studentReport } from "../activity/student-report.js";
import { studentAdvice } from "../ai/routes.js";
import { aiRateLimit } from "../ai/limit.js";

const codeSchema = z.object({ code: z.string().trim().min(16).max(128) }).strict();
const hashCode = (code) => createHash("sha256").update(code).digest("hex");
const id = (value) => String(value);
const percent = (part, total) => total ? Math.round(part / total * 100) : null;

async function childOverview(db, studentId) {
  const memberships = await db.collection("classroom_members").find({ userId: studentId, role: "student", status: "active" }).toArray();
  const rooms = await db.collection("classrooms").find({ _id: { $in: memberships.map((item) => item.classroomId) }, status: "active" }).toArray();
  const classrooms = await Promise.all(rooms.map(async (room) => {
    const classroomId = room._id;
    const [lessons, assignments, submissions, quizzes, attempts, labs, runs, sessions, attendance, report] = await Promise.all([
      db.collection("lessons").find({ classroomId }).toArray(),
      db.collection("assignments").find({ classroomId, status: "published" }).toArray(),
      db.collection("submissions").find({ classroomId, studentId }).toArray(),
      db.collection("quizzes").find({ classroomId, status: "published" }).toArray(),
      db.collection("quiz_attempts").find({ classroomId, studentId }).toArray(),
      db.collection("lab_activities").find({ classroomId }).toArray(),
      db.collection("lab_runs").find({ classroomId, studentId }).toArray(),
      db.collection("live_sessions").find({ classroomId, status: "ended" }).toArray(),
      db.collection("attendance").find({ classroomId, userId: studentId }).toArray(),
      studentReport(db, classroomId, studentId),
    ]);
    const submissionIds = submissions.map((item) => item._id);
    const [revisions, feedback] = await Promise.all([
      db.collection("submission_revisions").find({ submissionId: { $in: submissionIds } }).toArray(),
      db.collection("feedback").find({ submissionId: { $in: submissionIds } }).toArray(),
    ]);
    const submissionByAssignment = new Map(submissions.map((item) => [id(item.assignmentId), item]));
    const attemptByQuiz = new Map(attempts.map((item) => [id(item.quizId), item]));
    const attendanceIds = new Set(attendance.map((item) => id(item.sessionId)));
    const lessonById = new Map(lessons.map((item) => [id(item._id), item]));
    const latestRun = new Map();
    for (const run of runs) {
      const previous = latestRun.get(id(run.labId));
      if (!previous || run.createdAt > previous.createdAt) latestRun.set(id(run.labId), run);
    }
    const graded = attempts.filter((item) => item.maxScore > 0);
    const answeredRuns = labs.map((item) => latestRun.get(id(item._id))).filter(Boolean);
    const stats = {
      assignmentsCompleted: submissions.filter((item) => item.status === "accepted").length,
      assignmentsTotal: assignments.length,
      quizzesCompleted: attempts.length,
      quizzesTotal: quizzes.length,
      quizAveragePercent: graded.length ? Math.round(graded.reduce((sum, item) => sum + item.score / item.maxScore * 100, 0) / graded.length) : null,
      labsCompleted: answeredRuns.filter((item) => item.correct).length,
      labsTotal: labs.length,
      attendancePercent: percent(sessions.filter((item) => attendanceIds.has(id(item._id))).length, sessions.length),
      sessionsAttended: sessions.filter((item) => attendanceIds.has(id(item._id))).length,
      sessionsTotal: sessions.length,
    };
    return {
      id: id(room._id), name: room.name, subject: room.subject, stats, engagement: report.engagement, report,
      lessons: lessons.map((item) => ({ id: id(item._id), title: item.title, description: item.description, startsAt: item.startsAt, endsAt: item.endsAt })),
      assignments: assignments.map((item) => {
        const submission = submissionByAssignment.get(id(item._id));
        return { id: id(item._id), title: item.title, instructions: item.instructions, dueAt: item.dueAt,
          status: submission?.status ?? "not_started", submittedAt: submission?.submittedAt ?? null,
          revisions: submission ? revisions.filter((entry) => id(entry.submissionId) === id(submission._id)).map((entry) => ({ version: entry.version, body: entry.body, submittedAt: entry.submittedAt })) : [],
          feedback: submission ? feedback.filter((entry) => id(entry.submissionId) === id(submission._id)).map((entry) => ({ version: entry.version, body: entry.body, score: entry.score, needsRevision: entry.needsRevision, createdAt: entry.createdAt })) : [],
        };
      }),
      quizzes: quizzes.map((item) => { const attempt = attemptByQuiz.get(id(item._id)); return { id: id(item._id), title: item.title, score: attempt?.score ?? null, maxScore: attempt?.maxScore ?? null, submittedAt: attempt?.submittedAt ?? null }; }),
      labs: labs.map((item) => { const run = latestRun.get(id(item._id)); return { id: id(item._id), title: item.title, kind: item.kind, attempts: runs.filter((entry) => id(entry.labId) === id(item._id)).length, correct: run?.correct ?? null, score: run?.score ?? null, lastRunAt: run?.createdAt ?? null }; }),
      attendance: sessions.map((item) => ({ sessionId: id(item._id), title: lessonById.get(id(item.lessonId))?.title ?? "Jonli dars", endedAt: item.endedAt, attended: attendanceIds.has(id(item._id)) })),
    };
  }));
  const totals = classrooms.reduce((acc, room) => {
    for (const key of ["assignmentsCompleted", "assignmentsTotal", "quizzesCompleted", "quizzesTotal", "labsCompleted", "labsTotal", "sessionsAttended", "sessionsTotal"]) acc[key] += room.stats[key];
    return acc;
  }, { assignmentsCompleted: 0, assignmentsTotal: 0, quizzesCompleted: 0, quizzesTotal: 0, labsCompleted: 0, labsTotal: 0, sessionsAttended: 0, sessionsTotal: 0 });
  const scored = classrooms.flatMap((room) => room.quizzes).filter((quiz) => quiz.maxScore > 0);
  const activity = classrooms.flatMap((room) => room.report.timeline.map((item) => ({ ...item, classroom: room.name, result: item.detail })))
    .sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30);
  return { classrooms, stats: { ...totals,
    totalSeconds: classrooms.reduce((sum, room) => sum + room.engagement.totalSeconds, 0),
    weekSeconds: classrooms.reduce((sum, room) => sum + room.engagement.weekSeconds, 0),
    todaySeconds: classrooms.reduce((sum, room) => sum + room.engagement.todaySeconds, 0),
    quizAveragePercent: scored.length ? Math.round(scored.reduce((sum, quiz) => sum + quiz.score / quiz.maxScore * 100, 0) / scored.length) : null,
    attendancePercent: percent(totals.sessionsAttended, totals.sessionsTotal),
  }, activity };
}

export function parentsRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/invites", async (request, response) => {
    const code = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await db.collection("parent_invites").insertOne({ _id: new ObjectId(), studentId: request.user._id, codeHash: hashCode(code), expiresAt, usedAt: null, createdAt: new Date() });
    response.status(201).json({ code, expiresAt });
  });

  router.post("/link", async (request, response) => {
    const { code } = codeSchema.parse(request.body);
    const now = new Date();
    const invite = await db.collection("parent_invites").findOne({ codeHash: hashCode(code) });
    if (!invite || invite.usedAt || invite.expiresAt <= now) throw new HttpError(400, "INVALID_INVITE", "Invite code is invalid or expired");
    const student = await db.collection("users").findOne({ _id: invite.studentId });
    if (!student || id(student._id) === id(request.user._id)) throw new HttpError(400, "INVALID_INVITE", "Student account is unavailable");
    const claimed = await db.collection("parent_invites").updateOne({ _id: invite._id, usedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } });
    if (!claimed.matchedCount) throw new HttpError(400, "INVALID_INVITE", "Invite code is invalid or expired");
    const existing = await db.collection("parent_links").findOne({ parentId: request.user._id, studentId: student._id });
    if (!existing) await db.collection("parent_links").insertOne({ _id: new ObjectId(), parentId: request.user._id, studentId: student._id, createdAt: now });
    response.status(201).json({ child: { id: id(student._id), displayName: student.displayName } });
  });

  router.get("/children", async (request, response) => {
    const links = await db.collection("parent_links").find({ parentId: request.user._id }).toArray();
    const users = await db.collection("users").find({ _id: { $in: links.map((item) => item.studentId) } }).toArray();
    response.json({ children: users.map((user) => ({ id: id(user._id), displayName: user.displayName, email: user.emailLower })) });
  });

  router.get("/children/:studentId", async (request, response) => {
    const studentId = parseObjectId(request.params.studentId);
    const link = await db.collection("parent_links").findOne({ parentId: request.user._id, studentId });
    if (!link) throw new HttpError(404, "CHILD_NOT_FOUND", "Child not found");
    const student = await db.collection("users").findOne({ _id: studentId });
    if (!student) throw new HttpError(404, "CHILD_NOT_FOUND", "Child not found");
    response.json({ child: { id: id(student._id), displayName: student.displayName, email: student.emailLower }, ...await childOverview(db, studentId) });
  });

  router.get("/children/:studentId/ai-advice", aiRateLimit, async (request, response) => {
    const studentId = parseObjectId(request.params.studentId);
    const link = await db.collection("parent_links").findOne({ parentId: request.user._id, studentId });
    if (!link) throw new HttpError(404, "CHILD_NOT_FOUND", "Child not found");
    const memberships = await db.collection("classroom_members").find({ userId: studentId, role: "student", status: "active" }).toArray();
    const classroomId = parseObjectId(request.query.classroomId);
    if (!memberships.some((item) => id(item.classroomId) === id(classroomId))) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
    response.json(await studentAdvice(db, config, studentId, classroomId, request.user._id));
  });

  router.delete("/children/:studentId", async (request, response) => {
    const studentId = parseObjectId(request.params.studentId);
    if (id(request.user._id) === id(studentId)) {
      const parentId = parseObjectId(request.body?.parentId);
      await db.collection("parent_links").deleteOne({ parentId, studentId });
    } else await db.collection("parent_links").deleteOne({ parentId: request.user._id, studentId });
    response.status(204).send();
  });

  router.get("/my-parents", async (request, response) => {
    const links = await db.collection("parent_links").find({ studentId: request.user._id }).toArray();
    const parents = await db.collection("users").find({ _id: { $in: links.map((item) => item.parentId) } }).toArray();
    response.json({ parents: parents.map((user) => ({ id: id(user._id), displayName: user.displayName, email: user.emailLower })) });
  });

  return router;
}
