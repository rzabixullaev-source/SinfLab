import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

const aiResponse = JSON.stringify({ meaning: "qiziqarli", pronunciation: "/ˈɪntrəstɪŋ/", forms: "interesting · more interesting",
  examples: [{ target: "This is interesting.", native: "Bu qiziqarli." }, { target: "An interesting book.", native: "Qiziqarli kitob." }] });

test("language book grows through one daily topic, AI word cards, and a shareable PDF", async () => {
  const db = memoryDb();
  let aiCalls = 0;
  await withServer(db, async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: {
      displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123",
    } })).body;
    const author = await register("LessonAuthor");
    const reader = await register("LessonReader");
    const root = "/vocabulary/courses";
    const created = await requestJson(base, root, { method: "POST", token: author.token, body: { nativeLanguage: "uz", targetLanguage: "en" } });
    assert.equal(created.status, 201);
    const courseId = created.body.course.id;
    assert.equal((await requestJson(base, root, { method: "POST", token: author.token, body: { nativeLanguage: "uz", targetLanguage: "en" } })).status, 409);
    assert.equal((await requestJson(base, root, { method: "POST", token: author.token, body: { nativeLanguage: "en", targetLanguage: "en" } })).status, 400);
    assert.equal((await requestJson(base, `${root}/${courseId}/lessons`, { token: reader.token })).status, 404);
    const lessonPath = `${root}/${courseId}/lessons`;
    const lesson = (await requestJson(base, lessonPath, { method: "POST", token: author.token, body: { topic: "My interests" } })).body.lesson;
    assert.match(lesson.day, /^\d{4}-\d\d-\d\d$/);
    const repeated = await requestJson(base, lessonPath, { method: "POST", token: author.token, body: { topic: "Another topic" } });
    assert.equal(repeated.status, 409);
    assert.equal(repeated.body.error.code, "TODAY_TOPIC_EXISTS");
    const wordsPath = `${lessonPath}/${lesson.id}/words`;
    assert.equal((await requestJson(base, wordsPath, { method: "POST", token: reader.token, body: { term: "interesting" } })).status, 404);
    const aiWord = await requestJson(base, wordsPath, { method: "POST", token: author.token, body: { term: "interesting" } });
    assert.equal(aiWord.status, 201);
    assert.equal(aiCalls, 1);
    assert.equal(aiWord.body.word.meaning, "qiziqarli");
    assert.equal(aiWord.body.word.pronunciation, "/ˈɪntrəstɪŋ/");
    assert.equal(aiWord.body.word.examples.length, 2);
    assert.equal((await requestJson(base, wordsPath, { method: "POST", token: author.token, body: { term: "INTERESTING" } })).status, 409);
    const manual = await requestJson(base, wordsPath, { method: "POST", token: author.token, body: {
      term: "curious", meaning: "qiziquvchan", pronunciation: "/ˈkjʊəriəs/", example: "A curious student.", exampleTranslation: "Qiziquvchan o‘quvchi.",
    } });
    assert.equal(manual.status, 201);
    assert.equal(aiCalls, 1);
    assert.equal((await requestJson(base, `/vocabulary/words/${manual.body.word.id}`, { method: "PATCH", token: author.token,
      body: { term: "INTERESTING" } })).status, 409);
    const renamed = await requestJson(base, `/vocabulary/words/${manual.body.word.id}`, { method: "PATCH", token: author.token,
      body: { term: "inquisitive" } });
    assert.equal(renamed.status, 200);
    assert.equal((await requestJson(base, wordsPath, { method: "POST", token: author.token,
      body: { term: "INQUISITIVE", meaning: "qiziquvchan" } })).status, 409);
    const loaded = await requestJson(base, lessonPath, { token: author.token });
    assert.deepEqual(loaded.body.lessons[0].words.map((word) => word.term), ["interesting", "inquisitive"]);
    const compiled = await requestJson(base, `${root}/${courseId}/compile`, { method: "POST", token: author.token, body: { published: false } });
    assert.equal(compiled.status, 201);
    const bookId = compiled.body.book.id;
    assert.equal((await requestJson(base, `/vocabulary/books/${bookId}`, { method: "PATCH", token: author.token, body: { title: "Wrong edit" } })).status, 400);
    assert.equal((await requestJson(base, `/vocabulary/books/${bookId}`, { token: reader.token })).status, 404);
    await requestJson(base, `/vocabulary/books/${bookId}`, { method: "PATCH", token: author.token, body: { published: true } });
    const publicBook = await requestJson(base, `/vocabulary/books/${bookId}`, { token: reader.token });
    assert.equal(publicBook.body.book.lessons[0].topic, "My interests");
    assert.equal(publicBook.body.book.words[0].pronunciation, "/ˈɪntrəstɪŋ/");
    const pdf = await fetch(`${base}/api/v1/vocabulary/books/${bookId}/pdf`, { headers: { authorization: `Bearer ${reader.token}` } });
    assert.equal(pdf.status, 200);
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
    const again = await requestJson(base, `${root}/${courseId}/compile`, { method: "POST", token: author.token, body: {} });
    assert.equal(again.status, 200);
    assert.equal(again.body.book.id, bookId);
    assert.equal(again.body.book.published, true);
  }, { GEMINI_API_KEY: "test-key", GEMINI_FETCH: async () => { aiCalls += 1; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: aiResponse }] } }] }) }; } });
});

test("uploaded PDF books stay private until published and reject non-PDF content", async () => {
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: {
      displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123",
    } })).body;
    const author = await register("PdfAuthor");
    const reader = await register("PdfReader");
    const upload = (content) => fetch(`${base}/api/v1/vocabulary/pdf-books`, { method: "POST", headers: {
      authorization: `Bearer ${author.token}`, "content-type": "application/pdf", "x-book-title": encodeURIComponent("Other learning book"), "x-file-name": "learning.pdf",
    }, body: content });
    assert.equal((await upload(Buffer.from("not a pdf"))).status, 400);
    const result = await upload(Buffer.from("%PDF-1.4\nmock content\n%%EOF"));
    assert.equal(result.status, 201);
    const book = (await result.json()).book;
    const download = `${base}/api/v1/vocabulary/pdf-books/${book.id}/download`;
    assert.equal((await fetch(download, { headers: { authorization: `Bearer ${reader.token}` } })).status, 404);
    assert.equal((await requestJson(base, `/vocabulary/pdf-books/public`, { token: reader.token })).body.books.length, 0);
    assert.equal((await requestJson(base, `/vocabulary/pdf-books/${book.id}`, { method: "PATCH", token: reader.token, body: { published: true } })).status, 404);
    const shared = await requestJson(base, `/vocabulary/pdf-books/${book.id}`, { method: "PATCH", token: author.token, body: { published: true } });
    assert.equal(shared.body.book.published, true);
    assert.equal((await requestJson(base, `/vocabulary/pdf-books/public`, { token: reader.token })).body.books.length, 1);
    const pdf = await fetch(download, { headers: { authorization: `Bearer ${reader.token}` } });
    assert.equal(pdf.status, 200);
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), "%PDF");
    assert.equal((await requestJson(base, `/vocabulary/pdf-books/${book.id}`, { method: "DELETE", token: reader.token })).status, 404);
    assert.equal((await fetch(`${base}/api/v1/vocabulary/pdf-books/${book.id}`, { method: "DELETE", headers: { authorization: `Bearer ${author.token}` } })).status, 204);
  });
});
