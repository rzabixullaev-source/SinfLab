import { useState } from "react";
import { BookOpen, RotateCcw } from "lucide-react";
import { api, errorText } from "../lib/api.js";
import { Badge, Button, Panel } from "../components/ui.jsx";
import { useSettings } from "../lib/settings.jsx";

const grades = ["again", "hard", "good", "easy"];

export default function VocabularyReview({ words, token, onReviewed, onError }) {
  const { t } = useSettings();
  const [reviewedIds, setReviewedIds] = useState([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const due = words.filter((word) => (!word.reviewDueAt || +new Date(word.reviewDueAt) <= Date.now()) && !reviewedIds.includes(word.id));
  const word = due.length ? due[index % due.length] : null;

  async function grade(value) {
    if (!word || busy) return;
    setBusy(true);
    try {
      const result = await api(`/vocabulary/words/${word.id}/review`, { method: "POST", token, body: { grade: value } });
      onReviewed(result.word);
      setAttemptCount((previous) => previous + 1);
      if (value !== "again") setReviewedIds((previous) => [...previous, word.id]);
      setRevealed(false); setIndex(value === "again" ? index + 1 : 0);
    } catch (cause) { onError(errorText(cause)); }
    finally { setBusy(false); }
  }

  return <Panel className="review-panel">
    <div className="review-header"><div><span className="eyebrow"><RotateCcw size={15} /> {t("reviewCards")}</span><h2>{t("rememberWords")}</h2><p>{t("reviewReady", { count: due.length })}</p></div><Badge tone="teal">{t("answers", { count: attemptCount })}</Badge></div>
    {word ? <div className="review-card"><div className="review-card-front"><span>{word.language} · {word.reviewCount ? t("seenTimes", { count: word.reviewCount }) : t("newWord")}</span><strong>{word.term}</strong><button type="button" onClick={() => { setIndex((previous) => previous + 1); setRevealed(false); }}>{t("nextWord")}</button></div>
      {revealed ? <div className="review-card-answer"><strong>{word.meaning}</strong>{word.forms ? <p>{t("forms")}: {word.forms}</p> : null}{word.example ? <p>{t("example")}: {word.example}</p> : null}<div className="review-grades">{grades.map((value) => <button key={value} type="button" disabled={busy} onClick={() => grade(value)}>{t(value)}</button>)}</div></div> : <Button onClick={() => setRevealed(true)}>{t("seeAnswer")}</Button>}</div>
      : <div className="review-complete"><BookOpen size={27} /><strong>{t("noReview")}</strong><p>{t("noReviewHint")}</p></div>}
  </Panel>;
}
