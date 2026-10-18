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
