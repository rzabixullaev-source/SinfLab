import { useState } from "react";
import { BookOpen, RotateCcw } from "lucide-react";
import { api, errorText } from "../lib/api.js";
import { Badge, Button, Panel } from "../components/ui.jsx";

const grades = [
  ["again", "Yana ko‘raman"],
  ["hard", "Qiyin"],
  ["good", "Yaxshi"],
  ["easy", "Oson"],
];

export default function VocabularyReview({ words, token, onReviewed, onError }) {
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
    <div className="review-header"><div><span className="eyebrow"><RotateCcw size={15} /> TAKRORLASH KARTALARI</span><h2>So‘zlarni eslab qoling</h2><p>{due.length} ta so‘z takrorlashga tayyor. Avval so‘zni o‘ylang, keyin javobni oching.</p></div><Badge tone="teal">{attemptCount} ta javob</Badge></div>
    {word ? <div className="review-card"><div className="review-card-front"><span>{word.language} · {word.reviewCount ? `${word.reviewCount} marta ko‘rilgan` : "Yangi so‘z"}</span><strong>{word.term}</strong><button type="button" onClick={() => { setIndex((previous) => previous + 1); setRevealed(false); }}>Keyingi so‘z →</button></div>
      {revealed ? <div className="review-card-answer"><strong>{word.meaning}</strong>{word.forms ? <p>Shakllari: {word.forms}</p> : null}{word.example ? <p>Misol: {word.example}</p> : null}<div className="review-grades">{grades.map(([value, label]) => <button key={value} type="button" disabled={busy} onClick={() => grade(value)}>{label}</button>)}</div></div> : <Button onClick={() => setRevealed(true)}>Javobni ko‘rish</Button>}</div>
      : <div className="review-complete"><BookOpen size={27} /><strong>Hozircha takrorlanadigan so‘z yo‘q</strong><p>Yangi so‘z qo‘shing yoki keyingi takrorlash vaqtini kuting.</p></div>}
  </Panel>;
}
