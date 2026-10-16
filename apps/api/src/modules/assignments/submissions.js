import { Router } from "express";
import { ObjectId } from "mongodb";
import { feedbackSchema, submissionSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";
import { assignmentAccess } from "./routes.js";

function publicSubmission(item, revisions, feedback) {
  return {
    id: String(item._id), assignmentId: String(item.assignmentId),
    studentId: String(item.studentId), status: item.status,
    currentVersion: item.currentVersion, submittedAt: item.submittedAt,
    revisions: revisions.map((revision) => ({
      id: String(revision._id), version: revision.version,
      body: revision.body, submittedAt: revision.submittedAt,
    })),
    feedback: feedback.map((entry) => ({
      id: String(entry._id), version: entry.version,
      body: entry.body, score: entry.score,
      needsRevision: entry.needsRevision, createdAt: entry.createdAt,
    })),
  };
}

async function fullSubmission(db, item) {
  const [revisions, feedback] = await Promise.all([
    db.collection("submission_revisions").find({ submissionId: item._id }).toArray(),
    db.collection("feedback").find({ submissionId: item._id }).toArray(),
  ]);
  return publicSubmission(item, revisions.sort((a, b) => a.version - b.version), feedback);
}

export function submissionsRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/:classroomId/assignments/:assignmentId/submissions", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const assignment = await assignmentAccess(db, classroomId, request.params.assignmentId, membership);
    const input = submissionSchema.parse(request.body);
    const now = new Date();
    let submission = await db.collection("submissions").findOne({
      assignmentId: assignment._id, studentId: request.user._id,
    });
    if (submission && submission.status !== "needs_revision") {
      throw new HttpError(409, "ALREADY_SUBMITTED", "Wait for teacher feedback before resubmitting");
    }
    await db.withTransaction(async (session) => {
      if (!submission) {
        submission = {
          _id: new ObjectId(), assignmentId: assignment._id, classroomId,
          studentId: request.user._id, status: "submitted", currentVersion: 1,
          submittedAt: now, updatedAt: now,
        };
        await db.collection("submissions").insertOne(submission, { session });
      } else {
        const nextVersion = submission.currentVersion + 1;
        const updated = await db.collection("submissions").updateOne({
          _id: submission._id, status: "needs_revision", currentVersion: submission.currentVersion,
        }, { $set: { status: "submitted", submittedAt: now, updatedAt: now }, $inc: { currentVersion: 1 } }, { session });
        if (!updated.matchedCount) throw new HttpError(409, "SUBMISSION_CHANGED", "Submission was updated");
        submission = { ...submission, status: "submitted", currentVersion: nextVersion, submittedAt: now };
      }
      await db.collection("submission_revisions").insertOne({
        _id: new ObjectId(), submissionId: submission._id,
        version: submission.currentVersion, body: input.body, submittedAt: now,
      }, { session });
    });
    response.status(201).json({ submission: await fullSubmission(db, submission) });
  });

  router.get("/:classroomId/assignments/:assignmentId/submissions/me", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    if (membership.role !== "student") throw new HttpError(403, "FORBIDDEN", "Student access required");
    const assignment = await assignmentAccess(db, classroomId, request.params.assignmentId, membership);
    const submission = await db.collection("submissions").findOne({
      assignmentId: assignment._id, studentId: request.user._id,
    });
    response.json({ submission: submission ? await fullSubmission(db, submission) : null });
  });

  router.get("/:classroomId/assignments/:assignmentId/submissions", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const assignment = await assignmentAccess(db, classroomId, request.params.assignmentId, membership);
    const submissions = await db.collection("submissions").find({ assignmentId: assignment._id }).toArray();
    response.json({ submissions: await Promise.all(submissions.map((item) => fullSubmission(db, item))) });
  });

  router.post("/:classroomId/assignments/:assignmentId/submissions/:submissionId/feedback", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const assignment = await assignmentAccess(db, classroomId, request.params.assignmentId, membership);
    const input = feedbackSchema.parse(request.body);
    const submission = await db.collection("submissions").findOne({
      _id: parseObjectId(request.params.submissionId), assignmentId: assignment._id,
    });
    if (!submission) throw new HttpError(404, "SUBMISSION_NOT_FOUND", "Submission not found");
    if (submission.status !== "submitted") throw new HttpError(409, "NOT_AWAITING_FEEDBACK", "Submission is not awaiting feedback");
    const entry = {
      _id: new ObjectId(), submissionId: submission._id,
      version: submission.currentVersion, authorId: request.user._id,
      body: input.body, score: input.score ?? null,
      needsRevision: input.needsRevision, createdAt: new Date(),
    };
    await db.withTransaction(async (session) => {
      const updated = await db.collection("submissions").updateOne({
        _id: submission._id, status: "submitted", currentVersion: submission.currentVersion,
      }, { $set: { status: input.needsRevision ? "needs_revision" : "accepted", updatedAt: entry.createdAt } }, { session });
      if (!updated.matchedCount) throw new HttpError(409, "SUBMISSION_CHANGED", "Submission was updated");
      await db.collection("feedback").insertOne(entry, { session });
    });
    const current = await db.collection("submissions").findOne({ _id: submission._id });
    response.status(201).json({ submission: await fullSubmission(db, current) });
  });

  return router;
}
