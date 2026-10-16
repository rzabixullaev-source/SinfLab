import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, ClipboardList, FlaskConical, ListChecks, Target } from "lucide-react";
import { Badge, EmptyState, Panel, SectionHeading } from "../../components/ui.jsx";
import { dateTimeLabel } from "../../lib/date.js";
import { api, errorText } from "../../lib/api.js";

export default function ProgressTab({ progress, navigate, room, session }) {
  const [latest, setLatest] = useState(progress);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/classrooms/" + room.id + "/my-progress", { token: session.token })
      .then((result) => { if (active) setLatest(result.progress); })
      .catch((cause) => { if (active) setError(errorText(cause)); });
    return () => { active = false; };
  }, [room.id, session.token]);
  const current = latest || progress;
  const groups = [
    { title: "Bajariladigan vazifalar", icon: ClipboardList, items: current?.assignmentsToDo || [], tab: "assignments", label: (item) => item.status === "needs_revision" ? "Tuzatish kerak" : item.dueAt ? "Muddat: " + dateTimeLabel(item.dueAt) : "Topshirish kerak" },
    { title: "Yechiladigan testlar", icon: ListChecks, items: current?.quizzesToDo || [], tab: "quizzes", label: () => "Testni boshlash" },
    { title: "Qoldirilgan darslar", icon: BookOpen, items: current?.missedLessons || [], tab: "lessons", label: (item) => dateTimeLabel(item.endedAt) },
    { title: "Takrorlash kerak", icon: FlaskConical, items: current?.reviewQueue || [], tab: null, label: (item) => item.kind === "lab" ? "Laboratoriyani takrorlash" : "Test mavzusini takrorlash" },
  ];
  const count = groups.reduce((sum, group) => sum + group.items.length, 0);
  return <div className="module-page page-enter"><SectionHeading eyebrow="SHAXSIY O‘QISH YO‘LI" title="Mening rejam" description="Bajarilishi kerak bo‘lgan ishlar va takrorlash mavzulari bir joyda." />{error ? <div className="form-error">{error}</div> : null}
    <Panel className="progress-summary"><span className="stat-icon teal"><Target size={22} /></span><div><strong>{count ? count + " ta keyingi qadam" : "Hammasi joyida"}</strong><p>{count ? "Birini tanlab o‘qishni davom ettiring." : "Yangi vazifa yoki dars bo‘lsa, shu yerda chiqadi."}</p></div><Badge tone={count ? "gold" : "teal"}>{count ? "DAVOM ETTIRING" : "TAYYOR"}</Badge></Panel>
    {count ? groups.filter((group) => group.items.length).map((group) => <div className="progress-group" key={group.title}><h3><group.icon size={19} /> {group.title}</h3><div className="lesson-list">{group.items.map((item) => <button className="progress-item" key={item.id || item.sessionId} onClick={() => navigate(group.tab || (item.kind === "lab" ? "labs" : "quizzes"))}><span>{item.title}</span><small>{group.label(item)}</small></button>)}</div></div>) : <Panel><EmptyState icon={CheckCircle2} title="Hamma ishlar bajarilgan" description="Dars, vazifa va mashqlarni shu joydan kuzatib borasiz." /></Panel>}
  </div>;
}
