import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";
import { gameModesForSubject } from "@sinflab/contracts/game-modes";

test("teacher generates a topic game once and students are graded for that lesson", async () => {
  let calls = 0;
  const generated = JSON.stringify({ questions: [
    { prompt: "2 + 2 nechaga teng?", choices: ["4", "3", "5", "6"], correctIndex: 0, explanation: "Ikki va ikki yig‘indisi to‘rt." },
    { prompt: "3 + 1 nechaga teng?", choices: ["2", "3", "4", "5"], correctIndex: 2, explanation: "Uchga bir qo‘shsak to‘rt." },
    { prompt: "5 - 2 nechaga teng?", choices: ["3", "2", "4", "1"], correctIndex: 0, explanation: "Beshtadan ikkini ayirsak uch." },
  ] });
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: {
      displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123",
    } })).body;
    const teacher = await register("TopicTeacher");
    const student = await register("TopicStudent");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token,
      body: { name: "Matematika sinfi", subject: "Matematika", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, root + "/invites", { method: "POST", token: teacher.token, body: {} })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    const lesson = (await requestJson(base, root + "/lessons", { method: "POST", token: teacher.token,
      body: { title: "Oddiy qo‘shish", description: "Kichik sonlarni qo‘shish" } })).body.lesson;
    const path = `${root}/games/lesson/${lesson.id}/generate`;
    assert.equal((await requestJson(base, path, { method: "POST", token: student.token, body: {} })).status, 403);
    const created = await requestJson(base, path, { method: "POST", token: teacher.token, body: {} });
    assert.equal(created.status, 201);
    assert.equal(created.body.questionCount, 3);
    assert.equal((await requestJson(base, path, { method: "POST", token: teacher.token, body: {} })).body.created, false);
    assert.equal(calls, 1);
    const challenge = (await requestJson(base, `${root}/games/challenge?mode=choice&lessonId=${lesson.id}`, { token: student.token })).body.challenge;
    assert.equal(challenge.correctIndex, undefined);
    const answer = await requestJson(base, `${root}/games/answer`, { method: "POST", token: student.token,
      body: { quizId: challenge.quizId, questionIndex: challenge.questionIndex, mode: "choice", answer: 0 } });
    assert.equal(answer.status, 201);
    assert.equal(answer.body.lessonId, lesson.id);
  }, { GEMINI_API_KEY: "test-key", GEMINI_FETCH: async () => { calls++; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: generated }] } }] }) }; } });
});

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
