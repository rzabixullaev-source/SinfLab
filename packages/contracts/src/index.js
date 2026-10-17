import { z } from "zod";

export const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
}).strict();

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
}).strict();

export const classroomSchema = z.object({
  name: z.string().trim().min(3).max(120),
  subject: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  mode: z.enum(["course", "club"]),
}).strict();

export const inviteSchema = z.object({
  role: z.enum(["teacher", "assistant", "student"]).default("student"),
  expiresInHours: z.number().int().min(1).max(168).default(48),
  maxUses: z.number().int().min(1).max(500).default(50),
}).strict();

export const joinSchema = z.object({
  code: z.string().trim().min(16).max(128),
}).strict();

export const lessonSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional(),
  startsAt: z.iso.datetime({ offset: true }).optional(),
  endsAt: z.iso.datetime({ offset: true }).optional(),
}).strict().refine(
  (value) => !value.startsAt || !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt),
  "Lesson end must be after start",
);

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  replyToId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
}).strict();

export const folderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
}).strict();

export const assignmentSchema = z.object({
  title: z.string().trim().min(3).max(160),
  instructions: z.string().trim().min(1).max(10000),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  dueAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

export const submissionSchema = z.object({
  body: z.string().trim().min(1).max(20000),
}).strict();

export const feedbackSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  score: z.number().min(0).max(100).optional(),
  needsRevision: z.boolean().default(false),
}).strict();

export const quizSchema = z.object({
  title: z.string().trim().min(3).max(160),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  questions: z.array(z.object({
    prompt: z.string().trim().min(3).max(2000),
    choices: z.array(z.string().trim().min(1).max(500)).min(2).max(6),
    correctIndex: z.number().int().min(0),
    points: z.number().int().min(1).max(100).default(1),
  }).strict().refine((question) => question.correctIndex < question.choices.length,
    "Correct answer must be one of the choices")).min(1).max(30),
}).strict();

export const quizAnswersSchema = z.object({
  answers: z.array(z.number().int().min(0)).min(1).max(30),
}).strict();

export const liveSessionSchema = z.object({
  lessonId: z.string().regex(/^[a-f0-9]{24}$/),
  provider: z.enum(["zoom", "meet", "other"]),
  joinUrl: z.url().max(1000).refine((value) => new URL(value).protocol === "https:",
    "A secure meeting link is required"),
}).strict();

export const ohmsLabSchema = z.object({
  title: z.string().trim().min(3).max(160),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  maxVoltage: z.number().min(1).max(48).default(24),
  minResistance: z.number().min(0.1).max(100).default(1),
  maxResistance: z.number().min(1).max(1000).default(100),
  tolerancePercent: z.number().min(1).max(30).default(5),
}).strict().refine((value) => value.maxResistance > value.minResistance,
  "Maximum resistance must exceed minimum resistance");

export const ohmsRunSchema = z.object({
  voltage: z.number().min(0),
  resistance: z.number().positive(),
  predictedCurrent: z.number().min(0),
}).strict();

export const pendulumLabSchema = z.object({
  title: z.string().trim().min(3).max(160),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  minLength: z.number().min(0.2).max(2).default(0.3),
  maxLength: z.number().min(0.5).max(3).default(2),
  gravity: z.number().min(1).max(20).default(9.81),
  tolerancePercent: z.number().min(1).max(30).default(5),
}).strict().refine((value) => value.maxLength > value.minLength, "Maximum length must exceed minimum length");

export const pendulumRunSchema = z.object({
  length: z.number().min(0.2).max(3),
  amplitudeDegrees: z.number().min(2).max(45),
  predictedPeriod: z.number().positive(),
}).strict();

export const titrationLabSchema = z.object({
  title: z.string().trim().min(3).max(160),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  acidMolarity: z.number().min(0.01).max(2).default(0.1),
  acidVolumeMl: z.number().min(5).max(100).default(25),
  baseMolarity: z.number().min(0.01).max(2).default(0.1),
  maxBaseVolumeMl: z.number().min(5).max(200).default(100),
  tolerancePh: z.number().min(0.1).max(2).default(0.5),
}).strict();

export const titrationRunSchema = z.object({
  baseVolumeMl: z.number().min(0).max(200),
  predictedPh: z.number().min(0).max(14),
}).strict();

export const osmosisLabSchema = z.object({
  title: z.string().trim().min(3).max(160),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  insideSolutePercent: z.number().min(0).max(20).default(5),
}).strict();

export const osmosisRunSchema = z.object({
  outsideSolutePercent: z.number().min(0).max(20),
  predictedDirection: z.enum(["in", "out", "balanced"]),
}).strict();

export const linearLabSchema = z.object({
  title: z.string().trim().min(3).max(160),
  lessonId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  slope: z.number().min(-10).max(10).default(2),
  intercept: z.number().min(-20).max(20).default(1),
  toleranceAbsolute: z.number().min(0.01).max(2).default(0.25),
}).strict();

export const linearRunSchema = z.object({
  x: z.number().min(-10).max(10),
  predictedY: z.number().min(-120).max(120),
}).strict();
