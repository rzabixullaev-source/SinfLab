import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("student progress combines missed class, pending work and review items", async () => {
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
      method: "POST", token: teacher.token, body: { name: "Science group", mode: "course" },
    });
    const roomId = room.body.classroom.id;
    const invite = await requestJson(base, "/classrooms/" + roomId + "/invites", {
      method: "POST", token: teacher.token, body: {},
    });
    await requestJson(base, "/classrooms/join", {
      method: "POST", token: student.token, body: { code: invite.body.invite.code },
    });
    const prefix = "/classrooms/" + roomId;
    const lesson = await requestJson(base, prefix + "/lessons", {
      method: "POST", token: teacher.token, body: { title: "Motion" },
    });
    const live = await requestJson(base, prefix + "/live-sessions", {
      method: "POST", token: teacher.token,
      body: { lessonId: lesson.body.lesson.id, provider: "meet", joinUrl: "https://meet.google.com/example" },
    });
    await requestJson(base, prefix + "/live-sessions/" + live.body.session.id + "/end", {
      method: "POST", token: teacher.token,
    });
    const assignment = await requestJson(base, prefix + "/assignments", {
      method: "POST", token: teacher.token,
      body: { title: "Motion homework", instructions: "Solve the problem" },
    });
    await requestJson(base, prefix + "/assignments/" + assignment.body.assignment.id + "/publish", {
      method: "POST", token: teacher.token,
    });
    const quiz = await requestJson(base, prefix + "/quizzes", {
      method: "POST", token: teacher.token,
      body: { title: "Motion quiz", questions: [
        { prompt: "Which value?", choices: ["A", "B"], correctIndex: 1 },
      ] },
    });
    await requestJson(base, prefix + "/quizzes/" + quiz.body.quiz.id + "/publish", {
      method: "POST", token: teacher.token,
    });
    await requestJson(base, prefix + "/quizzes/" + quiz.body.quiz.id + "/attempts", {
      method: "POST", token: student.token, body: { answers: [0] },
    });
    const result = await requestJson(base, prefix + "/my-progress", { token: student.token });
    assert.equal(result.status, 200);
    assert.equal(result.body.progress.missedLessons.length, 1);
    assert.equal(result.body.progress.assignmentsToDo[0].status, "not_started");
    assert.equal(result.body.progress.quizzesToDo.length, 0);
    assert.equal(result.body.progress.reviewQueue[0].kind, "quiz");
    assert.equal((await requestJson(base, prefix + "/my-progress", { token: teacher.token })).status, 403);
    assert.equal((await requestJson(base, prefix + "/my-progress", { token: outsider.token })).status, 404);
  });
});
