import { Router } from "express";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";

const key = (value) => String(value);

export function progressRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.get("/:classroomId/my-progress", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const [lessons, assignments, submissions, quizzes, attempts, labs, runs, sessions, attendance] = await Promise.all([
      db.collection("lessons").find({ classroomId }).toArray(),
      db.collection("assignments").find({ classroomId, status: "published" }).toArray(),
      db.collection("submissions").find({ classroomId, studentId: request.user._id }).toArray(),
      db.collection("quizzes").find({ classroomId, status: "published" }).toArray(),
      db.collection("quiz_attempts").find({ classroomId, studentId: request.user._id }).toArray(),
      db.collection("lab_activities").find({ classroomId }).toArray(),
      db.collection("lab_runs").find({ classroomId, studentId: request.user._id }).toArray(),
      db.collection("live_sessions").find({ classroomId, status: "ended" }).toArray(),
      db.collection("attendance").find({ classroomId, userId: request.user._id }).toArray(),
    ]);
    const submissionMap = new Map(submissions.map((item) => [key(item.assignmentId), item]));
    const attemptMap = new Map(attempts.map((item) => [key(item.quizId), item]));
    const attended = new Set(attendance.map((item) => key(item.sessionId)));
    const lessonMap = new Map(lessons.map((item) => [key(item._id), item]));
    const latestLabRun = new Map();
    for (const run of runs) {
      const current = latestLabRun.get(key(run.labId));
      if (!current || run.createdAt > current.createdAt) latestLabRun.set(key(run.labId), run);
    }
    const now = new Date();
    response.json({ progress: {
      upcomingLessons: lessons.filter((item) => item.startsAt && item.startsAt > now)
        .sort((a, b) => a.startsAt - b.startsAt)
        .map((item) => ({ id: key(item._id), title: item.title, startsAt: item.startsAt })),
      missedLessons: sessions.filter((item) => !attended.has(key(item._id)))
        .map((item) => ({
          lessonId: key(item.lessonId), title: lessonMap.get(key(item.lessonId))?.title ?? "Lesson",
          sessionId: key(item._id), endedAt: item.endedAt,
        })),
      assignmentsToDo: assignments.filter((item) => {
        const submission = submissionMap.get(key(item._id));
        return !submission || submission.status === "needs_revision";
      }).map((item) => ({
        id: key(item._id), title: item.title,
        dueAt: item.dueAt, status: submissionMap.get(key(item._id))?.status ?? "not_started",
      })),
      quizzesToDo: quizzes.filter((item) => !attemptMap.has(key(item._id)))
        .map((item) => ({ id: key(item._id), title: item.title })),
      reviewQueue: [
        ...quizzes.filter((item) => {
          const attempt = attemptMap.get(key(item._id));
          return attempt && attempt.score < attempt.maxScore;
        }).map((item) => ({ kind: "quiz", id: key(item._id), title: item.title })),
        ...labs.filter((item) => latestLabRun.get(key(item._id))?.correct === false)
          .map((item) => ({ kind: "lab", id: key(item._id), title: item.title })),
      ],
    } });
  });

  return router;
}
