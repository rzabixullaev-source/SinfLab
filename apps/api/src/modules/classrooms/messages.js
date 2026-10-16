import { Router } from "express";
import { ObjectId } from "mongodb";
import { messageSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { classroomAccess, requireTeachingRole } from "../../shared/access.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

function publicMessage(message) {
  return {
    id: String(message._id),
    classroomId: String(message.classroomId),
    senderId: String(message.senderId),
    replyToId: message.replyToId ? String(message.replyToId) : null,
    body: message.deletedAt ? null : message.body,
    createdAt: message.createdAt,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
  };
}

export function messagesRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/:classroomId/messages", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const input = messageSchema.parse(request.body);
    let replyToId = null;
    if (input.replyToId) {
      replyToId = parseObjectId(input.replyToId);
      const parent = await db.collection("messages").findOne({
        _id: replyToId, classroomId, deletedAt: null,
      });
      if (!parent) throw new HttpError(404, "MESSAGE_NOT_FOUND", "Message not found");
    }
    const message = {
      _id: new ObjectId(), classroomId, senderId: request.user._id,
      replyToId, body: input.body, createdAt: new Date(),
      editedAt: null, deletedAt: null,
    };
    await db.collection("messages").insertOne(message);
    response.status(201).json({ message: publicMessage(message) });
  });

  router.get("/:classroomId/messages", async (request, response) => {
    const { classroomId } = await classroomAccess(db, request.params.classroomId, request.user._id);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 50));
    const before = request.query.before ? new Date(String(request.query.before)) : null;
    if (before && Number.isNaN(+before)) throw new HttpError(400, "INVALID_DATE", "Invalid date");
    const filter = { classroomId };
    if (before) filter.createdAt = { $lt: before };
    const messages = await db.collection("messages").find(filter).sort({ createdAt: -1 }).limit(limit).toArray();
    response.json({ messages: messages.reverse().map(publicMessage) });
  });

  router.delete("/:classroomId/messages/:messageId", async (request, response) => {
    const { classroomId, membership } = await classroomAccess(
      db, request.params.classroomId, request.user._id,
    );
    const messageId = parseObjectId(request.params.messageId);
    const message = await db.collection("messages").findOne({
      _id: messageId, classroomId, deletedAt: null,
    });
    if (!message) throw new HttpError(404, "MESSAGE_NOT_FOUND", "Message not found");
    if (!message.senderId.equals(request.user._id)) requireTeachingRole(membership);
    await db.collection("messages").updateOne(
      { _id: messageId }, { $set: { deletedAt: new Date(), body: "" } },
    );
    response.status(204).send();
  });

  return router;
}
