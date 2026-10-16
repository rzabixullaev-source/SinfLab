import { Router } from "express";
import { ObjectId } from "mongodb";
import { lessonSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

function publicLesson(lesson) {
  return {
    id: String(lesson._id),
    classroomId: String(lesson.classroomId),
    title: lesson.title,
    description: lesson.description,
    startsAt: lesson.startsAt,
    endsAt: lesson.endsAt,
    status: lesson.status,
    createdAt: lesson.createdAt,
  };
}

export function lessonsRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/:classroomId/lessons", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(
      db, request.params.classroomId, request.user._id,
    );
    requireTeachingRole(membership);
    const input = lessonSchema.parse(request.body);
    const lesson = {
      _id: new ObjectId(),
      classroomId,
      createdBy: request.user._id,
      title: input.title,
      description: input.description ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      status: input.startsAt ? "scheduled" : "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection("lessons").insertOne(lesson);
    response.status(201).json({ lesson: publicLesson(lesson) });
  });

  router.get("/:classroomId/lessons", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const lessons = await db.collection("lessons").find({ classroomId }).toArray();
    response.json({ lessons: lessons.map(publicLesson).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)) });
  });

  router.get("/:classroomId/lessons/:lessonId", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const lesson = await db.collection("lessons").findOne({
      _id: parseObjectId(request.params.lessonId), classroomId,
    });
    if (!lesson) throw new HttpError(404, "LESSON_NOT_FOUND", "Lesson not found");
    response.json({ lesson: publicLesson(lesson) });
  });

  return router;
}
