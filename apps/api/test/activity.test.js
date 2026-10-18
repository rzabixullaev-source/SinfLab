import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { activitySummary } from "../src/modules/activity/routes.js";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("student engagement is counted once and visible only to class staff and linked parent", async () => {
  const db = memoryDb();
  await withServer(db, async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const teacher = await register("ActivityTeacher");
    const student = await register("ActivityStudent");
    const other = await register("ActivityOther");
    const parent = await register("ActivityParent");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Math class", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, root + "/invites", { method: "POST", token: teacher.token, body: { role: "student" } })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    await requestJson(base, "/classrooms/join", { method: "POST", token: other.token, body: { code: invite.code } });

    assert.equal((await requestJson(base, root + "/activity", { method: "POST", token: teacher.token, body: { area: "labs", seconds: 20 } })).status, 403);
    assert.equal((await requestJson(base, root + "/activity", { method: "POST", token: student.token, body: { area: "labs", seconds: 31 } })).status, 400);
    const first = await requestJson(base, root + "/activity", { method: "POST", token: student.token, body: { area: "labs", seconds: 20 } });
    assert.equal(first.body.countedSeconds, 20);
    assert.equal((await requestJson(base, root + "/teaching-overview", { token: student.token })).status, 403);
    const classOverview = await requestJson(base, root + "/teaching-overview", { token: teacher.token });
    assert.equal(classOverview.status, 200);
    assert.deepEqual(classOverview.body.overview, { students: 2, activeStudents: 1, weekSeconds: 20, awaitingFeedback: 0 });
    const repeated = await requestJson(base, root + "/activity", { method: "POST", token: student.token, body: { area: "labs", seconds: 20 } });
    assert.equal(repeated.body.countedSeconds, 0);
    assert.equal((await requestJson(base, `${root}/students/${student.user.id}/activity`, { token: other.token })).status, 403);
    assert.equal((await requestJson(base, `${root}/students/${other.user.id}/activity`, { token: teacher.token })).body.activity.totalSeconds, 0);
    const staff = await requestJson(base, `${root}/students/${student.user.id}/activity`, { token: teacher.token });
    assert.equal(staff.body.activity.totalSeconds, 20);
    assert.equal(staff.body.activity.secondsByArea.labs, 20);
    assert.equal(staff.body.activity.todaySeconds, 20);
    assert.equal(staff.body.activity.days.length, 7);
    assert.equal((await requestJson(base, `${root}/students/${student.user.id}/report`, { token: other.token })).status, 403);
    const report = await requestJson(base, `${root}/students/${student.user.id}/report`, { token: teacher.token });
    assert.equal(report.status, 200);
    assert.equal(report.body.report.engagement.weekSeconds, 20);
    assert.equal(report.body.report.stats.assignmentsTotal, 0);

    assert.equal((await requestJson(base, `/parents/children/${student.user.id}`, { token: parent.token })).status, 404);
    const code = (await requestJson(base, "/parents/invites", { method: "POST", token: student.token, body: {} })).body.code;
    await requestJson(base, "/parents/link", { method: "POST", token: parent.token, body: { code } });
    const overview = await requestJson(base, `/parents/children/${student.user.id}`, { token: parent.token });
    assert.equal(overview.body.stats.totalSeconds, 20);
    assert.equal(overview.body.classrooms[0].engagement.secondsByArea.labs, 20);
    assert.equal(overview.body.classrooms[0].report.engagement.todaySeconds, 20);
  });
});

test("weekly activity excludes older entries while preserving lifetime total", async () => {
  const db = memoryDb();
  const classroomId = new ObjectId();
  const studentId = new ObjectId();
  const old = new Date(); old.setUTCDate(old.getUTCDate() - 10);
  await db.collection("learning_activity").insertOne({ _id: new ObjectId(), classroomId, studentId, area: "lessons", seconds: 30, createdAt: old });
  await db.collection("learning_activity").insertOne({ _id: new ObjectId(), classroomId, studentId, area: "labs", seconds: 20, createdAt: new Date() });
  const result = await activitySummary(db, classroomId, studentId);
  assert.equal(result.totalSeconds, 50);
  assert.equal(result.weekSeconds, 20);
  assert.equal(result.todaySeconds, 20);
  assert.equal(result.days.reduce((sum, day) => sum + day.seconds, 0), 20);
});
