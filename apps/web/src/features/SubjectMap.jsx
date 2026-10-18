import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Compass, Gamepad2, MapPinned } from "lucide-react";
import { api, errorText } from "../lib/api.js";
import { Badge, Button, Panel, SectionHeading } from "../components/ui.jsx";
import { buildLearningPath, mapTowns } from "./subject-map.js";
import { subjectResources, subjectGames } from "./subject-resources.js";
import TownScene from "./TownScene.jsx";
import "./subject-map.css";

export default function SubjectMap({ rooms, session, onOpenRoom }) {
  const towns = mapTowns(rooms.filter((room) => room.mode === "course"));
  const [selected, setSelected] = useState("math");
  const [roomId, setRoomId] = useState(null);
  const [path, setPath] = useState([]);
  const [pathError, setPathError] = useState("");
  const [answers, setAnswers] = useState({});
  const active = towns.find((town) => town.id === selected) || towns[0];
  const room = active.rooms.find((item) => item.id === roomId) || active.rooms[0];

  useEffect(() => {
    if (!room || !session?.token) { setPath([]); return; }
    let current = true;
    setPathError("");
    const routes = ["lessons", "assignments", "quizzes", "labs", ...(room.role === "student" ? ["my-progress"] : [])];
    Promise.all(routes.map((route) => api(`/classrooms/${room.id}/${route}`, { token: session.token })))
      .then(([lessons, assignments, quizzes, labs, progress]) => {
        if (current) setPath(buildLearningPath({ lessons: lessons.lessons, assignments: assignments.assignments, quizzes: quizzes.quizzes, labs: labs.labs, progress: progress?.progress || {} }));
      }).catch((cause) => { if (current) setPathError(errorText(cause)); });
    return () => { current = false; };
  }, [room?.id, room?.role, session?.token]);

  return <section className="subject-map-section" aria-label="Fanlar xaritasi">
    <SectionHeading eyebrow="FANLAR OLAMI" title="Fanlar xaritasi" description="Umumiy darslar va o‘yinlar hamma uchun ochiq. Faqat foydalanuvchilar yaratgan sinflarga taklif kerak." />
    <div className="subject-map" role="group" aria-label="Fan shaharchalari">{towns.map((town) => <button key={town.id} type="button" className={`subject-town town-${town.theme} ${active.id === town.id ? "selected" : ""}`} onClick={() => { setSelected(town.id); setRoomId(null); }} aria-pressed={active.id === town.id}>
      <TownScene theme={town.theme} /><span className="town-info"><span className="town-symbol" aria-hidden="true">{town.icon}</span><span><strong>{town.name}</strong><small>{town.tagline}</small></span><span className="town-count">Ochiq fan</span></span>
    </button>)}</div>
    <div className={`town-world town-${active.theme}`}>
      <div className="town-world-hero"><TownScene theme={active.theme} /><div className="town-world-copy"><span className="eyebrow"><MapPinned size={15} /> UMUMIY FAN</span><h3>{active.name}</h3><p>{active.tagline}. Kod kiritmasdan o‘rganing va o‘ynang.</p><Badge tone="teal">HAMMA UCHUN OCHIQ</Badge></div></div>
      {subjectResources[active.id]?.length ? <section className="town-resources"><div className="town-route-heading"><div><span className="eyebrow">SINF LAB MANBALARI</span><h4>Qisqa darslar</h4><p>Mavzuni o‘qing, misolni ko‘ring va mashqni yeching.</p></div><Badge tone="teal">{subjectResources[active.id].length} MAVZU</Badge></div><div className="town-resource-grid">{subjectResources[active.id].map((resource, index) => <details key={resource.title} className="town-resource-card"><summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{resource.title}</strong><ArrowRight size={17} /></summary><p>{resource.summary}</p><div><small>MISOL</small><p>{resource.example}</p></div><div><small>MASHQ</small><p>{resource.task}</p></div><details><summary>Javobni ko‘rish</summary><p>{resource.answer}</p></details></details>)}</div></section> : null}
      {subjectGames[active.id]?.length ? <section className="town-public-games"><div className="town-route-heading"><div><span className="eyebrow"><Gamepad2 size={15} /> O‘YIN VA MASHQLAR</span><h4>Bilimingizni sinang</h4><p>Javobni tanlang va darhol izohini ko‘ring.</p></div><Badge tone="teal">{subjectGames[active.id].length} SAVOL</Badge></div><div className="town-game-grid">{subjectGames[active.id].map((game, index) => { const key = `${active.id}:${index}`; const answer = answers[key]; return <article className="town-game-card" key={key}><small>{index + 1}-savol</small><strong>{game.question}</strong><div className="town-game-options">{game.options.map((option, optionIndex) => <button type="button" key={option} className={answer === optionIndex ? (answer === game.answer ? "correct" : "wrong") : ""} onClick={() => setAnswers((previous) => ({ ...previous, [key]: optionIndex }))}>{option}</button>)}</div>{answer !== undefined ? <p role="status">{answer === game.answer ? "To‘g‘ri!" : `To‘g‘ri javob: ${game.options[game.answer]}.`} {game.explanation}</p> : null}</article>; })}</div></section> : null}
      {active.rooms.length ? <section className="town-world-content"><div className="town-classroom-picker"><span className="eyebrow"><Compass size={15} /> SIZNING SINFLARINGIZ</span><div>{active.rooms.map((item) => <button type="button" key={item.id} className={room?.id === item.id ? "active" : ""} onClick={() => setRoomId(item.id)} aria-pressed={room?.id === item.id}>{item.name}<ArrowRight size={15} /></button>)}</div></div>{room ? <><div className="town-route-heading"><div><span className="eyebrow">O‘QUV YO‘LI</span><h4>{room.name}</h4></div><Button onClick={() => onOpenRoom(room.id)}>Sinfga kirish <ArrowRight size={16} /></Button></div>{pathError ? <Panel><p role="alert">{pathError}</p></Panel> : path.length ? <ol className="town-path">{path.map((step, index) => <li key={`${step.kind}-${step.id}`}><button type="button" onClick={() => onOpenRoom(room.id, step.tab)}><span className="path-number">{String(index + 1).padStart(2, "0")}</span><span className="path-icon"><BookOpen size={18} /></span><span className="path-copy"><small>{step.kind}</small><strong>{step.title}</strong></span><ArrowRight size={16} /></button></li>)}</ol> : <Panel className="town-path-empty"><BookOpen size={24} /><p>Bu sinfda hali dars joylanmagan.</p></Panel>}</> : null}</section> : null}
    </div>
  </section>;
}
