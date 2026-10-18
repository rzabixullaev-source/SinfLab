import { activitySummary } from "./routes.js";

const id = (value) => String(value);
const percent = (part, total) => total > 0 ? Math.round(part / total * 100) : null;

export async function studentReport(db, classroomId, studentId) {
  const [engagement, assignments, submissions, quizzes, attempts, labs, runs, sessions, attendance, games] = await Promise.all([
    activitySummary(db, classroomId, studentId),
    db.collection("assignments").find({ classroomId, status: "published" }).toArray(),
    db.collection("submissions").find({ classroomId, studentId }).toArray(),
    db.collection("quizzes").find({ classroomId, status: "published" }).toArray(),
    db.collection("quiz_attempts").find({ classroomId, studentId }).toArray(),
    db.collection("lab_activities").find({ classroomId }).toArray(),
    db.collection("lab_runs").find({ classroomId, studentId }).toArray(),
    db.collection("live_sessions").find({ classroomId, status: "ended" }).toArray(),
    db.collection("attendance").find({ classroomId, userId: studentId }).toArray(),
    db.collection("game_attempts").find({ classroomId, studentId }).toArray(),
  ]);
  const assignmentById = new Map(assignments.map((item) => [id(item._id), item]));
  const quizById = new Map(quizzes.map((item) => [id(item._id), item]));
  const labById = new Map(labs.map((item) => [id(item._id), item]));
  const submittedIds = new Set(submissions.map((item) => id(item.assignmentId)));
  const accepted = submissions.filter((item) => assignmentById.has(id(item.assignmentId)) && item.status === "accepted");
  const needsRevision = submissions.filter((item) => assignmentById.has(id(item.assignmentId)) && item.status === "needs_revision");
  const submitted = submissions.filter((item) => assignmentById.has(id(item.assignmentId)) && item.status === "submitted");
  const validAttempts = attempts.filter((item) => quizById.has(id(item.quizId)));
  const graded = validAttempts.filter((item) => item.maxScore > 0);
  const latestRuns = new Map();
  for (const run of runs) {
    if (!labById.has(id(run.labId))) continue;
    const previous = latestRuns.get(id(run.labId));
    if (!previous || run.createdAt > previous.createdAt) latestRuns.set(id(run.labId), run);
  }
  const attendedSessionIds = new Set(attendance.map((item) => id(item.sessionId)));
  const stats = {
    assignmentsTotal: assignments.length,
    assignmentsAccepted: accepted.length,
    assignmentsSubmitted: submitted.length,
    assignmentsNeedRevision: needsRevision.length,
    assignmentsToDo: assignments.filter((item) => !submittedIds.has(id(item._id))).length + needsRevision.length,
    quizzesTotal: quizzes.length,
    quizzesCompleted: validAttempts.length,
    quizAveragePercent: graded.length ? Math.round(graded.reduce((sum, item) => sum + item.score / item.maxScore * 100, 0) / graded.length) : null,
    labsTotal: labs.length,
    labsCompleted: [...latestRuns.values()].filter((item) => item.correct).length,
    sessionsTotal: sessions.length,
    sessionsAttended: sessions.filter((item) => attendedSessionIds.has(id(item._id))).length,
    attendancePercent: percent(sessions.filter((item) => attendedSessionIds.has(id(item._id))).length, sessions.length),
    gameScore: games.reduce((sum, item) => sum + item.score, 0),
  };
  const timeline = [
    ...submissions.filter((item) => assignmentById.has(id(item.assignmentId))).map((item) => ({ kind: "assignment", title: assignmentById.get(id(item.assignmentId)).title, at: item.submittedAt, detail: item.status })),
    ...validAttempts.map((item) => ({ kind: "quiz", title: quizById.get(id(item.quizId)).title, at: item.submittedAt, detail: percent(item.score, item.maxScore) })),
    ...runs.filter((item) => labById.has(id(item.labId))).map((item) => ({ kind: "lab", title: labById.get(id(item.labId)).title, at: item.createdAt, detail: item.correct ?? null })),
    ...games.map((item) => ({ kind: "game", title: "Bilim o‘yini", at: item.createdAt, detail: item.score })),
    ...attendance.filter((item) => sessions.some((session) => id(session._id) === id(item.sessionId))).map((item) => ({ kind: "live", title: "Jonli darsga qatnashdi", at: item.joinedAt, detail: null })),
  ].filter((item) => item.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30);
  return { engagement, stats, timeline };
}
