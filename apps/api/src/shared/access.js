import { HttpError } from "./errors.js";
import { parseObjectId } from "./ids.js";

export async function classroomAccess(db, classroomIdText, userId) {
  const classroomId = parseObjectId(classroomIdText);
  const membership = await db.collection("classroom_members").findOne({
    classroomId, userId, status: "active",
  });
  if (!membership) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
  const classroom = await db.collection("classrooms").findOne({
    _id: classroomId, status: "active",
  });
  if (!classroom) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
  return { classroomId, membership, classroom };
}

export function requireTeachingRole(membership) {
  if (!["owner", "teacher", "assistant"].includes(membership.role)) {
    throw new HttpError(403, "FORBIDDEN", "Teacher access required");
  }
}
