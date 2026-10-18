import assert from "node:assert/strict";
import test from "node:test";
import { generateGemini } from "../src/modules/ai/gemini.js";
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
