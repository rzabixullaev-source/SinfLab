import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";
import { gameModesForSubject } from "@sinflab/contracts/game-modes";

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

test("subject modes grade numeric and true-false answers and reveal teacher explanations only afterwards", async () => {
  assert.deepEqual(gameModesForSubject("Matematika"), ["choice", "fill", "numeric", "truefalse"]);
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const teacher = await register("ModeTeacher");
    const student = await register("ModeStudent");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Hisob xonasi", subject: "Matematika", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, `${root}/invites`, { method: "POST", token: teacher.token, body: { role: "student" } })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    const quiz = (await requestJson(base, `${root}/quizzes`, { method: "POST", token: teacher.token, body: { title: "Pi soni", questions: [{ prompt: "Pi taxminan nechaga teng?", choices: ["3.14", "2.71"], correctIndex: 0, explanation: "Aylana uzunligining diametrga nisbati pi deyiladi." }] } })).body.quiz;
    await requestJson(base, `${root}/quizzes/${quiz.id}/publish`, { method: "POST", token: teacher.token });
    const publicQuiz = (await requestJson(base, `${root}/quizzes/${quiz.id}`, { token: student.token })).body.quiz;
    assert.equal(publicQuiz.questions[0].explanation, undefined);
    const numeric = (await requestJson(base, `${root}/games/challenge?mode=numeric`, { token: student.token })).body.challenge;
    assert.equal(numeric.explanation, undefined);
    assert.equal(numeric.choices, undefined);
    assert.equal((await requestJson(base, `${root}/games/answer`, { method: "POST", token: student.token, body: { quizId: quiz.id, questionIndex: 0, mode: "numeric", answer: "three" } })).status, 400);
    const numericResult = (await requestJson(base, `${root}/games/answer`, { method: "POST", token: student.token, body: { quizId: quiz.id, questionIndex: 0, mode: "numeric", answer: "3,14" } })).body;
    assert.equal(numericResult.score, 15);
    assert.match(numericResult.explanation, /Aylana uzunligi/);
    const statement = (await requestJson(base, `${root}/games/challenge?mode=truefalse`, { token: student.token })).body.challenge;
    assert.equal(statement.expected, undefined);
    assert.equal(statement.explanation, undefined);
    const truth = statement.statement === "3.14";
    const result = (await requestJson(base, `${root}/games/answer`, { method: "POST", token: student.token, body: { quizId: quiz.id, questionIndex: 0, mode: "truefalse", answer: truth } })).body;
    assert.equal(result.score, 5);
    assert.equal((await requestJson(base, `${root}/games/answer`, { method: "POST", token: student.token, body: { quizId: quiz.id, questionIndex: 0, mode: "truefalse", answer: truth } })).status, 409);
  });
});

test("language scramble changes letter order and is unavailable in other subjects", async () => {
  assert.deepEqual(gameModesForSubject("Ingliz tili"), ["choice", "fill", "scramble"]);
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const teacher = await register("WordTeacher");
    const student = await register("WordStudent");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Til sinfi", subject: "Ingliz tili", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, `${root}/invites`, { method: "POST", token: teacher.token, body: { role: "student" } })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    const quiz = (await requestJson(base, `${root}/quizzes`, { method: "POST", token: teacher.token, body: { title: "So‘zlar", questions: [{ prompt: "Mevaning inglizchasi?", choices: ["apple", "table"], correctIndex: 0, explanation: "Apple meva nomi, table esa stol degani." }] } })).body.quiz;
    await requestJson(base, `${root}/quizzes/${quiz.id}/publish`, { method: "POST", token: teacher.token });
    assert.equal((await requestJson(base, `${root}/games/challenge?mode=numeric`, { token: student.token })).status, 400);
    const challenge = (await requestJson(base, `${root}/games/challenge?mode=scramble`, { token: student.token })).body.challenge;
    assert.notEqual(challenge.scrambled.toLowerCase(), "apple");
    assert.deepEqual([...challenge.scrambled].sort(), [..."apple"].sort());
    assert.equal(challenge.correctAnswer, undefined);
    const result = (await requestJson(base, `${root}/games/answer`, { method: "POST", token: student.token, body: { quizId: quiz.id, questionIndex: 0, mode: "scramble", answer: "APPLE" } })).body;
    assert.equal(result.score, 15);
    assert.match(result.explanation, /Apple meva/);
  });
});
