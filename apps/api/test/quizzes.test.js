import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("quiz key stays private and a student can be graded only once", async () => {
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
      method: "POST", token: teacher.token, body: { name: "Math quiz", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    await requestJson(base, "/classrooms/join", {
      method: "POST", token: student.token, body: { code: invite.body.invite.code },
    });
    const route = "/classrooms/" + roomId + "/quizzes";
    const created = await requestJson(base, route, {
      method: "POST", token: teacher.token,
      body: { title: "Basic math", questions: [
        { prompt: "2 + 2 = ?", choices: ["3", "4", "5"], correctIndex: 1, points: 2 },
        { prompt: "3 + 3 = ?", choices: ["6", "7"], correctIndex: 0, points: 3 },
      ] },
    });
    assert.equal(created.status, 201);
    const quizId = created.body.quiz.id;
    assert.equal((await requestJson(base, route, { token: student.token })).body.quizzes.length, 0);
    assert.equal((await requestJson(base, route + "/" + quizId, { token: student.token })).status, 404);
    await requestJson(base, route + "/" + quizId + "/publish", { method: "POST", token: teacher.token });
    const studentView = await requestJson(base, route + "/" + quizId, { token: student.token });
    assert.equal(studentView.status, 200);
    assert.equal(JSON.stringify(studentView.body).includes("correctIndex"), false);
    const attemptRoute = route + "/" + quizId + "/attempts";
    assert.equal((await requestJson(base, attemptRoute, {
      method: "POST", token: student.token, body: { answers: [1] },
    })).status, 400);
    const attempt = await requestJson(base, attemptRoute, {
      method: "POST", token: student.token, body: { answers: [1, 1] },
    });
    assert.equal(attempt.status, 201);
    assert.equal(attempt.body.attempt.score, 2);
    assert.equal(attempt.body.attempt.maxScore, 5);
    assert.equal((await requestJson(base, attemptRoute, {
      method: "POST", token: student.token, body: { answers: [1, 0] },
    })).status, 409);
    assert.equal((await requestJson(base, attemptRoute, { token: student.token })).status, 403);
    assert.equal((await requestJson(base, attemptRoute + "/me", { token: student.token })).body.attempt.score, 2);
    assert.equal((await requestJson(base, attemptRoute, { token: teacher.token })).body.attempts.length, 1);
  });
});
