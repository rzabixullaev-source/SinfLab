import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  linearLabSchema, linearRunSchema, ohmsLabSchema, ohmsRunSchema,
  osmosisLabSchema, osmosisRunSchema, pendulumLabSchema, pendulumRunSchema,
  titrationLabSchema, titrationRunSchema,
} from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

const labSchemas = {
  "physics-ohms-law": ohmsLabSchema,
  "physics-pendulum": pendulumLabSchema,
  "chemistry-titration": titrationLabSchema,
  "biology-osmosis": osmosisLabSchema,
  "mathematics-linear": linearLabSchema,
};

const configFields = ["maxVoltage", "minResistance", "maxResistance", "tolerancePercent", "minLength", "maxLength", "gravity", "acidMolarity", "acidVolumeMl", "baseMolarity", "maxBaseVolumeMl", "tolerancePh", "insideSolutePercent", "slope", "intercept", "toleranceAbsolute"];
const runFields = ["voltage", "resistance", "predictedCurrent", "actualCurrent", "power", "length", "amplitudeDegrees", "predictedPeriod", "actualPeriod", "baseVolumeMl", "predictedPh", "actualPh", "outsideSolutePercent", "predictedDirection", "actualDirection", "x", "predictedY", "actualY"];
const pick = (item, fields) => Object.fromEntries(fields.filter((field) => item[field] !== undefined).map((field) => [field, item[field]]));

function publicLab(lab) {
  return {
    id: String(lab._id), classroomId: String(lab.classroomId),
    lessonId: lab.lessonId ? String(lab.lessonId) : null,
    kind: lab.kind, title: lab.title,
    ...pick(lab, configFields), createdAt: lab.createdAt,
  };
}

function publicRun(run) {
  return {
    id: String(run._id), labId: String(run.labId), studentId: String(run.studentId),
    kind: run.kind ?? "physics-ohms-law", ...pick(run, runFields),
    errorPercent: run.errorPercent ?? null,
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
    const kind = request.body?.kind ?? "physics-ohms-law";
    const schema = Object.hasOwn(labSchemas, kind) ? labSchemas[kind] : null;
    if (!schema) throw new HttpError(400, "INVALID_LAB_KIND", "Unsupported lab kind");
    const { kind: _kind, ...details } = request.body ?? {};
    const input = schema.parse(details);
    const lessonId = input.lessonId ? parseObjectId(input.lessonId) : null;
    if (lessonId && !await db.collection("lessons").findOne({ _id: lessonId, classroomId })) {
      throw new HttpError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    const lab = {
      _id: new ObjectId(), classroomId,
      kind, ...input, lessonId,
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
    let input;
    let outcome;
    if (lab.kind === "physics-ohms-law") {
      input = ohmsRunSchema.parse(request.body);
      if (input.voltage > lab.maxVoltage || input.resistance < lab.minResistance || input.resistance > lab.maxResistance) {
        throw new HttpError(400, "OUT_OF_RANGE", "Experiment parameters are outside teacher limits");
      }
      const actualCurrent = input.voltage / input.resistance;
      const errorPercent = actualCurrent === 0
        ? (input.predictedCurrent === 0 ? 0 : 100)
        : Math.abs(input.predictedCurrent - actualCurrent) / actualCurrent * 100;
      outcome = { actualCurrent, power: input.voltage * actualCurrent, errorPercent, correct: errorPercent <= lab.tolerancePercent };
    } else if (lab.kind === "physics-pendulum") {
      input = pendulumRunSchema.parse(request.body);
      if (input.length < lab.minLength || input.length > lab.maxLength) throw new HttpError(400, "OUT_OF_RANGE", "Pendulum length is outside teacher limits");
      const angle = input.amplitudeDegrees * Math.PI / 180;
      const actualPeriod = 2 * Math.PI * Math.sqrt(input.length / lab.gravity) * (1 + angle ** 2 / 16 + 11 * angle ** 4 / 3072);
      const errorPercent = Math.abs(input.predictedPeriod - actualPeriod) / actualPeriod * 100;
      outcome = { actualPeriod, errorPercent, correct: errorPercent <= lab.tolerancePercent };
    } else if (lab.kind === "chemistry-titration") {
      input = titrationRunSchema.parse(request.body);
      if (input.baseVolumeMl > lab.maxBaseVolumeMl) throw new HttpError(400, "OUT_OF_RANGE", "Base volume is outside teacher limits");
      const difference = lab.acidMolarity * lab.acidVolumeMl - lab.baseMolarity * input.baseVolumeMl;
      const totalLitres = (lab.acidVolumeMl + input.baseVolumeMl) / 1000;
      const actualPh = Math.abs(difference) < 1e-9 ? 7 : difference > 0
        ? -Math.log10(difference / 1000 / totalLitres)
        : 14 + Math.log10(-difference / 1000 / totalLitres);
      const boundedPh = Math.max(0, Math.min(14, actualPh));
      outcome = { actualPh: boundedPh, correct: Math.abs(input.predictedPh - boundedPh) <= lab.tolerancePh };
    } else if (lab.kind === "biology-osmosis") {
      input = osmosisRunSchema.parse(request.body);
      const gap = lab.insideSolutePercent - input.outsideSolutePercent;
      const actualDirection = Math.abs(gap) < 0.25 ? "balanced" : gap > 0 ? "in" : "out";
      outcome = { actualDirection, correct: input.predictedDirection === actualDirection };
    } else if (lab.kind === "mathematics-linear") {
      input = linearRunSchema.parse(request.body);
      const actualY = lab.slope * input.x + lab.intercept;
      outcome = { actualY, correct: Math.abs(input.predictedY - actualY) <= lab.toleranceAbsolute };
    } else throw new HttpError(400, "INVALID_LAB_KIND", "Unsupported lab kind");
    const run = {
      _id: new ObjectId(), labId: lab._id, classroomId,
      studentId: request.user._id, kind: lab.kind, ...input, ...outcome,
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
