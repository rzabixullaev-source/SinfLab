import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";
import { studentReport } from "../activity/student-report.js";
import { generateGemini } from "./gemini.js";
import { aiRateLimit } from "./limit.js";

const guideSchema = z.object({ guide: z.string().trim().min(20).max(3000) }).strict();
const questionSchema = z.object({ question: z.string().trim().min(3).max(2000) }).strict();

export async function studentAdvice(db, config, studentId, classroomId) {
  const report = await studentReport(db, classroomId, studentId);
  const evidence = {
    activeSeconds: report.engagement.totalSeconds,
    activeThisWeekSeconds: report.engagement.weekSeconds,
    secondsByArea: report.engagement.secondsByArea,
    ...report.stats,
  };
  const advice = await generateGemini(config,
    "You are an educational coach. Reply in Uzbek. Analyze only the supplied learning evidence. Do not claim to measure a child's intelligence, attention, or true effectiveness from screen time. Explain uncertainties. Give three concrete, supportive next steps. Never reveal raw personal data.",
    JSON.stringify(evidence));
  return { advice, evidence };
}

export function aiRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.get("/:classroomId/teaching-guide", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const guide = await db.collection("teaching_guides").findOne({ classroomId });
    response.json({ guide: guide?.guide ?? "" });
  });

  router.put("/:classroomId/teaching-guide", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (!["owner", "teacher"].includes(membership.role)) throw new HttpError(403, "FORBIDDEN", "Teacher access required");
    const { guide } = guideSchema.parse(request.body);
    const current = await db.collection("teaching_guides").findOne({ classroomId });
    if (current) await db.collection("teaching_guides").updateOne({ _id: current._id }, { $set: { guide, updatedBy: request.user._id, updatedAt: new Date() } });
    else await db.collection("teaching_guides").insertOne({ classroomId, guide, updatedBy: request.user._id, updatedAt: new Date() });
    response.json({ guide });
  });

  router.post("/:classroomId/assistant", aiRateLimit, async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const { question } = questionSchema.parse(request.body);
    const room = await db.collection("classrooms").findOne({ _id: classroomId });
    const guide = await db.collection("teaching_guides").findOne({ classroomId });
    const answer = await generateGemini(config,
      `You are a patient learning assistant. Reply in Uzbek. Teach the student through hints and short steps rather than doing homework for them. Never claim to be the real teacher. Subject: ${room?.subject || "general"}. Teacher-approved teaching guide: ${guide?.guide || "Explain with simple examples, ask a checking question, and encourage independent work."}`,
      question);
    response.json({ answer });
  });

  router.get("/:classroomId/students/:studentId/ai-advice", aiRateLimit, async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (!["owner", "teacher", "assistant"].includes(membership.role)) throw new HttpError(403, "FORBIDDEN", "Staff access required");
    const studentId = parseObjectId(request.params.studentId);
    const student = await db.collection("classroom_members").findOne({ classroomId, userId: studentId, role: "student", status: "active" });
    if (!student) throw new HttpError(404, "STUDENT_NOT_FOUND", "Student not found");
    response.json(await studentAdvice(db, config, studentId, classroomId));
  });

  return router;
}
