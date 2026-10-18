import assert from "node:assert/strict";
import test from "node:test";
import { memoryDb, requestJson, withServer } from "./helpers.js";

test("private words stay owned by their author and published book snapshots are shared", async () => {
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const author = await register("WordAuthor");
    const reader = await register("WordReader");
    const word = (await requestJson(base, "/vocabulary/words", { method: "POST", token: author.token, body: { term: "study", language: "English", meaning: "o‘qimoq", example: "I study physics.", forms: "studies, studied", difficult: true } })).body.word;
    assert.equal((await requestJson(base, "/vocabulary/words", { token: reader.token })).body.words.length, 0);
    assert.equal((await requestJson(base, `/vocabulary/words/${word.id}`, { method: "PATCH", token: reader.token, body: { difficult: false } })).status, 404);
    assert.equal((await requestJson(base, `/vocabulary/words/${word.id}/explain`, { method: "POST", token: reader.token })).status, 404);
    assert.equal((await requestJson(base, "/vocabulary/books", { method: "POST", token: reader.token, body: { title: "Stolen book", wordIds: [word.id], published: true } })).status, 400);
    const privateBook = (await requestJson(base, "/vocabulary/books", { method: "POST", token: author.token, body: { title: "My private words", wordIds: [word.id] } })).body.book;
    assert.equal((await requestJson(base, `/vocabulary/books/${privateBook.id}`, { token: reader.token })).status, 404);
    const publicBook = (await requestJson(base, "/vocabulary/books", { method: "POST", token: author.token, body: { title: "Useful English", wordIds: [word.id], published: true } })).body.book;
    assert.equal((await requestJson(base, "/vocabulary/books/public", { token: reader.token })).body.books.length, 1);
    assert.equal((await requestJson(base, `/vocabulary/books/${publicBook.id}`, { token: reader.token })).body.book.words[0].term, "study");
    await requestJson(base, `/vocabulary/words/${word.id}`, { method: "PATCH", token: author.token, body: { term: "learn" } });
    assert.equal((await requestJson(base, `/vocabulary/books/${publicBook.id}`, { token: reader.token })).body.book.words[0].term, "study");
  });
});

test("reviews schedule private words and authors can edit and export their books", async () => {
  await withServer(memoryDb(), async (base) => {
    const register = async (name) => (await requestJson(base, "/auth/register", { method: "POST", body: { displayName: name, email: `${name.toLowerCase()}@example.com`, password: "strong-pass-123" } })).body;
    const author = await register("ReviewAuthor");
    const reader = await register("ReviewReader");
    const add = async (term) => (await requestJson(base, "/vocabulary/words", { method: "POST", token: author.token, body: { term, language: "English", meaning: "o‘rganmoq", example: "I learn.", forms: "learned", difficult: false } })).body.word;
    const first = await add("learn");
    const second = await add("study");
    assert.equal(first.reviewDueAt, null);
    assert.equal((await requestJson(base, `/vocabulary/words/${first.id}/review`, { method: "POST", token: reader.token, body: { grade: "easy" } })).status, 404);
    assert.equal((await requestJson(base, `/vocabulary/words/${first.id}/review`, { method: "POST", token: author.token, body: { grade: "perfect" } })).status, 400);
    const reviewed = (await requestJson(base, `/vocabulary/words/${first.id}/review`, { method: "POST", token: author.token, body: { grade: "good" } })).body.word;
    assert.equal(reviewed.reviewCount, 1);
    assert.equal(reviewed.reviewIntervalDays, 3);
    assert.ok(+new Date(reviewed.reviewDueAt) > Date.now());
    assert.equal((await requestJson(base, "/vocabulary/words", { token: author.token })).body.words.find((word) => word.id === first.id).reviewCount, 1);

    const book = (await requestJson(base, "/vocabulary/books", { method: "POST", token: author.token, body: { title: "Mening lug‘atim", wordIds: [first.id] } })).body.book;
    assert.equal((await requestJson(base, `/vocabulary/books/${book.id}`, { token: reader.token })).status, 404);
    assert.equal((await requestJson(base, `/vocabulary/books/${book.id}`, { method: "PATCH", token: reader.token, body: { published: true } })).status, 404);
    assert.equal((await requestJson(base, `/vocabulary/books/${book.id}`, { method: "PATCH", token: author.token, body: { wordIds: [second.id, reader.user.id] } })).status, 400);
    const updated = (await requestJson(base, `/vocabulary/books/${book.id}`, { method: "PATCH", token: author.token, body: { title: "Inglizcha lug‘at", wordIds: [second.id, first.id], published: true } })).body.book;
    assert.equal(updated.title, "Inglizcha lug‘at");
    assert.equal(updated.wordCount, 2);
    assert.deepEqual(updated.words.map((word) => word.term), ["study", "learn"]);
    assert.equal((await requestJson(base, "/vocabulary/books/public", { token: reader.token })).body.books.length, 1);
    const pdfResponse = await fetch(`${base}/api/v1/vocabulary/books/${book.id}/pdf`, { headers: { authorization: `Bearer ${reader.token}` } });
    const pdf = Buffer.from(await pdfResponse.arrayBuffer());
    assert.equal(pdfResponse.status, 200);
    assert.match(pdfResponse.headers.get("content-type"), /application\/pdf/);
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
    assert.ok(pdf.length > 2000);
    await requestJson(base, `/vocabulary/books/${book.id}`, { method: "PATCH", token: author.token, body: { published: false } });
    const privatePdf = await fetch(`${base}/api/v1/vocabulary/books/${book.id}/pdf`, { headers: { authorization: `Bearer ${reader.token}` } });
    assert.equal(privatePdf.status, 404);
  });
});
