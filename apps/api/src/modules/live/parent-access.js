import { HttpError } from "../../shared/errors.js";

export async function parentObserverAccess(db, parentId, classroomId) {
  const links = await db.collection("parent_links").find({ parentId }).toArray();
  if (!links.length) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
  const memberships = await db.collection("classroom_members").find({ classroomId, role: "student", status: "active", userId: { $in: links.map((link) => link.studentId) } }).toArray();
  if (!memberships.length) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
  const classroom = await db.collection("classrooms").findOne({ _id: classroomId, status: "active" });
  if (!classroom) throw new HttpError(404, "CLASSROOM_NOT_FOUND", "Classroom not found");
  return classroom;
}
