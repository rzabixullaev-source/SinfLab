import assert from "node:assert/strict";
import test from "node:test";
import { generateGemini } from "../src/modules/ai/gemini.js";
import { reserveAiRequest } from "../src/modules/ai/budget.js";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("Gemini client keeps the key in a header and parses the generated answer", async () => {
  let called = false;
  const answer = await generateGemini({ GEMINI_API_KEY: "test-secret", GEMINI_MODEL: "gemini-3.5-flash-lite" }, "Guide", "Question", async (url, options) => {
    called = true;
    assert.match(url, /gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(options.headers["x-goog-api-key"], "test-secret");
    assert.equal(JSON.parse(options.body).systemInstruction.parts[0].text, "Guide");
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "Step one" }] } }] }) };
  });
  assert.equal(called, true);
  assert.equal(answer, "Step one");
});

test("teacher controls teaching guide and student can request assistant only in own class", async () => {
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const teacher = await register("AiTeacher");
    const student = await register("AiStudent");
    const outsider = await register("AiOutsider");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Science", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, root + "/invites", { method: "POST", token: teacher.token, body: { role: "student" } })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    const guide = "Use one worked example, then ask a checking question.";
    assert.equal((await requestJson(base, root + "/teaching-guide", { method: "PUT", token: student.token, body: { guide } })).status, 403);
    assert.equal((await requestJson(base, root + "/teaching-guide", { method: "PUT", token: teacher.token, body: { guide } })).status, 200);
    assert.equal((await requestJson(base, root + "/teaching-guide", { token: student.token })).body.guide, guide);
    assert.equal((await requestJson(base, root + "/assistant", { method: "POST", token: outsider.token, body: { question: "Explain atoms" } })).status, 404);
    assert.equal((await requestJson(base, root + "/assistant", { method: "POST", token: teacher.token, body: { question: "Explain atoms" } })).status, 403);
    assert.equal((await requestJson(base, root + "/assistant", { method: "POST", token: student.token, body: { question: "Explain atoms" } })).status, 503);
    assert.equal((await requestJson(base, `${root}/students/${student.user.id}/ai-advice`, { token: outsider.token })).status, 404);
  });
});

test("AI daily budget is atomic and persists in the database", async () => {
  const db = memoryDb();
  const now = new Date("2026-10-18T08:00:00Z");
  const first = await reserveAiRequest(db, "student-1", 2, now);
  const second = await reserveAiRequest(db, "student-1", 2, now);
  assert.deepEqual([first.remaining, second.remaining], [1, 0]);
  await assert.rejects(() => reserveAiRequest(db, "student-1", 2, now), { code: "AI_DAILY_LIMIT" });
  assert.equal((await reserveAiRequest(db, "student-1", 2, new Date("2026-10-19T08:00:00Z"))).remaining, 1);
  const concurrent = await Promise.allSettled(Array.from({ length: 3 }, () => reserveAiRequest(db, "student-2", 2, now)));
  assert.equal(concurrent.filter((item) => item.status === "fulfilled").length, 2);
  assert.equal(concurrent.filter((item) => item.status === "rejected" && item.reason.code === "AI_DAILY_LIMIT").length, 1);
});

test("only approved lesson notes reach Gemini and student feedback reaches the teacher", async () => {
  const prompts = [];
  const fakeGemini = async (_url, options) => {
    prompts.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: "Avval formulani yozing, keyin misolni yeching." }] } }] }) };
  };
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const teacher = await register("PhaseTeacher");
    const student = await register("PhaseStudent");
    const peer = await register("PhasePeer");
    const outsider = await register("PhaseOutsider");
    const room = (await requestJson(base, "/classrooms", { method: "POST", token: teacher.token, body: { name: "Physics AI", mode: "course" } })).body.classroom;
    const root = `/classrooms/${room.id}`;
    const invite = (await requestJson(base, root + "/invites", { method: "POST", token: teacher.token, body: { role: "student" } })).body.invite;
    await requestJson(base, "/classrooms/join", { method: "POST", token: student.token, body: { code: invite.code } });
    await requestJson(base, "/classrooms/join", { method: "POST", token: peer.token, body: { code: invite.code } });
    const lesson = (await requestJson(base, root + "/lessons", { method: "POST", token: teacher.token, body: { title: "Ohm qonuni", description: "Tok va qarshilik" } })).body.lesson;
    const path = root + `/ai-materials/${lesson.id}`;
    const content = "Om qonunida tok kuchi kuchlanishning qarshilikka nisbatidir: I = U / R. Birlik amper.";
    assert.equal((await requestJson(base, path, { method: "PUT", token: student.token, body: { content } })).status, 403);
    assert.equal((await requestJson(base, path, { method: "PUT", token: teacher.token, body: { content } })).body.material.approved, false);
    assert.equal((await requestJson(base, root + "/ai-materials", { token: student.token })).body.materials.length, 0);
    assert.equal((await requestJson(base, root + "/assistant", { method: "POST", token: student.token, body: { question: "Tok kuchi qanday topiladi?", lessonId: lesson.id } })).status, 404);
    assert.equal((await requestJson(base, path + "/approval", { method: "PATCH", token: student.token, body: { approved: true } })).status, 403);
    assert.equal((await requestJson(base, path + "/approval", { method: "PATCH", token: teacher.token, body: { approved: true } })).body.approved, true);
    assert.equal((await requestJson(base, root + "/ai-materials", { token: student.token })).body.materials[0].title, "Ohm qonuni");
    const answer = await requestJson(base, root + "/assistant", { method: "POST", token: student.token, body: { question: "Tok kuchi qanday topiladi?", lessonId: lesson.id } });
    assert.equal(answer.status, 200);
    assert.equal(answer.body.usage.remaining, 1);
    assert.equal(answer.body.answer.includes("formulani"), true);
    assert.equal(prompts[0].systemInstruction.parts[0].text.includes(content), true);
    assert.equal(prompts[0].generationConfig.maxOutputTokens, 300);
    const feedbackPath = root + `/assistant-responses/${answer.body.responseId}/feedback`;
    assert.equal((await requestJson(base, feedbackPath, { method: "POST", token: peer.token, body: { rating: "unhelpful" } })).status, 404);
    assert.equal((await requestJson(base, feedbackPath, { method: "POST", token: student.token, body: { rating: "unhelpful", comment: "Yana bitta misol kerak" } })).status, 200);
    assert.equal((await requestJson(base, root + "/assistant-quality", { token: student.token })).status, 403);
    assert.equal((await requestJson(base, root + "/assistant-quality", { token: outsider.token })).status, 404);
    const quality = await requestJson(base, root + "/assistant-quality", { token: teacher.token });
    assert.equal(quality.body.feedback.length, 1);
    assert.equal(quality.body.feedback[0].comment, "Yana bitta misol kerak");
    assert.equal((await requestJson(base, path, { method: "PUT", token: teacher.token, body: { content: content + " Qo‘shimcha misol." } })).body.material.approved, false);
    assert.equal((await requestJson(base, root + "/ai-materials", { token: student.token })).body.materials.length, 0);
  }, { GEMINI_API_KEY: "test-key", GEMINI_FETCH: fakeGemini, AI_DAILY_REQUEST_LIMIT: 2, AI_MAX_OUTPUT_TOKENS: 300 });
});
