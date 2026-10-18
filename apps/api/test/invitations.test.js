import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

async function user(base, name) {
  const result = await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } });
  assert.equal(result.status, 201);
  return result.body;
}

test("email invitation is visible only to recipient and course role is per room", async () => {
  await withServer(memoryDb(), async (base) => {
    const owner = await user(base, "InviteOwner");
    const learner = await user(base, "InviteLearner");
    const other = await user(base, "InviteOther");
    const room = await requestJson(base, "/classrooms", { method: "POST", token: owner.token, body: { name: "Matematika 7", mode: "course" } });
    const roomId = room.body.classroom.id;
    assert.equal(room.body.classroom.role, "owner");
    const path = `/classrooms/${roomId}/email-invites`;
    assert.equal((await requestJson(base, path, { method: "POST", token: learner.token, body: { email: "inviteother@example.com" } })).status, 404);
    const sent = await requestJson(base, path, { method: "POST", token: owner.token, body: { email: "INVITELEARNER@example.com" } });
    assert.equal(sent.status, 201);
    assert.equal((await requestJson(base, "/classrooms/invitations", { token: other.token })).body.invitations.length, 0);
    const inbox = await requestJson(base, "/classrooms/invitations", { token: learner.token });
    assert.equal(inbox.body.invitations.length, 1);
    const inviteId = inbox.body.invitations[0].id;
    assert.equal((await requestJson(base, `/classrooms/invitations/${inviteId}/accept`, { method: "POST", token: other.token })).status, 404);
    const accepted = await requestJson(base, `/classrooms/invitations/${inviteId}/accept`, { method: "POST", token: learner.token });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.classroom.role, "student");
    assert.equal((await requestJson(base, "/classrooms/invitations", { token: learner.token })).body.invitations.length, 0);
    assert.equal((await requestJson(base, `/classrooms/invitations/${inviteId}/accept`, { method: "POST", token: learner.token })).status, 404);
  });
});

test("club invites create ordinary members without teaching permissions", async () => {
  await withServer(memoryDb(), async (base) => {
    const owner = await user(base, "ClubOwner");
    const member = await user(base, "ClubMember");
    const room = await requestJson(base, "/classrooms", { method: "POST", token: owner.token, body: { name: "Oddiy chat", mode: "club" } });
    const roomId = room.body.classroom.id;
    const sent = await requestJson(base, `/classrooms/${roomId}/email-invites`, { method: "POST", token: owner.token, body: { email: "clubmember@example.com", role: "teacher" } });
    assert.equal(sent.status, 201);
    const accepted = await requestJson(base, `/classrooms/invitations/${sent.body.invitation.id}/accept`, { method: "POST", token: member.token });
    assert.equal(accepted.body.classroom.role, "member");
    assert.equal((await requestJson(base, `/classrooms/${roomId}/lessons`, { method: "POST", token: owner.token, body: { title: "No lessons" } })).status, 403);
    assert.equal((await requestJson(base, `/classrooms/${roomId}/messages`, { method: "POST", token: member.token, body: { body: "Salom" } })).status, 201);
    assert.equal((await requestJson(base, `/classrooms/${roomId}/members/${member.user.id}`, { method: "PATCH", token: owner.token, body: { role: "student" } })).status, 400);
  });
});
