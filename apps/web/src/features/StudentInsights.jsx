import { Activity, BookOpenCheck, CalendarDays, Clock3, FlaskConical, Sparkles, Trophy } from "lucide-react";
import { Badge, Button, Panel } from "../components/ui.jsx";
import "./student-insights.css";

const areas = { overview: "Umumiy", lessons: "Darslar", assignments: "Vazifalar", quizzes: "Testlar", ai: "AI yordamchi", games: "O‘yinlar", live: "Jonli dars", labs: "Laboratoriya", progress: "Reja", chat: "Suhbat", materials: "Materiallar", members: "A’zolar" };
const kinds = { assignment: "Vazifa", quiz: "Test", lab: "Laboratoriya", game: "O‘yin", live: "Jonli dars" };
const dateTime = (value) => new Date(value).toLocaleString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dayLabel = (value) => new Date(`${value}T12:00:00Z`).toLocaleDateString("uz-UZ", { weekday: "short" });
export const durationLabel = (seconds = 0) => seconds < 60 ? `${seconds} soniya` : seconds < 3600 ? `${Math.floor(seconds / 60)} daqiqa` : `${Math.floor(seconds / 3600)} soat ${Math.floor(seconds % 3600 / 60)} daqiqa`;
const ratio = (part, total) => `${part ?? 0} / ${total ?? 0}`;

function outcome(item) {
  if (item.kind === "assignment") return ({ accepted: "Qabul qilindi", submitted: "Tekshirilmoqda", needs_revision: "Tuzatish kerak" })[item.detail] || "Topshirildi";
  if (item.kind === "quiz") return item.detail == null ? "Baholanmagan" : `${item.detail}% natija`;
  if (item.kind === "lab") return item.detail === true ? "Muvaffaqiyatli" : item.detail === false ? "Takrorlash kerak" : "Mashq bajarildi";
  if (item.kind === "game") return `+${item.detail ?? 0} ball`;
  return "Qatnashdi";
}

export default function StudentInsights({ report, advice, onAdvice, adviceBusy = false, title = "O‘quv faoliyati" }) {
  if (!report) return null;
  const { engagement, stats, timeline } = report;
  const maxDay = Math.max(60, ...engagement.days.map((day) => day.seconds));
  const areaRows = Object.entries(engagement.secondsByArea).sort((a, b) => b[1] - a[1]);
  return <div className="student-insights">
    <div className="insights-heading"><div><span className="eyebrow">O‘QUVCHI PROFILI</span><h3>{title}</h3><p>Natijalar va ilovadagi taxminiy faoliyat bir joyda.</p></div><Badge tone={engagement.lastActiveAt ? "teal" : "neutral"}>{engagement.lastActiveAt ? `Oxirgi faollik: ${dateTime(engagement.lastActiveAt)}` : "Hali faoliyat yo‘q"}</Badge></div>
    <div className="insight-stats">
      <Panel><Clock3 size={19} /><strong>{durationLabel(engagement.weekSeconds)}</strong><span>So‘nggi 7 kun</span><small>Jami: {durationLabel(engagement.totalSeconds)}</small></Panel>
      <Panel><BookOpenCheck size={19} /><strong>{ratio(stats.assignmentsAccepted, stats.assignmentsTotal)}</strong><span>Qabul qilingan vazifalar</span><small>{stats.assignmentsToDo} ta bajariladigan ish</small></Panel>
      <Panel><Trophy size={19} /><strong>{stats.quizAveragePercent == null ? "—" : `${stats.quizAveragePercent}%`}</strong><span>Testlar o‘rtachasi</span><small>{ratio(stats.quizzesCompleted, stats.quizzesTotal)} ta test</small></Panel>
      <Panel><FlaskConical size={19} /><strong>{ratio(stats.labsCompleted, stats.labsTotal)}</strong><span>Laboratoriya natijasi</span><small>{stats.gameScore} o‘yin balli</small></Panel>
    </div>
    <div className="insight-columns">
      <Panel className="insight-chart"><div className="insight-card-heading"><CalendarDays size={18} /><h4>Haftalik faoliyat</h4></div><div className="insight-bars" role="img" aria-label="So‘nggi yetti kundagi faoliyat vaqti">{engagement.days.map((day) => <div className="insight-day" key={day.date} title={`${day.date}: ${durationLabel(day.seconds)}`}><span className="insight-bar-track"><span style={{ height: `${Math.max(day.seconds ? 7 : 0, day.seconds / maxDay * 100)}%` }} /></span><strong>{dayLabel(day.date)}</strong><small>{day.seconds ? day.seconds < 60 ? "<1 daq" : `${Math.round(day.seconds / 60)} daq` : "0"}</small></div>)}</div><p className="insight-note">Hisob faqat ilova ko‘rinib turgan va o‘quvchi faol bo‘lgan vaqtga asoslanadi.</p></Panel>
      <Panel className="insight-areas"><div className="insight-card-heading"><Activity size={18} /><h4>Qaysi bo‘limda ishladi?</h4></div>{areaRows.length ? <div className="insight-area-list">{areaRows.map(([area, seconds]) => <div key={area}><div><span>{areas[area] || area}</span><strong>{durationLabel(seconds)}</strong></div><span className="insight-area-track"><span style={{ width: `${Math.max(4, seconds / Math.max(1, engagement.totalSeconds) * 100)}%` }} /></span></div>)}</div> : <p className="insight-empty">Faoliyat qayd etilganda bo‘limlar shu yerda ko‘rinadi.</p>}</Panel>
    </div>
    <div className="insight-columns insight-bottom">
      <Panel className="insight-timeline"><div className="insight-card-heading"><Activity size={18} /><h4>So‘nggi o‘quv ishlari</h4></div>{timeline.length ? <ol>{timeline.map((item, index) => <li key={`${item.kind}-${item.at}-${index}`}><span className="insight-event-dot" /><div><strong>{item.title}</strong><small>{kinds[item.kind] || item.kind} · {dateTime(item.at)}</small></div><span className="insight-outcome">{outcome(item)}</span></li>)}</ol> : <p className="insight-empty">Vazifa, test, laboratoriya yoki jonli dars amallari hali yo‘q.</p>}</Panel>
      <Panel className="insight-advice"><div className="insight-card-heading"><Sparkles size={18} /><h4>AI maslahati</h4></div><p>Gemini bajarilgan ishlar va vaqt hisobiga tayangan holda keyingi qadamlarni taklif qiladi. Natija pedagogik baho o‘rnini bosmaydi.</p><Button variant="secondary" onClick={onAdvice} loading={adviceBusy}><Sparkles size={16} /> Tahlil qilish</Button>{advice ? <div className="insight-advice-text" role="status">{advice}</div> : null}</Panel>
    </div>
  </div>;
}
