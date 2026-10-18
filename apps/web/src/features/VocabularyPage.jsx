import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookMarked, BookOpen, CalendarDays, Check, Languages, Plus, Sparkles, Volume2 } from "lucide-react";
import { vocabularyLanguages, vocabularyLanguageName } from "@sinflab/contracts";
import { api, errorText } from "../lib/api.js";
import { useSettings } from "../lib/settings.jsx";
import { Badge, Button, Field, Panel, Select } from "../components/ui.jsx";
import VocabularyReview from "./VocabularyReview.jsx";
import "./vocabulary.css";
import "./vocabulary-learning.css";

const emptyCard = { term: "", meaning: "", pronunciation: "", example: "", exampleTranslation: "", forms: "" };
const tashkentDay = () => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export default function VocabularyPage({ session }) {
  const { locale, t } = useSettings();
  const [courses, setCourses] = useState([]);
  const [allWords, setAllWords] = useState([]);
  const [courseId, setCourseId] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [lessonId, setLessonId] = useState(null);
  const [nativeLanguage, setNativeLanguage] = useState("uz");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [showSetup, setShowSetup] = useState(false);
  const [topic, setTopic] = useState("");
  const [card, setCard] = useState(emptyCard);
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const currentCourseRef = useRef(null);

  const name = (code) => {
    try { return new Intl.DisplayNames([locale], { type: "language" }).of(code) || vocabularyLanguageName(code); }
    catch { return vocabularyLanguageName(code); }
  };
  const activeCourse = courses.find((course) => course.id === courseId);
  const activeLesson = lessons.find((lesson) => lesson.id === lessonId);
  const todayLesson = lessons.find((lesson) => lesson.day === tashkentDay());
  const courseWords = lessons.flatMap((lesson) => lesson.words);
  const legacyWords = allWords.filter((word) => !word.courseId);

  const loadOverview = useCallback(async () => {
    const [courseResult, wordResult] = await Promise.all([
      api("/vocabulary/courses", { token: session.token }), api("/vocabulary/words", { token: session.token }),
    ]);
    setCourses(courseResult.courses); setAllWords(wordResult.words);
    setCourseId((previous) => courseResult.courses.some((course) => course.id === previous) ? previous : courseResult.courses[0]?.id || null);
    setShowSetup(courseResult.courses.length === 0);
  }, [session.token]);

  const loadLessons = useCallback(async (id, preferredId) => {
    const result = await api(`/vocabulary/courses/${id}/lessons`, { token: session.token });
    if (currentCourseRef.current !== id) return;
    setLessons(result.lessons);
    setLessonId((previous) => {
      const requested = preferredId || previous;
      return result.lessons.some((lesson) => lesson.id === requested) ? requested : result.lessons[0]?.id || null;
    });
  }, [session.token]);

  useEffect(() => { loadOverview().catch((cause) => setError(errorText(cause))); }, [loadOverview]);
  useEffect(() => {
    currentCourseRef.current = courseId;
    if (courseId) { setLessons([]); setLessonId(null); loadLessons(courseId).catch((cause) => setError(errorText(cause))); }
    else { setLessons([]); setLessonId(null); }
  }, [courseId, loadLessons]);

  async function createCourse(event) {
    event.preventDefault(); setBusy("course"); setError("");
    try {
      const result = await api("/vocabulary/courses", { method: "POST", token: session.token,
        body: { nativeLanguage, targetLanguage } });
      await loadOverview(); setCourseId(result.course.id); setShowSetup(false); setNotice("");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function createTopic(event) {
    event.preventDefault(); if (!activeCourse) return;
    setBusy("topic"); setError("");
    try {
      const result = await api(`/vocabulary/courses/${courseId}/lessons`, { method: "POST", token: session.token, body: { topic } });
      setTopic(""); await loadLessons(courseId, result.lesson.id); setNotice("");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function addCard(event) {
    event.preventDefault(); if (!activeLesson) return;
    setBusy("card"); setError(""); setNotice("");
    try {
      await api(`/vocabulary/courses/${courseId}/lessons/${lessonId}/words`, { method: "POST", token: session.token,
        body: manual ? card : { term: card.term } });
      setCard(emptyCard); await loadLessons(courseId, lessonId);
    } catch (cause) {
      setError(errorText(cause));
      if (!manual && ["AI_UNAVAILABLE", "AI_INVALID_RESPONSE", "AI_NOT_CONFIGURED", "AI_DAILY_LIMIT"].includes(cause.code)) setManual(true);
    } finally { setBusy(""); }
  }

  async function toggleDifficult(word) {
    setError("");
    try {
      await api(`/vocabulary/words/${word.id}`, { method: "PATCH", token: session.token, body: { difficult: !word.difficult } });
      await loadLessons(courseId, lessonId);
    } catch (cause) { setError(errorText(cause)); }
  }

  async function compileBook() {
    setBusy("compile"); setError("");
    try {
      const result = await api(`/vocabulary/courses/${courseId}/compile`, { method: "POST", token: session.token, body: {} });
      window.location.hash = `/books/${result.book.id}`;
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  return <div className="page-enter vocabulary-page vocab-learning-page">
    <section className="vocab-hero">
      <div><span className="eyebrow"><Sparkles size={15} /> {t("vocabEyebrow")}</span><h1>{t("vocabTitle")}</h1><p>{t("vocabIntro")}</p>
        <div className="vocab-hero-actions"><Button variant="secondary" onClick={() => window.location.hash = "/books"}><BookOpen size={17} /> {t("openBooks")}</Button>
          {activeCourse && courseWords.length ? <Button onClick={compileBook} loading={busy === "compile"}><BookMarked size={17} /> {t("compileBook")}</Button> : null}</div></div>
      <div className="vocab-hero-art" aria-hidden="true"><div className="vocab-art-book art-back" /><div className="vocab-art-book art-front"><Languages size={45} /><span>A · Б · أ</span></div></div>
    </section>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {notice ? <p className="vocab-notice" role="status">{notice}</p> : null}

    {courses.length ? <section className="vocab-course-section"><div className="vocab-section-title"><div><span className="eyebrow">01 / {t("myLanguageBooks")}</span><h2>{t("myLanguageBooks")}</h2></div>
      <Button variant="ghost" onClick={() => setShowSetup(!showSetup)}><Plus size={16} /> {t("newLanguageBook")}</Button></div>
      <div className="vocab-course-list">{courses.map((course) => <button type="button" key={course.id} className={`vocab-course-tile ${course.id === courseId ? "active" : ""}`} onClick={() => { setCourseId(course.id); setError(""); }}>
        <span className="vocab-course-symbol"><BookMarked size={24} /></span><span><strong>{name(course.targetLanguage)}</strong><small>{name(course.nativeLanguage)} → {name(course.targetLanguage)}</small></span><ArrowRight size={17} /></button>)}</div></section> : null}

    {showSetup ? <Panel className="vocab-setup"><div className="vocab-section-title"><div><span className="eyebrow">{courses.length ? "+" : "01"} / {t("newLanguageBook")}</span><h2>{t("startBook")}</h2><p>{t("vocabIntro")}</p></div><Languages size={28} /></div>
      <form onSubmit={createCourse} className="vocab-setup-form"><Select label={t("nativeLanguage")} value={nativeLanguage} onChange={(event) => setNativeLanguage(event.target.value)}>
        {vocabularyLanguages.map((language) => <option key={language.code} value={language.code}>{name(language.code)}</option>)}</Select>
        <Select label={t("targetLanguage")} value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
          {vocabularyLanguages.map((language) => <option key={language.code} value={language.code}>{name(language.code)}</option>)}</Select>
        <Button type="submit" disabled={nativeLanguage === targetLanguage} loading={busy === "course"}>{t("startBook")} <ArrowRight size={17} /></Button></form></Panel> : null}

    {activeCourse ? <div className="vocab-workspace">
      <section className="vocab-workspace-main">
        <Panel className="vocab-today"><div className="vocab-section-title"><div><span className="eyebrow"><CalendarDays size={15} /> {t("todayTopic")}</span><h2>{todayLesson ? todayLesson.topic : t("createTopic")}</h2>
          <p>{todayLesson ? t("topicExists") : t("noTopics")}</p></div><span className="vocab-date">{tashkentDay()}</span></div>
          {!todayLesson ? <form className="vocab-topic-form" onSubmit={createTopic}><Field label={t("todayTopic")} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={t("topicPlaceholder")} minLength={2} maxLength={100} required />
            <Button type="submit" loading={busy === "topic"}><Plus size={16} /> {t("createTopic")}</Button></form> : null}</Panel>

        {activeLesson ? <><Panel className="vocab-add-panel"><div className="vocab-section-title"><div><span className="eyebrow">02 / {activeLesson.day}</span><h2>{activeLesson.topic}</h2><p>{manual ? t("manualHint") : t("aiHint")}</p></div><Badge tone="teal">{t("cardCount", { count: activeLesson.words.length })}</Badge></div>
          <div className="vocab-entry-switch"><button type="button" className={!manual ? "active" : ""} onClick={() => setManual(false)}><Sparkles size={15} /> {t("aiEntry")}</button>
            <button type="button" className={manual ? "active" : ""} onClick={() => setManual(true)}>{t("manualEntry")}</button></div>
          <form className="vocab-card-form" onSubmit={addCard}><Field label={t("addWord")} value={card.term} onChange={(event) => setCard({ ...card, term: event.target.value })} placeholder={t("wordPlaceholder")} maxLength={120} required />
            {manual ? <div className="vocab-manual-fields"><Field label={t("meaning")} value={card.meaning} onChange={(event) => setCard({ ...card, meaning: event.target.value })} maxLength={300} required />
              <Field label={t("pronunciation")} value={card.pronunciation} onChange={(event) => setCard({ ...card, pronunciation: event.target.value })} maxLength={180} />
              <Field label={t("example")} value={card.example} onChange={(event) => setCard({ ...card, example: event.target.value })} maxLength={500} />
              <Field label={t("exampleTranslation")} value={card.exampleTranslation} onChange={(event) => setCard({ ...card, exampleTranslation: event.target.value })} maxLength={500} />
              <Field label={t("forms")} value={card.forms} onChange={(event) => setCard({ ...card, forms: event.target.value })} maxLength={500} /></div> : null}
            <Button type="submit" loading={busy === "card"}><Plus size={16} /> {manual ? t("saveCard") : t("createAiCard")}</Button></form></Panel>

          <div className="vocab-section-title"><div><span className="eyebrow">03 / {t("words")}</span><h2>{t("cardCount", { count: activeLesson.words.length })}</h2></div></div>
          {activeLesson.words.length ? <div className="vocab-card-grid">{activeLesson.words.map((word, index) => <article className="vocab-learning-card" key={word.id}>
            <div className="vocab-card-top"><span>{String(index + 1).padStart(2, "0")}</span>{word.difficult ? <Badge tone="gold">{t("difficult")}</Badge> : null}</div>
            <h3>{word.term}</h3>{word.pronunciation ? <p className="vocab-pronunciation"><button type="button" aria-label={`${word.term} ${t("pronunciation")}`} onClick={() => { if ("speechSynthesis" in window) { const utterance = new SpeechSynthesisUtterance(word.term); utterance.lang = activeCourse.targetLanguage; window.speechSynthesis.speak(utterance); } }}><Volume2 size={15} /></button> {word.pronunciation}</p> : null}
            <strong className="vocab-meaning">{word.meaning}</strong>{word.forms ? <p className="vocab-forms">{word.forms}</p> : null}
            {(word.examples?.length ? word.examples : word.example ? [{ target: word.example, native: word.exampleTranslation }] : []).map((example, exampleIndex) => <blockquote key={exampleIndex}>
              <span>{example.target}</span>{example.native ? <small>{example.native}</small> : null}</blockquote>)}
            <button className="vocab-difficulty" type="button" onClick={() => toggleDifficult(word)}>{word.difficult ? <Check size={15} /> : <Plus size={15} />}{word.difficult ? t("markEasy") : t("markDifficult")}</button>
          </article>)}</div> : <p className="vocab-empty-cards">{t("emptyLesson")}</p>}</> : <Panel className="vocab-empty-panel"><BookOpen size={28} /><h2>{t("chooseTopic")}</h2><p>{t("noTopics")}</p></Panel>}
      </section>
      <aside className="vocab-workspace-aside"><Panel className="vocab-timeline"><div className="vocab-section-title"><div><span className="eyebrow">{activeCourse.title}</span><h2>{t("lessons")}</h2></div><span>{lessons.length}</span></div>
        {lessons.length ? <div className="vocab-lesson-list">{lessons.map((lesson, index) => <button type="button" key={lesson.id} className={lesson.id === lessonId ? "active" : ""} onClick={() => setLessonId(lesson.id)}>
          <span>{String(lessons.length - index).padStart(2, "0")}</span><span><strong>{lesson.topic}</strong><small>{lesson.day} · {t("cardCount", { count: lesson.words.length })}</small></span><ArrowRight size={16} /></button>)}</div> : <p>{t("noTopics")}</p>}
        <div className="vocab-timeline-footer"><span>{t("bookProgress", { lessons: lessons.length, words: courseWords.length })}</span>
          <Button variant="secondary" onClick={compileBook} loading={busy === "compile"} disabled={!courseWords.length}><BookMarked size={16} /> {t("compileBook")}</Button></div></Panel></aside>
    </div> : null}

    {courseWords.length ? <VocabularyReview words={courseWords} token={session.token} onReviewed={(word) => setLessons((previous) => previous.map((lesson) => ({ ...lesson, words: lesson.words.map((item) => item.id === word.id ? word : item) })))} onError={setError} /> : null}
    {legacyWords.length ? <Panel className="vocab-legacy"><div><strong>{t("legacyWords")}: {legacyWords.length}</strong><p>{t("legacyHint")}</p></div><Button variant="secondary" onClick={() => window.location.hash = "/vocabulary-legacy"}>{t("openLegacy")} <ArrowRight size={16} /></Button></Panel> : null}
  </div>;
}
