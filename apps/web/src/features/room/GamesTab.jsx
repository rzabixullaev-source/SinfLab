import { useEffect, useRef, useState } from "react";
import { Binary, BookOpen, Gamepad2, Hash, Languages, Lightbulb, ListChecks, Trophy } from "lucide-react";
import { gameModesForSubject } from "@sinflab/contracts/game-modes";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button, Field, Panel, SectionHeading } from "../../components/ui.jsx";
import { townForSubject } from "../subject-map.js";
import "./games.css";

const modes = {
  choice: { label: "Tezkor tanlov", description: "Variantlardan to‘g‘risini toping", icon: ListChecks },
  fill: { label: "Javobni toping", description: "Eslab, o‘zingiz yozing", icon: Gamepad2 },
  scramble: { label: "So‘z tuzing", description: "Harflarni tartiblang", icon: Languages },
  numeric: { label: "Hisoblang", description: "Sonli javobni kiriting", icon: Hash },
  truefalse: { label: "Fikrni tekshiring", description: "Dalil to‘g‘rimi?", icon: Binary },
};

export default function GamesTab({ room, session, onNavigate }) {
  const available = gameModesForSubject(room.subject || room.name);
  const subject = townForSubject(room.subject || room.name);
  const [mode, setMode] = useState("choice");
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadId = useRef(0);
  const root = `/classrooms/${room.id}/games`;

  async function load(nextMode = mode) {
    const current = ++loadId.current;
    setLoading(true); setError(""); setChallenge(null); setResult(null); setAnswer("");
    try {
      const [item, scores] = await Promise.all([
        room.role === "student" ? api(`${root}/challenge?mode=${nextMode}`, { token: session.token }) : Promise.resolve({ challenge: null }),
        api(`${root}/leaderboard`, { token: session.token }),
      ]);
      if (current === loadId.current) { setChallenge(item.challenge); setBoard(scores.leaderboard); }
    } catch (cause) { if (current === loadId.current) setError(errorText(cause)); }
    finally { if (current === loadId.current) setLoading(false); }
  }
  useEffect(() => { load(); return () => { loadId.current++; }; }, [room.id, session.token, mode]);

  async function submit(value) {
    if (!challenge || busy || result) return;
    setBusy(true); setError("");
    try {
      const response = await api(`${root}/answer`, { method: "POST", token: session.token, body: { quizId: challenge.quizId, questionIndex: challenge.questionIndex, mode, answer: value } });
      setResult(response);
      const scores = await api(`${root}/leaderboard`, { token: session.token });
      setBoard(scores.leaderboard);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  return <div className={`module-page page-enter game-page game-subject-${subject}`}>
    <SectionHeading eyebrow="BILIM O‘YINLARI" title="O‘ynab o‘rganing" description="Savollar ustoz e’lon qilgan testlardan olinadi. Reyting faqat shu sinf o‘quvchilariga tegishli." />
    {room.role === "student" ? <>
      <div className="game-modes" role="group" aria-label="O‘yin usulini tanlash">{available.map((item) => { const Icon = modes[item].icon; return <button key={item} type="button" className={mode === item ? "active" : ""} aria-pressed={mode === item} onClick={() => setMode(item)}><Icon size={20} /><span><strong>{modes[item].label}</strong><small>{modes[item].description}</small></span></button>; })}</div>
      <Panel className="game-challenge"><div className="game-challenge-top"><span className="eyebrow"><Gamepad2 size={15} /> {modes[mode].label.toUpperCase()}</span><span>{modes[mode].description}</span></div>
        {loading ? <p>O‘yin savoli yuklanmoqda...</p> : challenge ? <><Badge tone="gold">{challenge.title}</Badge><h2>{challenge.prompt}</h2>
          {mode === "choice" ? <div className="game-choices">{challenge.choices.map((choice, index) => <Button key={index} variant="secondary" disabled={busy || !!result} onClick={() => submit(index)}>{choice}</Button>)}</div> : null}
          {mode === "truefalse" ? <div className="game-statement"><strong>{challenge.statement}</strong><p>Bu fikr to‘g‘rimi?</p><div><Button disabled={busy || !!result} onClick={() => submit(true)}>Ha, to‘g‘ri</Button><Button variant="secondary" disabled={busy || !!result} onClick={() => submit(false)}>Yo‘q, xato</Button></div></div> : null}
          {["fill", "scramble", "numeric"].includes(mode) ? <form onSubmit={(event) => { event.preventDefault(); submit(answer); }}>
            {mode === "fill" ? <p>Yordam: {challenge.hint}</p> : null}
            {mode === "scramble" ? <div className="game-scramble" aria-label="Aralash harflar">{[...challenge.scrambled].map((letter, index) => <span key={index}>{letter}</span>)}</div> : null}
            {mode === "numeric" ? <p>Faqat sonni kiriting. Kasr uchun vergul yoki nuqta ishlatish mumkin.</p> : null}
            <Field label={mode === "numeric" ? "Hisob natijasi" : "Javob"} value={answer} onChange={(event) => setAnswer(event.target.value)} required disabled={busy || !!result} /><Button type="submit" disabled={busy || !!result}>Tekshirish</Button>
          </form> : null}
          {result ? <div className={`game-result ${result.correct ? "correct" : "incorrect"}`}><strong>{result.correct ? `To‘g‘ri! +${result.score} ball` : "Bu safar xato"}</strong><p>To‘g‘ri javob: <b>{result.correctAnswer}</b></p><div className="game-learning-note"><Lightbulb size={19} /><div><strong>Mavzu izohi</strong><p>{result.explanation || "Ustoz bu savolga hali izoh qo‘shmagan. Mavzuni darsda qayta ko‘ring."}</p></div></div><div className="game-result-actions"><Button onClick={() => load()}>Keyingi savol</Button>{result.lessonId && onNavigate ? <Button variant="secondary" onClick={() => onNavigate("lessons")}><BookOpen size={16} /> Darslar bo‘limi</Button> : null}</div></div> : null}
        </> : <div className="game-empty"><h2>Bu usulda hozir savol yo‘q</h2><p>Ustoz yangi test e’lon qilganda yoki shu usulga mos savol qo‘shganda bu yerda paydo bo‘ladi.</p></div>}
      </Panel>
    </> : <Panel><p>O‘yin savollari siz e’lon qilgan testlardan olinadi. Savolga izoh yozsangiz, o‘quvchi javobidan keyin uni ko‘radi.</p></Panel>}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <Panel className="game-leaderboard"><h2><Trophy size={21} /> Sinf reytingi</h2>{board.map((item, index) => <div key={item.userId} className={item.userId === session.user.id ? "current" : ""}><span><b>{index + 1}</b> {item.displayName}</span><strong>{item.score} ball</strong></div>)}</Panel>
  </div>;
}
