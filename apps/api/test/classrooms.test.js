import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

async function register(base, name) {
  const result = await requestJson(base, "/auth/register", {
    method: "POST",
    body: {
      displayName: name,
      email: name.toLowerCase() + "@example.com",
      password: "strong-pass-123",
    },
  });
  assert.equal(result.status, 201);
  return result.body;
}

test("owner creates course, student joins once, and room data stays private", async () => {
  await withServer(memoryDb(), async (base) => {
    const owner = await register(base, "Teacher");
    const student = await register(base, "Student");
    const outsider = await register(base, "Outsider");
    const created = await requestJson(base, "/classrooms", {
      method: "POST",
      token: owner.token,
      body: { name: "Fizika 9-sinf", mode: "course", subject: "Fizika" },
    });
    assert.equal(created.status, 201);
    const roomId = created.body.classroom.id;
    assert.equal(created.body.classroom.role, "owner");
    assert.equal((await requestJson(base, "/classrooms/" + roomId, { token: student.token })).status, 404);

    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST",
      token: owner.token,
      body: { role: "student", maxUses: 1, expiresInHours: 1 },
    });
    assert.equal(invite.status, 201);
    assert.ok(invite.body.invite.code);
    const joined = await requestJson(base, "/classrooms/join", {
      method: "POST",
      token: student.token,
      body: { code: invite.body.invite.code },
    });
    assert.equal(joined.status, 201);
    assert.equal(joined.body.classroom.role, "student");
    assert.equal((await requestJson(base, "/classrooms/join", {
      method: "POST", token: outsider.token, body: { code: invite.body.invite.code },
    })).status, 400);

    const members = await requestJson(base, "/classrooms/" + roomId + "/members", { token: student.token });
    assert.equal(members.status, 200);
    assert.equal(members.body.members.length, 2);
    assert.equal((await requestJson(base, "/classrooms/" + roomId + "/members", {
      token: outsider.token,
    })).status, 404);
    assert.equal((await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: student.token, body: {},
    })).status, 403);
  });
});

test("owner can promote a member; invited teacher cannot grant staff role", async () => {
  await withServer(memoryDb(), async (base) => {
    const owner = await register(base, "Owner");
    const learner = await register(base, "Learner");
    const created = await requestJson(base, "/classrooms", {
      method: "POST", token: owner.token,
      body: { name: "Frontend", mode: "course" },
    });
    const roomId = created.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: owner.token, body: {},
    });
    await requestJson(base, "/classrooms/join", {
      method: "POST", token: learner.token, body: { code: invite.body.invite.code },
    });
    const changed = await requestJson(base, "/classrooms/" + roomId + "/members/" + learner.user.id, {
      method: "PATCH", token: owner.token, body: { role: "teacher" },
    });
    assert.equal(changed.status, 200);
    const staff = await register(base, "StaffTeacher");
    const staffInvite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: owner.token, body: { role: "teacher" },
    });
    assert.equal((await requestJson(base, "/classrooms/join", {
      method: "POST", token: staff.token, body: { code: staffInvite.body.invite.code },
    })).status, 201);
    const forbidden = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: staff.token, body: { role: "assistant" },
    });
    assert.equal(forbidden.status, 403);
    const allowed = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: staff.token, body: { role: "student" },
    });
    assert.equal(allowed.status, 201);
    const revoked = await fetch(base + "/api/v1/classrooms/" + roomId + "/invites/" + allowed.body.invite.id, {
      method: "DELETE", headers: { authorization: "Bearer " + staff.token },
    });
    assert.equal(revoked.status, 204);
  });
});

test("invalid room id and revoked invite are rejected", async () => {
  const db = memoryDb();
  await withServer(db, async (base) => {
    const owner = await register(base, "Admin");
    const learner = await register(base, "Pupil");
    assert.equal((await requestJson(base, "/classrooms/not-an-id", { token: owner.token })).status, 400);
    const created = await requestJson(base, "/classrooms", {
      method: "POST", token: owner.token,
      body: { name: "Math Club", mode: "club" },
    });
    const roomId = created.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: owner.token, body: {},
    });
    const revoke = await fetch(base + "/api/v1/classrooms/" + roomId + "/invites/" + invite.body.invite.id, {
      method: "DELETE", headers: { authorization: "Bearer " + owner.token },
    });
    assert.equal(revoke.status, 204);
    const join = await requestJson(base, "/classrooms/join", {
      method: "POST", token: learner.token, body: { code: invite.body.invite.code },
    });
    assert.equal(join.status, 400);
  });
});
