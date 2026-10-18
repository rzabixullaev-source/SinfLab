import express, { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../auth/auth.js";
import { HttpError } from "../../shared/errors.js";
import { parseObjectId } from "../../shared/ids.js";

const editSchema = z.object({ title: z.string().trim().min(3).max(120).optional(), published: z.boolean().optional() }).strict();
const publicPdf = (book) => ({ id: String(book._id), title: book.title, authorName: book.authorName, filename: book.filename,
  byteSize: book.byteSize, published: book.published, createdAt: book.createdAt, kind: "pdf" });

function headerText(value) {
  try { return decodeURIComponent(String(value || "")).trim(); }
  catch { throw new HttpError(400, "VALIDATION_ERROR", "Invalid book metadata"); }
}

async function readablePdf(db, bookId, ownerId) {
  const book = await db.collection("library_pdfs").findOne({ _id: parseObjectId(bookId) });
  if (!book || (!book.published && String(book.ownerId) !== String(ownerId))) {
    throw new HttpError(404, "BOOK_NOT_FOUND", "PDF book not found");
  }
  return book;
}

export function vocabularyLibraryRouter({ db, config }) {
  const router = Router();
  router.use(requireAuth({ db, config }));

  router.get("/pdf-books", async (request, response) => {
    const books = await db.collection("library_pdfs").find({ ownerId: request.user._id }).sort({ createdAt: -1 }).toArray();
    response.json({ books: books.map(publicPdf) });
  });

  router.get("/pdf-books/public", async (_request, response) => {
    const books = await db.collection("library_pdfs").find({ published: true }).sort({ createdAt: -1 }).limit(100).toArray();
    response.json({ books: books.map(publicPdf) });
  });

  router.post("/pdf-books", express.raw({ type: "application/pdf", limit: "20mb" }), async (request, response) => {
    const title = headerText(request.get("x-book-title"));
    const filename = headerText(request.get("x-file-name"));
    if (title.length < 3 || title.length > 120 || !filename.toLowerCase().endsWith(".pdf") || filename.length > 180 || /[\\/\r\n]/.test(filename)) {
      throw new HttpError(400, "VALIDATION_ERROR", "A title and PDF filename are required");
    }
    if (!Buffer.isBuffer(request.body) || request.body.length < 8 || request.body.subarray(0, 5).toString() !== "%PDF-") {
      throw new HttpError(400, "INVALID_PDF", "The file is not a PDF");
    }
    const book = { _id: new ObjectId(), ownerId: request.user._id, authorName: request.user.displayName,
      title, filename, byteSize: request.body.length, published: request.get("x-book-public") === "true", createdAt: new Date() };
    await db.uploadFile(book._id, request.body, filename, "application/pdf");
    try { await db.collection("library_pdfs").insertOne(book); }
    catch (error) { await db.deleteFile(book._id); throw error; }
    response.status(201).json({ book: publicPdf(book) });
  });

  router.patch("/pdf-books/:bookId", async (request, response) => {
    const bookId = parseObjectId(request.params.bookId);
    const book = await db.collection("library_pdfs").findOne({ _id: bookId, ownerId: request.user._id });
    if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "PDF book not found");
    const input = editSchema.parse(request.body);
    if (!Object.keys(input).length) throw new HttpError(400, "VALIDATION_ERROR", "A change is required");
    await db.collection("library_pdfs").updateOne({ _id: bookId, ownerId: request.user._id }, { $set: input });
    response.json({ book: publicPdf({ ...book, ...input }) });
  });

  router.get("/pdf-books/:bookId", async (request, response) => {
    const book = await readablePdf(db, request.params.bookId, request.user._id);
    response.json({ book: publicPdf(book) });
  });

  router.get("/pdf-books/:bookId/download", async (request, response) => {
    const book = await readablePdf(db, request.params.bookId, request.user._id);
    const content = await db.readFile(book._id);
    if (!content) throw new HttpError(404, "BOOK_NOT_FOUND", "PDF file not found");
    response.set("Content-Type", "application/pdf");
    response.set("Content-Disposition", "attachment; filename*=UTF-8''" + encodeURIComponent(book.filename));
    response.set("Cache-Control", "private, no-store");
    response.send(content);
  });

  router.delete("/pdf-books/:bookId", async (request, response) => {
    const bookId = parseObjectId(request.params.bookId);
    const book = await db.collection("library_pdfs").findOne({ _id: bookId, ownerId: request.user._id });
    if (!book) throw new HttpError(404, "BOOK_NOT_FOUND", "PDF book not found");
    await db.deleteFile(bookId);
    await db.collection("library_pdfs").deleteOne({ _id: bookId, ownerId: request.user._id });
    response.status(204).send();
  });

  return router;
}
