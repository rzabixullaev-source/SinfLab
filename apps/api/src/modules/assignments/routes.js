import { Router } from "express";
import { ObjectId } from "mongodb";
import { assignmentSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

function publicAssignment(item) {
  return {
    id: String(item._id), classroomId: String(item.classroomId),
    lessonId: item.lessonId ? String(item.lessonId) : null,
    title: item.title, instructions: item.instructions,
    dueAt: item.dueAt, status: item.status, createdAt: item.createdAt,
    publishedAt: item.publishedAt,
  };
}

export async function assignmentAccess(db, classroomId, assignmentIdText, membership) {
  const assignment = await db.collection("assignments").findOne({
    _id: parseObjectId(assignmentIdText), classroomId,
  });
  if (!assignment || (membership.role === "student" && assignment.status !== "published")) {
    throw new HttpError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }
  return assignment;
}

export function assignmentsRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/:classroomId/assignments", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const input = assignmentSchema.parse(request.body);
    const lessonId = input.lessonId ? parseObjectId(input.lessonId) : null;
    if (lessonId && !await db.collection("lessons").findOne({ _id: lessonId, classroomId })) {
      throw new HttpError(404, "LESSON_NOT_FOUND", "Lesson not found");
    }
    const assignment = {
      _id: new ObjectId(), classroomId, lessonId,
      createdBy: request.user._id, title: input.title, instructions: input.instructions,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      status: "draft", createdAt: new Date(), publishedAt: null,
    };
    await db.collection("assignments").insertOne(assignment);
    response.status(201).json({ assignment: publicAssignment(assignment) });
  });

  router.get("/:classroomId/assignments", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const filter = membership.role === "student" ? { classroomId, status: "published" } : { classroomId };
    const assignments = await db.collection("assignments").find(filter).toArray();
    response.json({ assignments: assignments.map(publicAssignment) });
  });

  router.get("/:classroomId/assignments/:assignmentId", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const assignment = await assignmentAccess(db, classroomId, request.params.assignmentId, membership);
    response.json({ assignment: publicAssignment(assignment) });
  });

  router.post("/:classroomId/assignments/:assignmentId/publish", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const assignment = await assignmentAccess(db, classroomId, request.params.assignmentId, membership);
    if (assignment.status !== "draft") throw new HttpError(409, "ALREADY_PUBLISHED", "Assignment already published");
    const publishedAt = new Date();
    const updated = await db.collection("assignments").updateOne({ _id: assignment._id, status: "draft" }, {
      $set: { status: "published", publishedAt },
    });
    if (!updated.matchedCount) throw new HttpError(409, "ALREADY_PUBLISHED", "Assignment already published");
    response.json({ assignment: publicAssignment({ ...assignment, status: "published", publishedAt }) });
  });

  return router;
}
