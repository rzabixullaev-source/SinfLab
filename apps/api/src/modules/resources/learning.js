import express, { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

const linkSchema = z.object({ title: z.string().trim().min(2).max(160), url: z.url().max(2000)
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol)) }).strict();
const allowedMime = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm",
  "text/plain", "text/csv", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const publicResource = (item) => ({ id: String(item._id), parentKind: item.parentKind, parentId: String(item.parentId),
  type: item.type, title: item.title, url: item.url || null, filename: item.filename || null,
  mimeType: item.mimeType || null, byteSize: item.byteSize || null, createdAt: item.createdAt });

async function parentAccess(db, classroomId, kind, parentIdText, membership) {
  if (!["lesson", "assignment"].includes(kind)) throw new HttpError(400, "VALIDATION_ERROR", "Unknown content type");
  const parentId = parseObjectId(parentIdText);
  const parent = await db.collection(kind === "lesson" ? "lessons" : "assignments")
    .findOne({ _id: parentId, classroomId });
  if (!parent || (kind === "assignment" && membership.role === "student" && parent.status !== "published")) {
    throw new HttpError(404, "CONTENT_NOT_FOUND", "Lesson or assignment not found");
  }
  return parentId;
}

export function learningResourcesRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.get("/:classroomId/learning-files/:resourceId/download", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const item = await db.collection("learning_resources").findOne({ _id: parseObjectId(request.params.resourceId), classroomId, type: "file" });
    if (!item) throw new HttpError(404, "RESOURCE_NOT_FOUND", "File not found");
    await parentAccess(db, classroomId, item.parentKind, String(item.parentId), membership);
    const content = await db.readFile(item._id);
    if (!content) throw new HttpError(404, "RESOURCE_NOT_FOUND", "File not found");
    response.set("Content-Type", item.mimeType);
    response.set("Content-Disposition", "attachment; filename*=UTF-8''" + encodeURIComponent(item.filename));
    response.set("Cache-Control", "private, no-store");
    response.send(content);
  });

  router.delete("/:classroomId/learning-resources/:resourceId", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const item = await db.collection("learning_resources").findOne({ _id: parseObjectId(request.params.resourceId), classroomId });
    if (!item) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Resource not found");
    if (item.type === "file") await db.deleteFile(item._id);
    await db.collection("learning_resources").deleteOne({ _id: item._id, classroomId });
    response.status(204).send();
  });

  router.get("/:classroomId/content/:kind/:parentId", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const parentId = await parentAccess(db, classroomId, request.params.kind, request.params.parentId, membership);
    const resources = await db.collection("learning_resources").find({ classroomId, parentKind: request.params.kind, parentId }).sort({ createdAt: 1 }).toArray();
    response.json({ resources: resources.map(publicResource) });
  });

  router.post("/:classroomId/content/:kind/:parentId/links", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const parentId = await parentAccess(db, classroomId, request.params.kind, request.params.parentId, membership);
    const input = linkSchema.parse(request.body);
    const item = { _id: new ObjectId(), classroomId, parentKind: request.params.kind, parentId,
      type: "link", ...input, createdBy: request.user._id, createdAt: new Date() };
    await db.collection("learning_resources").insertOne(item);
    response.status(201).json({ resource: publicResource(item) });
  });

  router.post("/:classroomId/content/:kind/:parentId/files", express.raw({ type: "application/octet-stream", limit: "20mb" }), async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const parentId = await parentAccess(db, classroomId, request.params.kind, request.params.parentId, membership);
    let filename;
    try { filename = decodeURIComponent(String(request.get("x-file-name") || "")).trim(); }
    catch { throw new HttpError(400, "INVALID_FILENAME", "Invalid filename"); }
    const mimeType = String(request.get("x-file-mime") || "").toLowerCase();
    if (!filename || filename.length > 180 || /[\\/\r\n]/.test(filename) || !allowedMime.has(mimeType)) {
      throw new HttpError(400, "INVALID_FILE", "Unsupported file type or name");
    }
    if (!Buffer.isBuffer(request.body) || !request.body.length) throw new HttpError(400, "EMPTY_FILE", "File is empty");
    const item = { _id: new ObjectId(), classroomId, parentKind: request.params.kind, parentId, type: "file",
      title: filename, filename, mimeType, byteSize: request.body.length, createdBy: request.user._id, createdAt: new Date() };
    await db.uploadFile(item._id, request.body, filename, mimeType);
    try { await db.collection("learning_resources").insertOne(item); }
    catch (error) { await db.deleteFile(item._id); throw error; }
    response.status(201).json({ resource: publicResource(item) });
  });

  return router;
}
