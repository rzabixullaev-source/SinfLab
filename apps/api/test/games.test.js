import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("published quiz powers two graded games and leaderboard contains only classmates", async () => {
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const teacher = await register("GameTeacher");
    const student = await register("GameStudent");
    const peer = await register("GamePeer");
    const outsider = await register("GameOutsider");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Physics", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, root + "/invites", { method: "POST", token: teacher.token, body: { role: "student" } })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    await requestJson(base, "/classrooms/join", { method: "POST", token: peer.token, body: { code: invite.code } });
    const quiz = (await requestJson(base, root + "/quizzes", { method: "POST", token: teacher.token, body: { title: "Units", questions: [{ prompt: "Current unit?", choices: ["Ampere", "Volt"], correctIndex: 0 }] } })).body.quiz;
    assert.equal((await requestJson(base, root + "/games/challenge?mode=choice", { token: student.token })).body.challenge, null);
    await requestJson(base, `${root}/quizzes/${quiz.id}/publish`, { method: "POST", token: teacher.token });
    const challenge = (await requestJson(base, root + "/games/challenge?mode=choice", { token: student.token })).body.challenge;
    assert.equal(challenge.correctIndex, undefined);
    assert.equal(challenge.choices.length, 2);
    assert.equal((await requestJson(base, root + "/games/challenge?mode=fill", { token: student.token })).body.challenge.choices, undefined);
    assert.equal((await requestJson(base, root + "/games/challenge?mode=choice", { token: outsider.token })).status, 404);
    assert.equal((await requestJson(base, root + "/games/answer", { method: "POST", token: teacher.token, body: { quizId: quiz.id, questionIndex: 0, mode: "choice", answer: 0 } })).status, 403);
    const answer = await requestJson(base, root + "/games/answer", { method: "POST", token: student.token, body: { quizId: quiz.id, questionIndex: 0, mode: "choice", answer: 0 } });
    assert.equal(answer.body.score, 10);
    assert.equal((await requestJson(base, root + "/games/answer", { method: "POST", token: student.token, body: { quizId: quiz.id, questionIndex: 0, mode: "choice", answer: 0 } })).status, 409);
    const fill = await requestJson(base, root + "/games/answer", { method: "POST", token: peer.token, body: { quizId: quiz.id, questionIndex: 0, mode: "fill", answer: "volt" } });
    assert.equal(fill.body.score, 0);
    const board = (await requestJson(base, root + "/games/leaderboard", { token: student.token })).body.leaderboard;
    assert.deepEqual(board.map((item) => item.userId), [student.user.id, peer.user.id]);
    assert.deepEqual(board.map((item) => item.score), [10, 0]);
    assert.equal((await requestJson(base, root + "/games/leaderboard", { token: outsider.token })).status, 404);
  });
});
