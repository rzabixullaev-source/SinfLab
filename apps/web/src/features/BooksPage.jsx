import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookMarked, BookOpen, Download, FileText, Globe2, LockKeyhole, Plus, Search, Share2, Trash2, UploadCloud } from "lucide-react";
import { api, downloadLibraryPdf, downloadVocabularyPdf, errorText } from "../lib/api.js";
import { useSettings } from "../lib/settings.jsx";
import { Badge, Button, Field, Panel } from "../components/ui.jsx";
import "./books.css";

function BookTile({ book, t, onOpen }) {
  return <button type="button" className={`library-tile library-${book.kind}`} onClick={() => onOpen(book)}>
    <span className="library-cover"><span className="library-cover-mark">S<span>L</span></span>
      {book.kind === "pdf" ? <FileText size={34} /> : <BookMarked size={34} />}
      <small>{book.kind === "pdf" ? "PDF" : t("vocabBook")}</small></span>
    <span className="library-tile-info"><span className="library-tile-type">{book.kind === "pdf" ? t("pdfBook") : t("vocabBook")}</span>
      <strong>{book.title}</strong><small>{t("byAuthor", { name: book.authorName })}</small>
      <span className="library-tile-footer"><span>{book.kind === "pdf" ? `${Math.max(1, Math.round(book.byteSize / 1024))} KB` : t("bookProgress", { lessons: book.lessonCount || 0, words: book.wordCount })}</span>
        <span>{book.published ? <Globe2 size={14} /> : <LockKeyhole size={14} />} {book.published ? t("public") : t("private")}</span></span></span>
    <ArrowRight className="library-tile-arrow" size={18} /></button>;
}

export default function BooksPage({ session, requestedId, requestedKind }) {
  const { t } = useSettings();
  const [myBooks, setMyBooks] = useState([]);
  const [publicBooks, setPublicBooks] = useState([]);
  const [myPdfs, setMyPdfs] = useState([]);
  const [publicPdfs, setPublicPdfs] = useState([]);
  const [tab, setTab] = useState("mine");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [publishUpload, setPublishUpload] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const [mine, community, pdfMine, pdfCommunity] = await Promise.all([
      api("/vocabulary/books", { token: session.token }), api("/vocabulary/books/public", { token: session.token }),
      api("/vocabulary/pdf-books", { token: session.token }), api("/vocabulary/pdf-books/public", { token: session.token }),
    ]);
    setMyBooks(mine.books); setPublicBooks(community.books); setMyPdfs(pdfMine.books); setPublicPdfs(pdfCommunity.books);
  }, [session.token]);

  useEffect(() => { refresh().catch((cause) => setError(errorText(cause))); }, [refresh]);
  useEffect(() => {
    if (!requestedId) { setSelected(null); return; }
    const path = requestedKind === "pdf" ? `/vocabulary/pdf-books/${requestedId}` : `/vocabulary/books/${requestedId}`;
    api(path, { token: session.token }).then((result) => { setSelected({ ...result.book, kind: requestedKind === "pdf" ? "pdf" : "vocabulary" }); setError(""); })
      .catch((cause) => { setSelected(null); setError(errorText(cause)); });
  }, [requestedId, requestedKind, session.token]);

  const mine = useMemo(() => [...myBooks, ...myPdfs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [myBooks, myPdfs]);
  const community = useMemo(() => [...publicBooks, ...publicPdfs].filter((book) => !mine.some((own) => own.id === book.id && own.kind === book.kind))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [publicBooks, publicPdfs, mine]);
  const pdfs = useMemo(() => [...myPdfs, ...publicPdfs.filter((book) => !myPdfs.some((own) => own.id === book.id))], [myPdfs, publicPdfs]);
  const filtered = (tab === "mine" ? mine : tab === "community" ? community : pdfs)
    .filter((book) => `${book.title} ${book.authorName}`.toLowerCase().includes(query.trim().toLowerCase()));
  const owned = selected && (selected.kind === "pdf" ? myPdfs : myBooks).some((book) => book.id === selected.id);

  function open(book) { window.location.hash = book.kind === "pdf" ? `/books/pdf/${book.id}` : `/books/${book.id}`; }

  async function upload(event) {
    event.preventDefault(); if (!file) return;
    const formElement = event.currentTarget;
    setError(""); setNotice("");
    if (file.size > 20 * 1024 * 1024) { setError("PDF 20 MB dan kichik bo‘lishi kerak."); return; }
    setBusy("upload");
    try {
      const result = await api("/vocabulary/pdf-books", { method: "POST", token: session.token, body: file,
        headers: { "content-type": "application/pdf", "x-book-title": encodeURIComponent(title.trim()), "x-file-name": encodeURIComponent(file.name), "x-book-public": String(publishUpload) } });
      setTitle(""); setFile(null); setPublishUpload(false); formElement.reset();
      await refresh(); open(result.book);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function setPublished(published) {
    if (!selected) return;
    setBusy("publish"); setError("");
    try {
      const path = selected.kind === "pdf" ? `/vocabulary/pdf-books/${selected.id}` : `/vocabulary/books/${selected.id}`;
      const result = await api(path, { method: "PATCH", token: session.token, body: { published } });
      setSelected({ ...selected, ...result.book }); await refresh(); setNotice(t("bookSaved"));
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function share() {
    if (!selected?.published) return;
    const link = window.location.origin + (selected.kind === "pdf" ? `/#/books/pdf/${selected.id}` : `/#/books/${selected.id}`);
    try { await navigator.clipboard.writeText(link); setNotice(t("linkCopied")); }
    catch { setError(link); }
  }

  async function download() {
    if (!selected) return;
    try { if (selected.kind === "pdf") await downloadLibraryPdf(selected, session.token); else await downloadVocabularyPdf(selected, session.token); }
    catch (cause) { setError(errorText(cause)); }
  }

  async function removePdf() {
    if (!selected || selected.kind !== "pdf" || !window.confirm(t("deleteConfirm"))) return;
    setBusy("delete");
    try { await api(`/vocabulary/pdf-books/${selected.id}`, { method: "DELETE", token: session.token });
      window.location.hash = "/books"; await refresh(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  return <div className="page-enter books-page">
    <section className="books-hero"><div><span className="eyebrow"><BookOpen size={16} /> {t("booksEyebrow")}</span><h1>{t("booksTitle")}</h1><p>{t("booksIntro")}</p>
      <div className="books-hero-stats"><span><strong>{myBooks.length}</strong> {t("vocabBook")}</span><span><strong>{myPdfs.length + publicPdfs.length}</strong> {t("pdfBook")}</span></div></div>
      <div className="books-hero-stack" aria-hidden="true"><span /><span /><span /></div></section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {notice ? <p className="vocab-notice" role="status">{notice}</p> : null}

    {selected ? <section className="book-detail"><button className="book-back" type="button" onClick={() => window.location.hash = "/books"}><ArrowLeft size={16} /> {t("back")}</button>
      <Panel className="book-detail-panel"><div className={`book-detail-cover ${selected.kind === "pdf" ? "pdf" : ""}`}>
        {selected.kind === "pdf" ? <FileText size={56} /> : <BookMarked size={56} />}<span>{selected.kind === "pdf" ? "PDF" : t("vocabBook")}</span></div>
        <div className="book-detail-info"><span className="eyebrow">{selected.kind === "pdf" ? t("pdfBook") : t("vocabBook")}</span><h2>{selected.title}</h2>
          <p>{t("byAuthor", { name: selected.authorName })}</p><Badge tone={selected.published ? "teal" : "neutral"}>{selected.published ? t("public") : t("private")}</Badge>
          <div className="book-detail-actions"><Button onClick={download}><Download size={16} /> {t("downloadPdf")}</Button>
            {selected.published ? <Button variant="secondary" onClick={share}><Share2 size={16} /> {t("shareBook")}</Button> : null}
            {owned ? <Button variant="secondary" loading={busy === "publish"} onClick={() => setPublished(!selected.published)}>
              {selected.published ? <LockKeyhole size={16} /> : <Globe2 size={16} />}{selected.published ? t("unpublish") : t("publish")}</Button> : null}
            {owned && selected.kind === "pdf" ? <Button variant="ghost" loading={busy === "delete"} onClick={removePdf}><Trash2 size={16} /> {t("deletePdf")}</Button> : null}</div></div></Panel>
      {selected.kind === "vocabulary" ? <Panel className="book-print-area library-reading"><h2>{selected.title}</h2><p>{t("byAuthor", { name: selected.authorName })}</p>
        {(selected.lessons?.length ? selected.lessons : [{ id: "all", topic: t("words"), wordIds: selected.words.map((word) => word.id) }]).map((lesson) => <section key={lesson.id}>
          <h3>{lesson.day ? `${lesson.day} · ` : ""}{lesson.topic}</h3>
          {lesson.wordIds.map((id) => selected.words.find((word) => word.id === id)).filter(Boolean).map((word) => <article key={word.id}><div><strong>{word.term}</strong><span>{word.pronunciation}</span></div><p>{word.meaning}</p>
            {word.forms ? <small>{t("forms")}: {word.forms}</small> : null}
            {(word.examples?.length ? word.examples : word.example ? [{ target: word.example, native: word.exampleTranslation }] : []).map((example, index) => <blockquote key={index}>{example.target}<br /><small>{example.native}</small></blockquote>)}</article>)}
        </section>)}</Panel> : <Panel className="pdf-detail-note"><FileText size={24} /><p>{selected.filename} · {Math.max(1, Math.round(selected.byteSize / 1024))} KB</p><Button variant="secondary" onClick={download}>{t("downloadPdf")}</Button></Panel>}
    </section> : <><div className="books-toolbar"><div className="books-tabs" role="tablist" aria-label={t("books")}>
      {[["mine", t("myBooks")], ["community", t("communityBooks")], ["pdf", t("pdfBooks")]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>)}</div>
      <label className="books-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("booksTitle")} aria-label={t("booksTitle")} /></label></div>
      {filtered.length ? <div className="library-grid">{filtered.map((book) => <BookTile key={`${book.kind}-${book.id}`} book={book} t={t} onOpen={open} />)}</div>
        : <Panel className="books-empty"><BookOpen size={32} /><h2>{t("noBooks")}</h2><p>{t("booksIntro")}</p><Button variant="secondary" onClick={() => window.location.hash = "/vocabulary"}><Plus size={16} /> {t("startBook")}</Button></Panel>}
      <Panel className="pdf-upload-panel"><div><span className="eyebrow"><UploadCloud size={15} /> {t("pdfBooks")}</span><h2>{t("uploadPdf")}</h2><p>{t("booksIntro")}</p></div>
        <form onSubmit={upload}><Field label={t("pdfTitle")} value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={120} required />
          <Field label={t("choosePdf")} type="file" accept=".pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
          <label className="checkbox-line"><input type="checkbox" checked={publishUpload} onChange={(event) => setPublishUpload(event.target.checked)} /> {t("sharePublic")}</label>
          <Button type="submit" loading={busy === "upload"} disabled={!file}><UploadCloud size={16} /> {t("uploadPdf")}</Button></form></Panel></>}
  </div>;
}
