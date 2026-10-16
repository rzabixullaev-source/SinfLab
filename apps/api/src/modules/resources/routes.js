import express, { Router } from "express";
import { ObjectId } from "mongodb";
import { folderSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

function publicFolder(folder) {
  return {
    id: String(folder._id), classroomId: String(folder.classroomId),
    parentId: folder.parentId ? String(folder.parentId) : null,
    name: folder.name, createdAt: folder.createdAt,
  };
}

function publicAsset(asset) {
  return {
    id: String(asset._id), classroomId: String(asset.classroomId),
    folderId: asset.folderId ? String(asset.folderId) : null,
    filename: asset.filename, mimeType: asset.mimeType,
    byteSize: asset.byteSize, createdAt: asset.createdAt,
  };
}

export function resourcesRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/:classroomId/folders", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    const input = folderSchema.parse(request.body);
    const parentId = input.parentId ? parseObjectId(input.parentId) : null;
    if (parentId && !await db.collection("resource_folders").findOne({ _id: parentId, classroomId })) {
      throw new HttpError(404, "FOLDER_NOT_FOUND", "Parent folder not found");
    }
    const folder = {
      _id: new ObjectId(), classroomId, parentId, name: input.name,
      createdBy: request.user._id, createdAt: new Date(),
    };
    await db.collection("resource_folders").insertOne(folder);
    response.status(201).json({ folder: publicFolder(folder) });
  });

  router.get("/:classroomId/folders", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const folders = await db.collection("resource_folders").find({ classroomId }).toArray();
    response.json({ folders: folders.map(publicFolder) });
  });

  router.post("/:classroomId/assets", express.raw({ type: "application/octet-stream", limit: "10mb" }), async (request, response) => {
    const { classroomId, membership } = await classroomAccess(db, request.params.classroomId, request.user._id);
    requireTeachingRole(membership);
    let filename;
    try {
      filename = decodeURIComponent(String(request.headers["x-file-name"] ?? "")).trim();
    } catch {
      throw new HttpError(400, "INVALID_FILENAME", "Invalid filename encoding");
    }
    const mimeType = String(request.headers["x-file-mime"] ?? "application/octet-stream").trim();
    if (!filename || filename.length > 180 || /[\\/\r\n]/.test(filename)) {
      throw new HttpError(400, "INVALID_FILENAME", "Invalid filename");
    }
    if (!/^[\w.+-]+\/[\w.+-]+$/.test(mimeType)) {
      throw new HttpError(400, "INVALID_MIME", "Invalid MIME type");
    }
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      throw new HttpError(400, "EMPTY_FILE", "File must not be empty");
    }
    const folderId = request.headers["x-folder-id"] ? parseObjectId(String(request.headers["x-folder-id"])) : null;
    if (folderId && !await db.collection("resource_folders").findOne({ _id: folderId, classroomId })) {
      throw new HttpError(404, "FOLDER_NOT_FOUND", "Folder not found");
    }
    const asset = {
      _id: new ObjectId(), classroomId, folderId, uploadedBy: request.user._id,
      filename, mimeType, byteSize: request.body.length, createdAt: new Date(),
    };
    await db.uploadFile(asset._id, request.body, filename, mimeType);
    try {
      await db.collection("assets").insertOne(asset);
    } catch (error) {
      await db.deleteFile(asset._id);
      throw error;
    }
    response.status(201).json({ asset: publicAsset(asset) });
  });

  router.get("/:classroomId/assets", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const folderId = request.query.folderId ? parseObjectId(String(request.query.folderId)) : null;
    const assets = await db.collection("assets").find({ classroomId, folderId }).toArray();
    response.json({ assets: assets.map(publicAsset) });
  });

  router.get("/:classroomId/assets/:assetId/download", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const asset = await db.collection("assets").findOne({
      _id: parseObjectId(request.params.assetId), classroomId,
    });
    if (!asset) throw new HttpError(404, "ASSET_NOT_FOUND", "Asset not found");
    const content = await db.readFile(asset._id);
    if (!content) throw new HttpError(404, "ASSET_NOT_FOUND", "File not found");
    response.set("Content-Type", asset.mimeType);
    response.set("Content-Disposition", "attachment; filename*=UTF-8''" + encodeURIComponent(asset.filename));
    response.send(content);
  });

  return router;
}
