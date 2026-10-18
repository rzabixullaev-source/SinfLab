import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";
import { gameModesForSubject } from "@sinflab/contracts/game-modes";
import { canPlayQuestion, checkGameAnswer, gameModes, gamePrompt, numericAnswer } from "./rules.js";

const answerSchema = z.object({
  quizId: z.string(), questionIndex: z.number().int().min(0),
  mode: z.enum(gameModes),
  answer: z.union([z.number().int().min(0), z.string().trim().min(1).max(200), z.boolean()]),
}).strict();

export function gamesRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.get("/:classroomId/games/challenge", async (request, response) => {
    const { classroomId, membership, classroom } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const mode = z.enum(gameModes).parse(request.query.mode || "choice");
    if (!gameModesForSubject(classroom.subject || classroom.name).includes(mode)) throw new HttpError(400, "INVALID_GAME_MODE", "Mode is not available for this subject");
    const [quizzes, attempts] = await Promise.all([
      db.collection("quizzes").find({ classroomId, status: "published" }).toArray(),
      db.collection("game_attempts").find({ classroomId, studentId: request.user._id, mode }).toArray(),
    ]);
    const completed = new Set(attempts.map((item) => `${item.quizId}:${item.questionIndex}`));
    const challenges = quizzes.flatMap((quiz) => quiz.questions.map((question, questionIndex) => ({ quiz, question, questionIndex })))
      .filter((item) => !completed.has(`${item.quiz._id}:${item.questionIndex}`) && canPlayQuestion(item.question, mode));
    const item = challenges[Math.floor(Math.random() * challenges.length)];
    if (!item) return response.json({ challenge: null });
    const prompt = gamePrompt(item.question, mode, item.quiz._id, item.questionIndex, request.user._id);
    response.json({ challenge: {
      quizId: String(item.quiz._id), questionIndex: item.questionIndex,
      title: item.quiz.title, prompt: item.question.prompt, mode,
      ...(mode === "truefalse" ? { statement: prompt.statement } : prompt),
    } });
  });

  router.post("/:classroomId/games/answer", async (request, response) => {
    const { classroomId, membership, classroom } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const input = answerSchema.parse(request.body);
    if (!gameModesForSubject(classroom.subject || classroom.name).includes(input.mode)) throw new HttpError(400, "INVALID_GAME_MODE", "Mode is not available for this subject");
    const quiz = await db.collection("quizzes").findOne({ _id: parseObjectId(input.quizId), classroomId, status: "published" });
    const question = quiz?.questions[input.questionIndex];
    if (!question) throw new HttpError(404, "CHALLENGE_NOT_FOUND", "Challenge not found");
    if (!canPlayQuestion(question, input.mode)) throw new HttpError(400, "INVALID_GAME_MODE", "This question does not support the mode");
    if (input.mode === "choice" && (typeof input.answer !== "number" || input.answer >= question.choices.length)) throw new HttpError(400, "INVALID_ANSWER", "Invalid choice");
    if (["fill", "scramble", "numeric"].includes(input.mode) && typeof input.answer !== "string") throw new HttpError(400, "INVALID_ANSWER", "Text is required");
    if (input.mode === "truefalse" && typeof input.answer !== "boolean") throw new HttpError(400, "INVALID_ANSWER", "True or false is required");
    if (input.mode === "numeric" && numericAnswer(input.answer) === null) throw new HttpError(400, "INVALID_ANSWER", "A number is required");
    const filter = { classroomId, studentId: request.user._id, quizId: quiz._id, questionIndex: input.questionIndex, mode: input.mode };
    if (await db.collection("game_attempts").findOne(filter)) throw new HttpError(409, "ALREADY_PLAYED", "Challenge already played");
    const correctAnswer = question.choices[question.correctIndex];
    const correct = checkGameAnswer(question, input.mode, input.answer, quiz._id, input.questionIndex, request.user._id);
    const score = correct ? { choice: 10, fill: 15, scramble: 15, numeric: 15, truefalse: 5 }[input.mode] : 0;
    try { await db.collection("game_attempts").insertOne({ _id: new ObjectId(), ...filter, correct, score, createdAt: new Date() }); }
    catch (cause) { if (cause.code === 11000) throw new HttpError(409, "ALREADY_PLAYED", "Challenge already played"); throw cause; }
    response.status(201).json({ correct, score, correctAnswer, explanation: question.explanation || "", lessonId: quiz.lessonId ? String(quiz.lessonId) : null });
  });

  router.get("/:classroomId/games/leaderboard", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const members = await db.collection("classroom_members").find({ classroomId, role: "student", status: "active" }).toArray();
    const attempts = await db.collection("game_attempts").find({ classroomId }).toArray();
    const users = await db.collection("users").find({ _id: { $in: members.map((member) => member.userId) } }).toArray();
    const names = new Map(users.map((user) => [String(user._id), user.displayName]));
    const leaderboard = members.map((member) => ({ userId: String(member.userId), displayName: names.get(String(member.userId)) || "O‘quvchi", score: attempts.filter((item) => String(item.studentId) === String(member.userId)).reduce((sum, item) => sum + item.score, 0) }))
      .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
    response.json({ leaderboard });
  });
  return router;
}
