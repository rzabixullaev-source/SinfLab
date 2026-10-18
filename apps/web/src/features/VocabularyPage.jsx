import { useEffect, useState } from "react";
import { BookOpen, Download, Plus, Printer, Sparkles } from "lucide-react";
import { api, errorText } from "../lib/api.js";
import { Badge, Button, Field, Panel, SectionHeading, TextArea } from "../components/ui.jsx";
import "./vocabulary.css";

const empty = { term: "", language: "English", meaning: "", example: "", forms: "", difficult: false };

export default function VocabularyPage({ session }) {
  const [words, setWords] = useState([]);
  const [books, setBooks] = useState([]);
  const [publicBooks, setPublicBooks] = useState([]);
  const [form, setForm] = useState(empty);
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [publish, setPublish] = useState(false);
  const [difficultOnly, setDifficultOnly] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [explanation, setExplanation] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const [wordResult, bookResult, publicResult] = await Promise.all([
      api("/vocabulary/words", { token: session.token }),
      api("/vocabulary/books", { token: session.token }),
      api("/vocabulary/books/public", { token: session.token }),
    ]);
    setWords(wordResult.words); setBooks(bookResult.books); setPublicBooks(publicResult.books);
  }
  useEffect(() => { refresh().catch((cause) => setError(errorText(cause))); }, [session.token]);

  async function addWord(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/vocabulary/words", { method: "POST", token: session.token, body: form }); setForm(empty); await refresh(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function toggleDifficult(word) {
    try { await api(`/vocabulary/words/${word.id}`, { method: "PATCH", token: session.token, body: { difficult: !word.difficult } }); await refresh(); }
    catch (cause) { setError(errorText(cause)); }
  }
  async function explain(word) {
    setExplanation((previous) => ({ ...previous, [word.id]: "Tushuntirish tayyorlanmoqda..." }));
    try { const result = await api(`/vocabulary/words/${word.id}/explain`, { method: "POST", token: session.token }); setExplanation((previous) => ({ ...previous, [word.id]: result.explanation })); }
    catch (cause) { setExplanation((previous) => ({ ...previous, [word.id]: errorText(cause) })); }
  }
  async function createBook(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { const result = await api("/vocabulary/books", { method: "POST", token: session.token, body: { title, wordIds: selectedIds, published: publish } }); setTitle(""); setSelectedIds([]); setSelectedBook(result.book); await refresh(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function openBook(book) {
    try { const result = await api(`/vocabulary/books/${book.id}`, { token: session.token }); setSelectedBook(result.book); }
    catch (cause) { setError(errorText(cause)); }
  }
  function downloadBook() {
    if (!selectedBook) return;
    const content = [selectedBook.title, `Muallif: ${selectedBook.authorName}`, "", ...selectedBook.words.map((word, index) => `${index + 1}. ${word.term} (${word.language}) — ${word.meaning}\n   ${word.forms}\n   ${word.example}`)].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${selectedBook.title.replace(/[^\p{L}\p{N}-]+/gu, "-")}.txt`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="page-enter vocabulary-page"><SectionHeading eyebrow="SHAXSIY LUG‘AT" title="So‘zlar va kitoblar" description="So‘zlarni saqlang, qiyinlarini mashq qiling, o‘z lug‘at kitobingizni yarating." />
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <Panel><h2>Yangi so‘z</h2><form className="vocab-form" onSubmit={addWord}><Field label="So‘z" value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} required /><Field label="Til" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} required /><Field label="Tarjima" value={form.meaning} onChange={(event) => setForm({ ...form, meaning: event.target.value })} required /><Field label="Shakllari" value={form.forms} onChange={(event) => setForm({ ...form, forms: event.target.value })} placeholder="Masalan: go, went, gone" /><Field label="Gapda ishlatilishi" value={form.example} onChange={(event) => setForm({ ...form, example: event.target.value })} /><label className="checkbox-line"><input type="checkbox" checked={form.difficult} onChange={(event) => setForm({ ...form, difficult: event.target.checked })} /> Qiyin so‘z</label><Button type="submit" loading={busy}><Plus size={16} /> Qo‘shish</Button></form></Panel>
    <section><SectionHeading eyebrow="SO‘ZLAR BAZASI" title={`${words.length} ta so‘z`} action={<label className="checkbox-line"><input type="checkbox" checked={difficultOnly} onChange={(event) => setDifficultOnly(event.target.checked)} /> Faqat qiyinlari</label>} /><div className="vocab-grid">{words.filter((word) => !difficultOnly || word.difficult).map((word) => <Panel key={word.id} className="vocab-word"><div><strong>{word.term}</strong>{word.difficult ? <Badge tone="gold">QIYIN</Badge> : null}</div><small>{word.language} · {word.meaning}</small>{word.forms ? <p>Shakllari: {word.forms}</p> : null}{word.example ? <p>{word.example}</p> : null}<div className="vocab-actions"><Button variant="secondary" onClick={() => toggleDifficult(word)}>{word.difficult ? "Oson deb belgilash" : "Qiyin deb belgilash"}</Button>{word.difficult ? <Button variant="secondary" onClick={() => explain(word)}><Sparkles size={15} /> AI bilan o‘rganish</Button> : null}</div>{explanation[word.id] ? <p className="vocab-explanation">{explanation[word.id]}</p> : null}</Panel>)}</div></section>
    <Panel><h2><BookOpen size={20} /> Lug‘at kitobi yaratish</h2><form onSubmit={createBook} className="vocab-book-form"><Field label="Kitob nomi" value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} required /><p>Kitobga kiritiladigan so‘zlarni tanlang:</p><div className="vocab-select-words">{words.map((word) => <label key={word.id}><input type="checkbox" checked={selectedIds.includes(word.id)} onChange={(event) => setSelectedIds(event.target.checked ? [...selectedIds, word.id] : selectedIds.filter((id) => id !== word.id))} /> {word.term} — {word.meaning}</label>)}</div><label className="checkbox-line"><input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} /> Boshqalarga ochiq qilish</label><Button type="submit" loading={busy} disabled={!selectedIds.length}>Kitob yaratish</Button></form></Panel>
    <div className="vocab-books"><section><h2>Mening kitoblarim</h2>{books.map((book) => <button key={book.id} onClick={() => openBook(book)}>{book.title} · {book.wordCount} so‘z {book.published ? "· Ochiq" : "· Shaxsiy"}</button>)}</section><section><h2>Ochiq kitoblar</h2>{publicBooks.map((book) => <button key={book.id} onClick={() => openBook(book)}>{book.title} · {book.authorName} · {book.wordCount} so‘z</button>)}</section></div>
    {selectedBook ? <Panel className="book-print-area"><div className="book-actions"><Button variant="secondary" onClick={downloadBook}><Download size={16} /> Yuklab olish</Button><Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Chop etish / PDF</Button></div><h1>{selectedBook.title}</h1><p>Muallif: {selectedBook.authorName}</p>{selectedBook.words.map((word, index) => <article key={index}><h3>{index + 1}. {word.term}</h3><p>{word.language} · {word.meaning}</p>{word.forms ? <p>Shakllari: {word.forms}</p> : null}{word.example ? <p>Misol: {word.example}</p> : null}</article>)}</Panel> : null}
  </div>;
}
