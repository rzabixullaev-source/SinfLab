import { Router } from "express";
import { ObjectId } from "mongodb";
import { ohmsLabSchema, ohmsRunSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

function publicLab(lab) {
  return {
    id: String(lab._id), classroomId: String(lab.classroomId),
    lessonId: lab.lessonId ? String(lab.lessonId) : null,
    kind: lab.kind, title: lab.title,
    maxVoltage: lab.maxVoltage, minResistance: lab.minResistance,
    maxResistance: lab.maxResistance,
    tolerancePercent: lab.tolerancePercent, createdAt: lab.createdAt,
  };
}

function publicRun(run) {
  return {
    id: String(run._id), labId: String(run.labId), studentId: String(run.studentId),
    voltage: run.voltage, resistance: run.resistance,
    predictedCurrent: run.predictedCurrent, actualCurrent: run.actualCurrent,
    power: run.power, errorPercent: run.errorPercent,
    correct: run.correct, createdAt: run.createdAt,
  };
}

async function labFor(db, classroomId, labIdText) {
  const lab = await db.collection("lab_activities").findOne({
    _id: parseObjectId(labIdText), classroomId,
  });
  if (!lab) throw new HttpError(404, "LAB_NOT_FOUND", "Lab activity not found");
  return lab;
}

export function labsRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/:classroomId/labs", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const input = ohmsLabSchema.parse(request.body);
    const lessonId = input.lessonId ? parseObjectId(input.lessonId) : null;
    if (lessonId && !await db.collection("lessons").findOne({ _id: lessonId, classroomId })) {
      throw new HttpError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    const lab = {
      _id: new ObjectId(), classroomId, lessonId,
      kind: "physics-ohms-law", title: input.title,
      maxVoltage: input.maxVoltage, minResistance: input.minResistance,
      maxResistance: input.maxResistance, tolerancePercent: input.tolerancePercent,
      createdBy: request.user._id, createdAt: new Date(),
    };
    await db.collection("lab_activities").insertOne(lab);
    response.status(201).json({ lab: publicLab(lab) });
  });

  router.get("/:classroomId/labs", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const labs = await db.collection("lab_activities").find({ classroomId }).toArray();
    response.json({ labs: labs.map(publicLab) });
  });

  router.post("/:classroomId/labs/:labId/runs", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const lab = await labFor(db, classroomId, request.params.labId);
    const input = ohmsRunSchema.parse(request.body);
    if (input.voltage > lab.maxVoltage || input.resistance < lab.minResistance || input.resistance > lab.maxResistance) {
      throw new HttpError(400, "OUT_OF_RANGE", "Experiment parameters are outside teacher limits");
    }
    const actualCurrent = input.voltage / input.resistance;
    const power = input.voltage * actualCurrent;
    const errorPercent = actualCurrent === 0
      ? (input.predictedCurrent === 0 ? 0 : 100)
      : Math.abs(input.predictedCurrent - actualCurrent) / actualCurrent * 100;
    const run = {
      _id: new ObjectId(), labId: lab._id, classroomId,
      studentId: request.user._id, ...input,
      actualCurrent, power, errorPercent,
      correct: errorPercent <= lab.tolerancePercent,
      createdAt: new Date(),
    };
    await db.collection("lab_runs").insertOne(run);
    response.status(201).json({ run: publicRun(run) });
  });

  router.get("/:classroomId/labs/:labId/runs", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const lab = await labFor(db, classroomId, request.params.labId);
    const filter = membership.role === "student"
      ? { labId: lab._id, studentId: request.user._id }
      : { labId: lab._id };
    const runs = await db.collection("lab_runs").find(filter).toArray();
    response.json({ runs: runs.map(publicRun) });
  });

  return router;
}
