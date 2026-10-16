import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("teacher starts a live lesson, student checks in, and attendance is private", async () => {
  await withServer(memoryDb(), async (base) => {
    async function register(name) {
      const result = await requestJson(base, "/auth/register", {
        method: "POST", body: { displayName: name, email: name + "@example.com", password: "strong-pass-123" },
      });
      return result.body;
    }
    const teacher = await register("Teacher");
    const student = await register("Student");
    const outsider = await register("Outsider");
    const room = await requestJson(base, "/classrooms", {
      method: "POST", token: teacher.token, body: { name: "Science class", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    await requestJson(base, "/classrooms/join", {
      method: "POST", token: student.token, body: { code: invite.body.invite.code },
    });
    const lesson = await requestJson(base, "/classrooms/" + roomId + "/lessons", {
      method: "POST", token: teacher.token, body: { title: "Electricity" },
    });
    const route = "/classrooms/" + roomId + "/live-sessions";
    assert.equal((await requestJson(base, route, {
      method: "POST", token: student.token,
      body: { lessonId: lesson.body.lesson.id, provider: "zoom", joinUrl: "https://zoom.us/j/123" },
    })).status, 403);
    const started = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { lessonId: lesson.body.lesson.id, provider: "zoom", joinUrl: "https://zoom.us/j/123" },
    });
    assert.equal(started.status, 201);
    const sessionId = started.body.session.id;
    assert.equal((await requestJson(base, route, { token: student.token })).body.sessions[0].joinUrl, "https://zoom.us/j/123");
    assert.equal((await requestJson(base, route, { token: outsider.token })).status, 404);
    const checkInRoute = route + "/" + sessionId + "/check-in";
    assert.equal((await requestJson(base, checkInRoute, {
      method: "POST", token: student.token,
    })).status, 201);
    assert.equal((await requestJson(base, checkInRoute, {
      method: "POST", token: student.token,
    })).status, 200);
    const attendanceRoute = route + "/" + sessionId + "/attendance";
    assert.equal((await requestJson(base, attendanceRoute, { token: student.token })).status, 403);
    assert.equal((await requestJson(base, attendanceRoute, { token: teacher.token })).body.attendance.length, 1);
    assert.equal((await requestJson(base, route + "/" + sessionId + "/check-out", {
      method: "POST", token: student.token,
    })).status, 200);
    const ended = await requestJson(base, route + "/" + sessionId + "/end", {
      method: "POST", token: teacher.token,
    });
    assert.equal(ended.status, 200);
    assert.equal(ended.body.session.joinUrl, null);
    assert.equal((await requestJson(base, route, { token: student.token })).body.sessions.length, 0);
    assert.equal((await requestJson(base, checkInRoute, {
      method: "POST", token: student.token,
    })).status, 409);
  });
});
