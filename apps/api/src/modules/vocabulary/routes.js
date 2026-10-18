import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../auth/auth.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";
import { generateGemini } from "../ai/gemini.js";
import { aiRateLimit } from "../ai/limit.js";
import { reserveAiRequest } from "../ai/budget.js";

const wordSchema = z.object({
  term: z.string().trim().min(1).max(120),
  language: z.string().trim().min(2).max(50),
  meaning: z.string().trim().min(1).max(300),
  example: z.string().trim().max(500).default(""),
  forms: z.string().trim().max(500).default(""),
  difficult: z.boolean().default(false),
}).strict();
const bookSchema = z.object({ title: z.string().trim().min(3).max(120), wordIds: z.array(z.string()).min(1).max(500), published: z.boolean().default(false) }).strict();
const publicWord = (word) => ({ id: String(word._id), term: word.term, language: word.language, meaning: word.meaning, example: word.example, forms: word.forms, difficult: word.difficult });
const publicBook = (book, includeWords = false) => ({ id: String(book._id), title: book.title, authorName: book.authorName, published: book.published, createdAt: book.createdAt, wordCount: book.words.length, ...(includeWords ? { words: book.words } : {}) });

export function vocabularyRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.get("/words", async (request, response) => {
    const words = await db.collection("vocabulary_words").find({ ownerId: request.user._id }).sort({ createdAt: -1 }).toArray();
    response.json({ words: words.map(publicWord) });
  });
  router.post("/words", async (request, response) => {
    const input = wordSchema.parse(request.body);
    const word = { _id: new ObjectId(), ownerId: request.user._id, ...input, createdAt: new Date(), updatedAt: new Date() };
    await db.collection("vocabulary_words").insertOne(word);
    response.status(201).json({ word: publicWord(word) });
  });
  router.patch("/words/:wordId", async (request, response) => {
    const wordId = parseObjectId(request.params.wordId);
    const current = await db.collection("vocabulary_words").findOne({ _id: wordId, ownerId: request.user._id });
    if (!current) throw new HttpError(404, "WORD_NOT_FOUND", "Word not found");
    const input = wordSchema.partial().strict().parse(request.body);
    if (!Object.keys(input).length) throw new HttpError(400, "VALIDATION_ERROR", "A change is required");
    await db.collection("vocabulary_words").updateOne({ _id: wordId }, { $set: { ...input, updatedAt: new Date() } });
    response.json({ word: publicWord({ ...current, ...input }) });
  });
  router.delete("/words/:wordId", async (request, response) => {
    const result = await db.collection("vocabulary_words").deleteOne({ _id: parseObjectId(request.params.wordId), ownerId: request.user._id });
    if (!result.deletedCount) throw new HttpError(404, "WORD_NOT_FOUND", "Word not found");
    response.status(204).send();
  });
  router.post("/words/:wordId/explain", aiRateLimit, async (request, response) => {
    const word = await db.collection("vocabulary_words").findOne({ _id: parseObjectId(request.params.wordId), ownerId: request.user._id });
    if (!word) throw new HttpError(404, "WORD_NOT_FOUND", "Word not found");
    if (!config.GEMINI_API_KEY) throw new HttpError(503, "AI_NOT_CONFIGURED", "Gemini API key is not configured");
    await reserveAiRequest(db, request.user._id, config.AI_DAILY_REQUEST_LIMIT || 20);
    const explanation = await generateGemini(config,
      "You are a vocabulary tutor. Reply in Uzbek. Explain the word's grammatical forms or inflections, give three natural example sentences in the target language with Uzbek translations, and a memory tip. State uncertainty when a form depends on context.",
      JSON.stringify({ term: word.term, language: word.language, meaning: word.meaning }));
    response.json({ explanation });
  });

  router.get("/books", async (request, response) => {
    const books = await db.collection("vocabulary_books").find({ ownerId: request.user._id }).sort({ createdAt: -1 }).toArray();
    response.json({ books: books.map((book) => publicBook(book, true)) });
  });
  router.get("/books/public", async (_request, response) => {
    const books = await db.collection("vocabulary_books").find({ published: true }).sort({ createdAt: -1 }).limit(100).toArray();
    response.json({ books: books.map((book) => publicBook(book)) });
  });
  router.post("/books", async (request, response) => {
    const input = bookSchema.parse(request.body);
    const ids = input.wordIds.map(parseObjectId);
    if (new Set(ids.map(String)).size !== ids.length) throw new HttpError(400, "VALIDATION_ERROR", "Duplicate words are not allowed");
    const words = await db.collection("vocabulary_words").find({ ownerId: request.user._id, _id: { $in: ids } }).toArray();
    if (words.length !== ids.length) throw new HttpError(400, "INVALID_WORDS", "Some words are unavailable");
    const byId = new Map(words.map((word) => [String(word._id), word]));
    const book = { _id: new ObjectId(), ownerId: request.user._id, authorName: request.user.displayName, title: input.title, published: input.published, words: ids.map((id) => publicWord(byId.get(String(id)))), createdAt: new Date() };
    await db.collection("vocabulary_books").insertOne(book);
    response.status(201).json({ book: publicBook(book, true) });
  });
  router.get("/books/:bookId", async (request, response) => {
    const book = await db.collection("vocabulary_books").findOne({ _id: parseObjectId(request.params.bookId) });
    if (!book || (!book.published && String(book.ownerId) !== String(request.user._id))) throw new HttpError(404, "BOOK_NOT_FOUND", "Book not found");
    response.json({ book: publicBook(book, true) });
  });
  return router;
}
