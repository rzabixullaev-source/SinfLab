import { useEffect, useState } from "react";
import { Gamepad2, Trophy } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button, Field, Panel, SectionHeading } from "../../components/ui.jsx";
import "./games.css";

export default function GamesTab({ room, session }) {
  const [mode, setMode] = useState("choice");
  const [challenge, setChallenge] = useState(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = `/classrooms/${room.id}/games`;

  async function load(nextMode = mode) {
    setError(""); setResult(null); setAnswer("");
    try {
      const [item, scores] = await Promise.all([
        room.role === "student" ? api(`${root}/challenge?mode=${nextMode}`, { token: session.token }) : Promise.resolve({ challenge: null }),
        api(`${root}/leaderboard`, { token: session.token }),
      ]);
      setChallenge(item.challenge); setBoard(scores.leaderboard);
    } catch (cause) { setError(errorText(cause)); }
  }
  useEffect(() => { load(); }, [room.id, session.token, mode]);

  async function submit(value) {
    if (!challenge) return;
    setBusy(true); setError("");
    try {
      const response = await api(`${root}/answer`, { method: "POST", token: session.token, body: { quizId: challenge.quizId, questionIndex: challenge.questionIndex, mode, answer: value } });
      setResult(response);
      const scores = await api(`${root}/leaderboard`, { token: session.token });
      setBoard(scores.leaderboard);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  return <div className="module-page page-enter"><SectionHeading eyebrow="BILIM O‘YINLARI" title="O‘ynab o‘rganing" description="Savollar ustoz e’lon qilgan testlardan olinadi. Reyting faqat shu sinf o‘quvchilariga tegishli." />
    {room.role === "student" ? <><div className="game-modes"><Button variant={mode === "choice" ? "primary" : "secondary"} onClick={() => setMode("choice")}><Gamepad2 size={16} /> Tezkor tanlov</Button><Button variant={mode === "fill" ? "primary" : "secondary"} onClick={() => setMode("fill")}>Javobni toping</Button></div>
    <Panel className="game-challenge">{challenge ? <><Badge tone="gold">{challenge.title}</Badge><h2>{challenge.prompt}</h2>{mode === "choice" ? <div className="game-choices">{challenge.choices.map((choice, index) => <Button key={index} variant="secondary" disabled={busy || !!result} onClick={() => submit(index)}>{choice}</Button>)}</div> : <form onSubmit={(event) => { event.preventDefault(); submit(answer); }}><p>Yordam: {challenge.hint}</p><Field label="Javob" value={answer} onChange={(event) => setAnswer(event.target.value)} required /><Button type="submit" disabled={busy || !!result}>Tekshirish</Button></form>}{result ? <div className="game-result"><strong>{result.correct ? `To‘g‘ri! +${result.score} ball` : "Yana o‘rganib ko‘ring"}</strong><p>To‘g‘ri javob: {result.correctAnswer}</p><Button onClick={() => load()}>Keyingi savol</Button></div> : null}</> : <div><h2>Bu usuldagi savollar tugadi</h2><p>Yangi savollar uchun ustoz e’lon qilgan testlarni kuting.</p></div>}</Panel></> : <Panel><p>O‘yin savollari siz e’lon qilgan testlardan olinadi. O‘quvchilar shu yerda mashq qiladi.</p></Panel>}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <Panel className="game-leaderboard"><h2><Trophy size={21} /> Sinf reytingi</h2>{board.map((item, index) => <div key={item.userId}><span>{index + 1}. {item.displayName}</span><strong>{item.score} ball</strong></div>)}</Panel>
  </div>;
}
