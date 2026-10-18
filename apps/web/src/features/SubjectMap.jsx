import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, ClipboardList, Compass, FlaskConical, Gamepad2, MapPinned, RotateCcw, Sparkles } from "lucide-react";
import { api, errorText } from "../lib/api.js";
import { Badge, Button, Panel, SectionHeading } from "../components/ui.jsx";
import { buildLearningPath, mapTowns } from "./subject-map.js";
import { subjectResources } from "./subject-resources.js";
import TownScene from "./TownScene.jsx";
import "./subject-map.css";

const stepLabels = { lesson: "Dars", assignment: "Vazifa", quiz: "Test", lab: "Laboratoriya" };
const states = { upcoming: "Rejada", available: "Tayyor", todo: "Bajarish kerak", done: "Topshirilgan", review: "Qayta ko‘rish" };
const icons = { lesson: BookOpen, assignment: ClipboardList, quiz: CheckCircle2, lab: FlaskConical };

export default function SubjectMap({ rooms, session, onOpenRoom, onJoin }) {
  const towns = mapTowns(rooms);
  const [selected, setSelected] = useState(() => towns.find((town) => town.rooms.length)?.id || "math");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [pathData, setPathData] = useState(null);
  const [pathError, setPathError] = useState("");
  const active = towns.find((town) => town.id === selected) || towns[0];
  const room = active?.rooms.find((item) => item.id === selectedRoomId) || active?.rooms[0];

  useEffect(() => {
    if (!room || !session?.token) { setPathData(null); return; }
    let current = true;
    const prefix = `/classrooms/${room.id}`;
    setPathData(null); setPathError("");
    Promise.all(["lessons", "assignments", "quizzes", "labs", "my-progress"].map((route) => api(`${prefix}/${route}`, { token: session.token })))
      .then(([lessons, assignments, quizzes, labs, progress]) => {
        if (current) setPathData({ lessons: lessons.lessons, assignments: assignments.assignments, quizzes: quizzes.quizzes, labs: labs.labs, progress: progress.progress });
      })
      .catch((cause) => { if (current) setPathError(errorText(cause)); });
    return () => { current = false; };
  }, [room?.id, session?.token]);

  const path = pathData ? buildLearningPath(pathData) : [];
  const pending = path.filter((item) => item.state === "todo" || item.state === "review").length;
  return <section className="subject-map-section" aria-label="Fanlar xaritasi">
    <SectionHeading eyebrow="FANLAR OLAMI" title="O‘zingizga qiziq fan shaharchasini tanlang" description="Shaharchaga kiring, sinfni tanlang va shu fandagi o‘quv yo‘lingizni davom ettiring." />
    <div className="subject-map" role="group" aria-label="Fan shaharchalari">{towns.map((town) => <button key={town.id} type="button" className={`subject-town town-${town.theme} ${active?.id === town.id ? "selected" : ""}`} onClick={() => { setSelected(town.id); setSelectedRoomId(null); }} aria-pressed={active?.id === town.id}>
      <TownScene theme={town.theme} />
      <span className="town-info"><span className="town-symbol" aria-hidden="true">{town.icon}</span><span><strong>{town.name}</strong><small>{town.tagline}</small></span><span className="town-count">{town.rooms.length} sinf</span></span>
    </button>)}</div>
    {active ? <div className={`town-world town-${active.theme}`}>
      <div className="town-world-hero"><TownScene theme={active.theme} /><div className="town-world-copy"><span className="eyebrow"><MapPinned size={15} /> FAN SHAHARCHASI</span><h3>{active.name}</h3><p>{active.tagline}. {active.rooms.length ? "O‘quv yo‘lingiz shu yerdan davom etadi." : "Hozircha bu fanda sinfingiz yo‘q."}</p><Badge tone="teal">{active.rooms.length} TA SINF</Badge></div></div>
      {subjectResources[active.id]?.length ? <section className="town-resources"><div className="town-route-heading"><div><span className="eyebrow">SINF LAB MANBALARI</span><h4>O‘zingiz mustaqil o‘rganing</h4><p>Qisqa tushuntirish, misol va o‘zingizni tekshirish savoli.</p></div><Badge tone="teal">{subjectResources[active.id].length} MAVZU</Badge></div><div className="town-resource-grid">{subjectResources[active.id].map((resource, index) => <details key={resource.title} className="town-resource-card"><summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{resource.title}</strong><ArrowRight size={17} /></summary><p>{resource.summary}</p><div><small>MISOL</small><p>{resource.example}</p></div><div><small>MASHQ</small><p>{resource.task}</p></div><details><summary>Javobni ko‘rish</summary><p>{resource.answer}</p></details></details>)}</div></section> : null}
      {active.rooms.length ? <div className="town-world-content"><div className="town-classroom-picker"><span className="eyebrow"><Compass size={15} /> SINFNI TANLANG</span><div>{active.rooms.map((item) => <button type="button" key={item.id} className={room?.id === item.id ? "active" : ""} onClick={() => setSelectedRoomId(item.id)} aria-pressed={room?.id === item.id}>{item.name}<ArrowRight size={15} /></button>)}</div></div>
        {room ? <><div className="town-route-heading"><div><span className="eyebrow">O‘QUV YO‘LI</span><h4>{room.name}</h4><p>Dars va mashqlar ustoz joylagan tartibda ko‘rsatiladi.</p></div><Button onClick={() => onOpenRoom(room.id)}><ArrowRight size={16} /> Sinfga kirish</Button></div>
          {pathError ? <Panel><p role="alert">{pathError}</p><Button variant="secondary" onClick={() => onOpenRoom(room.id)}>Sinfda ko‘rish</Button></Panel> : !pathData ? <Panel className="town-path-loading"><Clock3 size={18} /> O‘quv yo‘li yuklanmoqda...</Panel> : path.length ? <><div className="town-route-summary"><span><BookOpen size={16} /> {path.filter((item) => item.kind === "lesson").length} dars</span><span><ClipboardList size={16} /> {pending} navbatdagi ish</span><span><Sparkles size={16} /> {path.length} qadam</span></div><ol className="town-path">{path.map((step, index) => { const Icon = icons[step.kind]; return <li key={`${step.kind}-${step.id}`} className={`path-${step.state}`}><button type="button" onClick={() => onOpenRoom(room.id, step.tab)}><span className="path-number">{String(index + 1).padStart(2, "0")}</span><span className="path-icon"><Icon size={20} /></span><span className="path-copy"><small>{stepLabels[step.kind]}</small><strong>{step.title}</strong></span><span className="path-state">{step.state === "review" ? <RotateCcw size={14} /> : null}{states[step.state]}</span><ArrowRight className="path-arrow" size={18} /></button></li>; })}</ol></> : <Panel className="town-path-empty"><BookOpen size={25} /><strong>O‘quv yo‘li hali boshlanmagan</strong><p>Ustoz dars yoki mashq qo‘shganda bu yerda qadamlar paydo bo‘ladi.</p></Panel>}
          <div className="town-shortcuts"><button type="button" onClick={() => onOpenRoom(room.id, "labs")}><FlaskConical size={18} /> Laboratoriya <ArrowRight size={15} /></button><button type="button" onClick={() => onOpenRoom(room.id, "games")}><Gamepad2 size={18} /> O‘yinlar <ArrowRight size={15} /></button><button type="button" onClick={() => onOpenRoom(room.id, "ai")}><Sparkles size={18} /> AI yordamchi <ArrowRight size={15} /></button></div></> : null}</div> : <div className="town-empty"><p>Ustoz yuborgan kod bilan shu fan sinfiga qo‘shiling.</p><Button onClick={onJoin}>Sinfga qo‘shilish <ArrowRight size={16} /></Button></div>}
    </div> : null}
  </section>;
}
