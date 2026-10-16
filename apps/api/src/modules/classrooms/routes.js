import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { classroomSchema, inviteSchema, joinSchema } from "@sinflab/contracts";
import { requireAuth } from "../auth/auth.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

const memberChangeSchema = z.object({
  role: z.enum(["teacher", "assistant", "student"]).optional(),
  status: z.enum(["active", "removed"]).optional(),
}).refine((value) => value.role || value.status, "A change is required").strict();

const hashCode = (code) => createHash("sha256").update(code).digest("hex");
const id = (value) => value.toString();

function publicClassroom(room, role) {
  return {
    id: id(room._id),
    ownerId: id(room.ownerId),
    name: room.name,
    subject: room.subject,
    description: room.description,
    mode: room.mode,
    status: room.status,
    role,
    createdAt: room.createdAt,
  };
}

async function memberFor(db, classroomId, userId) {
  const member = await db.collection("classroom_members").findOne({
    classroomId,
    userId,
    status: "active",
  });
  if (!member) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
  return member;
}

async function roomFor(db, classroomId) {
  const room = await db.collection("classrooms").findOne({ _id: classroomId, status: "active" });
  if (!room) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
  return room;
}

export function classroomsRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.post("/", async (request, response) => {
    const input = classroomSchema.parse(request.body);
    const now = new Date();
    const room = {
      _id: new ObjectId(),
      ownerId: request.user._id,
      name: input.name,
      subject: input.subject ?? null,
      description: input.description ?? null,
      mode: input.mode,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await db.withTransaction(async (session) => {
      await db.collection("classrooms").insertOne(room, { session });
      await db.collection("classroom_members").insertOne({
        _id: new ObjectId(),
        classroomId: room._id,
        userId: request.user._id,
        role: "owner",
        status: "active",
        joinedAt: now,
      }, { session });
    });
    response.status(201).json({ classroom: publicClassroom(room, "owner") });
  });

  router.get("/", async (request, response) => {
    const memberships = await db.collection("classroom_members").find({
      userId: request.user._id, status: "active",
    }).toArray();
    if (!memberships.length) return response.json({ classrooms: [] });
    const rooms = await db.collection("classrooms").find({
      _id: { $in: memberships.map((item) => item.classroomId) },
      status: "active",
    }).toArray();
    const roles = new Map(memberships.map((item) => [id(item.classroomId), item.role]));
    response.json({
      classrooms: rooms.map((room) => publicClassroom(room, roles.get(id(room._id))))
        .sort((a, b) => b.createdAt - a.createdAt),
    });
  });

  router.post("/join", async (request, response) => {
    const { code } = joinSchema.parse(request.body);
    const codeHash = hashCode(code);
    const now = new Date();
    let room;
    let joinedRole;
    await db.withTransaction(async (session) => {
      const invite = await db.collection("classroom_invites").findOne({ codeHash }, { session });
      if (!invite || invite.revokedAt || invite.expiresAt <= now || invite.usedCount >= invite.maxUses) {
        throw new HttpError(400, "INVALID_INVITE", "Invite code is invalid or expired");
      }
      room = await db.collection("classrooms").findOne({
        _id: invite.classroomId, status: "active",
      }, { session });
      if (!room) throw new HttpError(400, "INVALID_INVITE", "Invite code is invalid or expired");
      const current = await db.collection("classroom_members").findOne({
        classroomId: room._id, userId: request.user._id,
      }, { session });
      if (current?.status === "active") {
        throw new HttpError(409, "ALREADY_MEMBER", "Already a member");
      }
      const claimed = await db.collection("classroom_invites").updateOne({
        _id: invite._id, revokedAt: null, expiresAt: { $gt: now },
        usedCount: { $lt: invite.maxUses },
      }, { $inc: { usedCount: 1 } }, { session });
      if (!claimed.matchedCount) throw new HttpError(400, "INVALID_INVITE", "Invite code is invalid or expired");
      joinedRole = invite.intendedRole;
      if (current) {
        await db.collection("classroom_members").updateOne({
          _id: current._id,
        }, { $set: { role: joinedRole, status: "active", joinedAt: now } }, { session });
      } else {
        await db.collection("classroom_members").insertOne({
          _id: new ObjectId(), classroomId: room._id, userId: request.user._id,
          role: joinedRole, status: "active", joinedAt: now,
        }, { session });
      }
    });
    response.status(201).json({ classroom: publicClassroom(room, joinedRole) });
  });

  router.get("/:classroomId", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    const member = await memberFor(db, classroomId, request.user._id);
    const room = await roomFor(db, classroomId);
    response.json({ classroom: publicClassroom(room, member.role) });
  });

  router.get("/:classroomId/members", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    await memberFor(db, classroomId, request.user._id);
    const memberships = await db.collection("classroom_members").find({
      classroomId, status: "active",
    }).toArray();
    const users = await db.collection("users").find({
      _id: { $in: memberships.map((item) => item.userId) },
    }).toArray();
    const names = new Map(users.map((user) => [id(user._id), user.displayName]));
    response.json({
      members: memberships.map((item) => ({
        userId: id(item.userId),
        displayName: names.get(id(item.userId)) ?? "Unknown",
        role: item.role,
        joinedAt: item.joinedAt,
      })),
    });
  });

  router.post("/:classroomId/invites", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    const member = await memberFor(db, classroomId, request.user._id);
    await roomFor(db, classroomId);
    if (!["owner", "teacher"].includes(member.role)) {
      throw new HttpError(403, "FORBIDDEN", "Only teachers can invite members");
    }
    const input = inviteSchema.parse(request.body);
    if (member.role !== "owner" && input.role !== "student") {
      throw new HttpError(403, "FORBIDDEN", "Only owner can invite staff");
    }
    const code = randomBytes(18).toString("base64url");
    const invite = {
      _id: new ObjectId(),
      classroomId,
      codeHash: hashCode(code),
      intendedRole: input.role,
      expiresAt: new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000),
      maxUses: input.maxUses,
      usedCount: 0,
      createdBy: request.user._id,
      revokedAt: null,
      createdAt: new Date(),
    };
    await db.collection("classroom_invites").insertOne(invite);
    response.status(201).json({
      invite: {
        id: id(invite._id),
        code,
        role: invite.intendedRole,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
      },
    });
  });

  router.patch("/:classroomId/members/:userId", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    const targetId = parseObjectId(request.params.userId);
    const acting = await memberFor(db, classroomId, request.user._id);
    if (acting.role !== "owner") {
      throw new HttpError(403, "FORBIDDEN", "Only owner can change members");
    }
    const input = memberChangeSchema.parse(request.body);
    const target = await db.collection("classroom_members").findOne({
      classroomId, userId: targetId,
    });
    if (!target || target.role === "owner") {
      throw new HttpError(404, "MEMBER_NOT_FOUND", "Member not found");
    }
    await db.collection("classroom_members").updateOne(
      { _id: target._id }, { $set: input },
    );
    response.json({ userId: id(targetId), role: input.role ?? target.role, status: input.status ?? target.status });
  });

  router.delete("/:classroomId/invites/:inviteId", async (request, response) => {
    const classroomId = parseObjectId(request.params.classroomId);
    const inviteId = parseObjectId(request.params.inviteId);
    const acting = await memberFor(db, classroomId, request.user._id);
    const invite = await db.collection("classroom_invites").findOne({ _id: inviteId, classroomId });
    if (!invite) throw new HttpError(404, "INVITE_NOT_FOUND", "Invite not found");
    if (acting.role !== "owner" && !invite.createdBy.equals(request.user._id)) {
      throw new HttpError(403, "FORBIDDEN", "Cannot revoke this invite");
    }
    await db.collection("classroom_invites").updateOne(
      { _id: inviteId }, { $set: { revokedAt: new Date() } },
    );
    response.status(204).send();
  });

  return router;
}
