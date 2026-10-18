import { Router } from "express";
import { ObjectId } from "mongodb";
import { quizAnswersSchema, quizSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

function publicQuiz(quiz, includeKey = false) {
  return {
    id: String(quiz._id), classroomId: String(quiz.classroomId),
    lessonId: quiz.lessonId ? String(quiz.lessonId) : null,
    title: quiz.title, status: quiz.status,
    questions: quiz.questions.map((question, index) => ({
      index, prompt: question.prompt, choices: question.choices, points: question.points,
      ...(includeKey ? { correctIndex: question.correctIndex, explanation: question.explanation ?? "" } : {}),
    })),
    createdAt: quiz.createdAt, publishedAt: quiz.publishedAt,
  };
}

async function quizAccess(db, classroomId, quizIdText, membership) {
  const quiz = await db.collection("quizzes").findOne({
    _id: parseObjectId(quizIdText), classroomId,
  });
  if (!quiz || (membership.role === "student" && quiz.status !== "published")) {
    throw new HttpError(404, "QUIZ_NOT_FOUND", "Quiz not found");
  }
  return quiz;
}

function publicAttempt(attempt) {
  return {
    id: String(attempt._id), quizId: String(attempt.quizId),
    studentId: String(attempt.studentId), answers: attempt.answers,
    score: attempt.score, maxScore: attempt.maxScore,
    submittedAt: attempt.submittedAt,
  };
}

export function quizzesRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/:classroomId/quizzes", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const input = quizSchema.parse(request.body);
    const lessonId = input.lessonId ? parseObjectId(input.lessonId) : null;
    if (lessonId && !await db.collection("lessons").findOne({ _id: lessonId, classroomId })) {
      throw new HttpError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    const quiz = {
      _id: new ObjectId(), classroomId, lessonId,
      createdBy: request.user._id, title: input.title,
      questions: input.questions, status: "draft",
      createdAt: new Date(), publishedAt: null,
    };
    await db.collection("quizzes").insertOne(quiz);
    response.status(201).json({ quiz: publicQuiz(quiz, true) });
  });

  router.get("/:classroomId/quizzes", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const filter = membership.role === "student" ? { classroomId, status: "published" } : { classroomId };
    const quizzes = await db.collection("quizzes").find(filter).toArray();
    response.json({ quizzes: quizzes.map((quiz) => publicQuiz(quiz, membership.role !== "student")) });
  });

  router.get("/:classroomId/quizzes/:quizId", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const quiz = await quizAccess(db, classroomId, request.params.quizId, membership);
    response.json({ quiz: publicQuiz(quiz, membership.role !== "student") });
  });

  router.post("/:classroomId/quizzes/:quizId/publish", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const quiz = await quizAccess(db, classroomId, request.params.quizId, membership);
    if (quiz.status !== "draft") throw new HttpError(409, "ALREADY_PUBLISHED", "Quiz already published");
    const publishedAt = new Date();
    const updated = await db.collection("quizzes").updateOne({ _id: quiz._id, status: "draft" }, {
      $set: { status: "published", publishedAt },
    });
    if (!updated.matchedCount) throw new HttpError(409, "ALREADY_PUBLISHED", "Quiz already published");
    response.json({ quiz: publicQuiz({ ...quiz, status: "published", publishedAt }, true) });
  });

  router.post("/:classroomId/quizzes/:quizId/attempts", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const quiz = await quizAccess(db, classroomId, request.params.quizId, membership);
    const { answers } = quizAnswersSchema.parse(request.body);
    if (answers.length !== quiz.questions.length || answers.some((answer, index) => answer >= quiz.questions[index].choices.length)) {
      throw new HttpError(400, "INVALID_ANSWERS", "One valid answer is required per question");
    }
    const previous = await db.collection("quiz_attempts").findOne({ quizId: quiz._id, studentId: request.user._id });
    if (previous) throw new HttpError(409, "ALREADY_ATTEMPTED", "Quiz already attempted");
    const attempt = {
      _id: new ObjectId(), quizId: quiz._id, classroomId,
      studentId: request.user._id, answers,
      score: quiz.questions.reduce((score, question, index) => score +
        (answers[index] === question.correctIndex ? question.points : 0), 0),
      maxScore: quiz.questions.reduce((score, question) => score + question.points, 0),
      submittedAt: new Date(),
    };
    await db.collection("quiz_attempts").insertOne(attempt);
    response.status(201).json({ attempt: publicAttempt(attempt) });
  });

  router.get("/:classroomId/quizzes/:quizId/attempts/me", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const quiz = await quizAccess(db, classroomId, request.params.quizId, membership);
    const attempt = await db.collection("quiz_attempts").findOne({ quizId: quiz._id, studentId: request.user._id });
    response.json({ attempt: attempt ? publicAttempt(attempt) : null });
  });

  router.get("/:classroomId/quizzes/:quizId/attempts", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const quiz = await quizAccess(db, classroomId, request.params.quizId, membership);
    const attempts = await db.collection("quiz_attempts").find({ quizId: quiz._id }).toArray();
    response.json({ attempts: attempts.map(publicAttempt) });
  });

  return router;
}
