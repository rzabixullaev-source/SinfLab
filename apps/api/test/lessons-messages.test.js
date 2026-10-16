import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

async function actor(base, name) {
  const result = await requestJson(base, "/auth/register", {
    method: "POST",
    body: { displayName: name, email: name.toLowerCase() + "@example.com", password: "strong-pass-123" },
  });
  assert.equal(result.status, 201);
  return result.body;
}

async function setupRoom(base) {
  const teacher = await actor(base, "Teacher");
  const student = await actor(base, "Student");
  const outsider = await actor(base, "Outsider");
  const created = await requestJson(base, "/classrooms", {
    method: "POST", token: teacher.token, body: { name: "Fizika amaliyoti", mode: "course" },
  });
  const roomId = created.body.classroom.id;
  const invited = await requestJson(base, "/classrooms/" + roomId + "/invites", {
    method: "POST", token: teacher.token, body: {},
  });
  await requestJson(base, "/classrooms/join", {
    method: "POST", token: student.token, body: { code: invited.body.invite.code },
  });
  return { teacher, student, outsider, roomId };
}

test("lesson creation belongs to teacher and is private to room members", async () => {
  await withServer(memoryDb(), async (base) => {
    const { teacher, student, outsider, roomId } = await setupRoom(base);
    const route = "/classrooms/" + roomId + "/lessons";
    assert.equal((await requestJson(base, route, {
      method: "POST", token: student.token, body: { title: "Elektr toki" },
    })).status, 403);
    const badDates = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { title: "Elektr toki", startsAt: "2026-10-17T13:00:00+05:00", endsAt: "2026-10-17T12:00:00+05:00" },
    });
    assert.equal(badDates.status, 400);
    const created = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { title: "Elektr toki", startsAt: "2026-10-17T13:00:00+05:00" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.lesson.status, "scheduled");
    const listed = await requestJson(base, route, { token: student.token });
    assert.equal(listed.body.lessons.length, 1);
    assert.equal((await requestJson(base, route, { token: outsider.token })).status, 404);
    assert.equal((await requestJson(base, route + "/" + created.body.lesson.id, {
      token: outsider.token,
    })).status, 404);
  });
});

test("members can chat and reply; teacher can moderate a student message", async () => {
  await withServer(memoryDb(), async (base) => {
    const { teacher, student, outsider, roomId } = await setupRoom(base);
    const route = "/classrooms/" + roomId + "/messages";
    const posted = await requestJson(base, route, {
      method: "POST", token: student.token, body: { body: "Savolim bor" },
    });
    assert.equal(posted.status, 201);
    const reply = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { body: "Marhamat", replyToId: posted.body.message.id },
    });
    assert.equal(reply.status, 201);
    assert.equal(reply.body.message.replyToId, posted.body.message.id);
    assert.equal((await requestJson(base, route, { token: outsider.token })).status, 404);
    assert.equal((await requestJson(base, route + "/" + reply.body.message.id, {
      method: "DELETE", token: student.token,
    })).status, 403);
    const deleted = await fetch(base + "/api/v1" + route + "/" + posted.body.message.id, {
      method: "DELETE", headers: { authorization: "Bearer " + teacher.token },
    });
    assert.equal(deleted.status, 204);
    const listed = await requestJson(base, route, { token: student.token });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.messages.length, 2);
    assert.equal(listed.body.messages.find((m) => m.id === posted.body.message.id).body, null);
    assert.equal((await requestJson(base, route, {
      method: "POST", token: student.token,
      body: { body: "Another", replyToId: posted.body.message.id },
    })).status, 404);
  });
});
