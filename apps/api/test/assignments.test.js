import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("assignment draft is teacher only, published assignment is visible to students", async () => {
  await withServer(memoryDb(), async (base) => {
    async function register(name) {
      const result = await requestJson(base, "/auth/register", {
        method: "POST", body: { displayName: name, email: name + "@example.com", password: "strong-pass-123" },
      });
      return result.body;
    }
    const teacher = await register("Teacher");
    const student = await register("Student");
    const room = await requestJson(base, "/classrooms", {
      method: "POST", token: teacher.token, body: { name: "Math lessons", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    await requestJson(base, "/classrooms/join", {
      method: "POST", token: student.token, body: { code: invite.body.invite.code },
    });
    const lesson = await requestJson(base, "/classrooms/" + roomId + "/lessons", {
      method: "POST", token: teacher.token, body: { title: "Fractions" },
    });
    const route = "/classrooms/" + roomId + "/assignments";
    assert.equal((await requestJson(base, route, {
      method: "POST", token: student.token,
      body: { title: "Illegal", instructions: "Solve" },
    })).status, 403);
    const created = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { title: "Exercise 1", instructions: "Solve 1-10", lessonId: lesson.body.lesson.id },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.assignment.status, "draft");
    const assignmentId = created.body.assignment.id;
    assert.equal((await requestJson(base, route, { token: student.token })).body.assignments.length, 0);
    assert.equal((await requestJson(base, route + "/" + assignmentId, { token: student.token })).status, 404);
    const published = await requestJson(base, route + "/" + assignmentId + "/publish", {
      method: "POST", token: teacher.token,
    });
    assert.equal(published.status, 200);
    assert.equal((await requestJson(base, route, { token: student.token })).body.assignments.length, 1);
    assert.equal((await requestJson(base, route + "/" + assignmentId + "/publish", {
      method: "POST", token: student.token,
    })).status, 403);
    assert.equal((await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { title: "Cross lesson", instructions: "Solve", lessonId: "000000000000000000000000" },
    })).status, 404);
  });
});

test("student submits, receives revision request, and resubmits with private history", async () => {
  await withServer(memoryDb(), async (base) => {
    async function register(name) {
      const result = await requestJson(base, "/auth/register", {
        method: "POST", body: { displayName: name, email: name + "@example.com", password: "strong-pass-123" },
      });
      return result.body;
    }
    const teacher = await register("Owner");
    const student = await register("Pupil");
    const peer = await register("Peer");
    const room = await requestJson(base, "/classrooms", {
      method: "POST", token: teacher.token, body: { name: "Physics class", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    for (const learner of [student, peer]) {
      await requestJson(base, "/classrooms/join", {
        method: "POST", token: learner.token, body: { code: invite.body.invite.code },
      });
    }
    const route = "/classrooms/" + roomId + "/assignments";
    const created = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { title: "Ohm law", instructions: "Calculate current" },
    });
    const workRoute = route + "/" + created.body.assignment.id + "/submissions";
    assert.equal((await requestJson(base, workRoute, {
      method: "POST", token: student.token, body: { body: "First answer" },
    })).status, 404);
    await requestJson(base, route + "/" + created.body.assignment.id + "/publish", {
      method: "POST", token: teacher.token,
    });
    const first = await requestJson(base, workRoute, {
      method: "POST", token: student.token, body: { body: "First answer" },
    });
    assert.equal(first.status, 201);
    const submissionId = first.body.submission.id;
    assert.equal((await requestJson(base, workRoute, { token: peer.token })).status, 403);
    assert.equal((await requestJson(base, workRoute + "/me", { token: peer.token })).body.submission, null);
    assert.equal((await requestJson(base, workRoute, {
      method: "POST", token: student.token, body: { body: "Too soon" },
    })).status, 409);
    const feedback = await requestJson(base, workRoute + "/" + submissionId + "/feedback", {
      method: "POST", token: teacher.token,
      body: { body: "Check the units", score: 60, needsRevision: true },
    });
    assert.equal(feedback.status, 201);
    assert.equal(feedback.body.submission.status, "needs_revision");
    const second = await requestJson(base, workRoute, {
      method: "POST", token: student.token, body: { body: "Corrected answer" },
    });
    assert.equal(second.status, 201);
    assert.equal(second.body.submission.currentVersion, 2);
    assert.deepEqual(second.body.submission.revisions.map((r) => r.body), ["First answer", "Corrected answer"]);
    assert.equal((await requestJson(base, workRoute, { token: teacher.token })).body.submissions.length, 1);
    assert.equal((await requestJson(base, workRoute + "/" + submissionId + "/feedback", {
      method: "POST", token: peer.token, body: { body: "Fake grading" },
    })).status, 403);
  });
});
