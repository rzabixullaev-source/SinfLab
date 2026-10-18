import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ClipboardList, FlaskConical, HeartHandshake, Radio, RefreshCw, Users } from "lucide-react";
import { api, errorText } from "../lib/api.js";
import { Badge, Button, Field, Panel } from "../components/ui.jsx";
import StudentInsights, { durationLabel } from "./StudentInsights.jsx";
import BrowserClassroom from "./room/BrowserClassroom.jsx";
import ZoomClassroom from "./room/ZoomClassroom.jsx";
import "./parent-dashboard.css";

const statusLabel = { not_started: "Boshlanmagan", submitted: "Tekshirilmoqda", needs_revision: "Tuzatish kerak", accepted: "Qabul qilingan" };
const date = (value) => value ? new Date(value).toLocaleDateString("uz-UZ") : "—";
const ratio = (part, total) => `${part ?? 0} / ${total ?? 0}`;

export default function ParentDashboard({ session }) {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [advice, setAdvice] = useState({});
  const [adviceBusy, setAdviceBusy] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [watching, setWatching] = useState(null);

  async function loadChildren(preferId) {
    const result = await api("/parents/children", { token: session.token });
    setChildren(result.children);
    setSelectedId(preferId || result.children[0]?.id || null);
  }
  useEffect(() => { loadChildren().catch((cause) => setError(errorText(cause))); }, [session.token]);
  useEffect(() => {
    if (!selectedId) { setOverview(null); return; }
    let active = true;
    setLoading(true); setError(""); setOverview(null); setRoomId(null);
    api(`/parents/children/${selectedId}`, { token: session.token })
      .then((result) => { if (active) { setOverview(result); setRoomId(result.classrooms[0]?.id || null); } })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedId, session.token]);
  useEffect(() => {
    let active = true;
    const poll = () => api("/parents/live-alerts", { token: session.token })
      .then((result) => { if (active) setLiveAlerts(result.alerts); })
      .catch(() => { if (active) setLiveAlerts([]); });
    poll();
    const timer = setInterval(poll, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [session.token]);

  async function linkChild(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api("/parents/link", { method: "POST", token: session.token, body: { code: code.trim() } });
      setCode(""); await loadChildren(result.child.id);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function requestAdvice() {
    if (!selectedId || !roomId) return;
    const key = `${selectedId}:${roomId}`;
    setAdviceBusy(true); setAdvice((previous) => ({ ...previous, [key]: "" }));
    try {
      const result = await api(`/parents/children/${selectedId}/ai-advice?classroomId=${roomId}`, { token: session.token });
      setAdvice((previous) => ({ ...previous, [key]: result.advice }));
    } catch (cause) { setAdvice((previous) => ({ ...previous, [key]: errorText(cause) })); }
    finally { setAdviceBusy(false); }
  }

  const room = overview?.classrooms.find((item) => item.id === roomId);
  const stats = overview?.stats;
  return <div className="page-enter parent-dashboard">
    <header className="parent-hero"><span className="parent-hero-icon"><HeartHandshake size={28} /></span><div><span className="eyebrow">OTA-ONA KABINETI</span><h1>Farzandingizning o‘quv yo‘li</h1><p>O‘quv ishlari, natijalar va shug‘ullanish vaqti shu yerda jamlangan.</p></div></header>
    <details className="parent-link-details" open><summary><Users size={18} /> Farzandni kod bilan bog‘lash <ChevronDown size={16} /></summary><p>Farzandingiz o‘z akkauntidagi asosiy sahifada “Farzand kodini yaratish” tugmasini bosadi. U yaratgan bir martalik kodni quyiga kiriting.</p><form onSubmit={linkChild} className="parent-link-form"><Field label="Farzand kodi" value={code} onChange={(event) => setCode(event.target.value)} required minLength={16} /><Button type="submit" loading={busy}>Farzandni bog‘lash</Button></form></details>

    {liveAlerts.length ? <Panel className="parent-live-panel"><div className="parent-live-heading"><Radio size={20} /><strong>Jonli dars davom etmoqda</strong><Badge tone="gold">JONLI</Badge></div>{liveAlerts.map((alert) => <div className="parent-live-row" key={alert.session.id}><span>{alert.session.title || "Jonli dars"} · {alert.classroomName}</span><Button variant="secondary" onClick={() => setWatching(alert)}>Kuzatish</Button></div>)}</Panel> : null}
    {watching ? <div className="parent-observer"><div className="parent-observer-heading"><h2>{watching.classroomName} · Kuzatuvchi</h2><Button variant="secondary" onClick={() => setWatching(null)}>Yopish</Button></div>{watching.session.provider === "browser_webrtc" ? <BrowserClassroom key={watching.session.id} room={{ id: watching.session.classroomId, name: watching.classroomName, role: "observer" }} item={watching.session} session={session} notify={() => {}} onActivated={() => {}} onEnded={() => setWatching(null)} /> : <ZoomClassroom key={watching.session.id} room={{ id: watching.session.classroomId, name: watching.classroomName, role: "observer" }} item={watching.session} session={session} notify={() => {}} onActivated={() => {}} onEnded={() => setWatching(null)} />}</div> : null}

    {children.length ? <nav className="parent-child-tabs" aria-label="Farzandni tanlash">{children.map((child) => <button type="button" aria-current={selectedId === child.id ? "page" : undefined} className={selectedId === child.id ? "active" : ""} key={child.id} onClick={() => setSelectedId(child.id)}><span>{child.displayName.slice(0, 1).toUpperCase()}</span>{child.displayName}</button>)}</nav> : null}

    {loading ? <Panel className="parent-loading"><RefreshCw className="spin" size={20} /> Ma’lumotlar yuklanmoqda...</Panel> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {overview ? <>
      <div className="parent-child-heading"><div><span className="eyebrow">O‘QUVCHI HISOBOTI</span><h2>{overview.child.displayName}</h2><p>{overview.classrooms.length} ta o‘quv xonasi · {overview.child.email}</p></div><Badge tone="teal">BIRIKTIRILGAN FARZAND</Badge></div>
      <div className="parent-overview-stats">
        <Panel><span className="parent-stat-icon"><Users size={18} /></span><strong>{durationLabel(stats.weekSeconds)}</strong><small>7 kunlik faol vaqt</small></Panel>
        <Panel><span className="parent-stat-icon"><ClipboardList size={18} /></span><strong>{ratio(stats.assignmentsCompleted, stats.assignmentsTotal)}</strong><small>Qabul qilingan vazifalar</small></Panel>
        <Panel><span className="parent-stat-icon"><BookOpen size={18} /></span><strong>{stats.quizAveragePercent == null ? "—" : `${stats.quizAveragePercent}%`}</strong><small>Testlar o‘rtachasi</small></Panel>
        <Panel><span className="parent-stat-icon"><FlaskConical size={18} /></span><strong>{ratio(stats.labsCompleted, stats.labsTotal)}</strong><small>Laboratoriya natijasi</small></Panel>
      </div>
      {overview.classrooms.length ? <><div className="parent-classroom-nav"><div><span className="eyebrow">SINF HISOBOTI</span><h2>Qaysi sinfni ko‘ramiz?</h2></div><div>{overview.classrooms.map((item) => <button type="button" key={item.id} className={roomId === item.id ? "active" : ""} onClick={() => setRoomId(item.id)}>{item.name}</button>)}</div></div>
        {room ? <><StudentInsights report={room.report} title={room.name} advice={advice[`${selectedId}:${roomId}`]} onAdvice={requestAdvice} adviceBusy={adviceBusy} />
          <div className="parent-records-heading"><span className="eyebrow">BATAFSIL MA’LUMOT</span><h2>Darslar va topshiriqlar</h2><p>Farzandingizga berilgan ishlar hamda ustozning izohlarini ko‘ring.</p></div>
          <div className="parent-record-grid">
            <details><summary><BookOpen size={18} /> Darslar <span>{room.lessons.length}</span><ChevronDown size={16} /></summary>{room.lessons.length ? room.lessons.map((item) => <article key={item.id}><strong>{item.title}</strong><small>{date(item.startsAt)}</small><p>{item.description}</p></article>) : <p>Hozircha dars yo‘q.</p>}</details>
            <details open><summary><ClipboardList size={18} /> Vazifalar va ustoz izohlari <span>{room.assignments.length}</span><ChevronDown size={16} /></summary>{room.assignments.length ? room.assignments.map((item) => <article key={item.id}><strong>{item.title}</strong><small>{statusLabel[item.status] || item.status} · Muddat: {date(item.dueAt)}</small><p>{item.instructions}</p>{item.revisions.map((revision) => <p key={revision.version}><b>Topshirilgan ish:</b> {revision.body}</p>)}{item.feedback.map((entry, index) => <p key={index}><b>Ustoz izohi:</b> {entry.body}{entry.score == null ? "" : ` · ${entry.score} ball`}</p>)}</article>) : <p>Hozircha vazifa yo‘q.</p>}</details>
            <details><summary><BookOpen size={18} /> Testlar <span>{room.quizzes.length}</span><ChevronDown size={16} /></summary>{room.quizzes.length ? room.quizzes.map((item) => <article key={item.id}><strong>{item.title}</strong><small>{item.score == null ? "Hali ishlanmagan" : `${item.score} / ${item.maxScore} ball · ${date(item.submittedAt)}`}</small></article>) : <p>Hozircha test yo‘q.</p>}</details>
            <details><summary><FlaskConical size={18} /> Laboratoriyalar <span>{room.labs.length}</span><ChevronDown size={16} /></summary>{room.labs.length ? room.labs.map((item) => <article key={item.id}><strong>{item.title}</strong><small>{item.attempts} urinish · {item.correct == null ? "Hali bajarilmagan" : item.correct ? "Muvaffaqiyatli" : "Qayta mashq kerak"}</small>{item.score != null ? <p>Natija: {item.score} ball</p> : null}</article>) : <p>Hozircha laboratoriya yo‘q.</p>}</details>
            <details><summary><Radio size={18} /> Jonli dars davomat <span>{room.attendance.length}</span><ChevronDown size={16} /></summary>{room.attendance.length ? room.attendance.map((item) => <article key={item.sessionId}><strong>{item.title}</strong><small>{date(item.endedAt)} · {item.attended ? "Qatnashgan" : "Qatnashmagan"}</small></article>) : <p>Hozircha yakunlangan dars yo‘q.</p>}</details>
          </div></> : null}</> : <Panel className="parent-empty"><p>Farzandingiz hozircha o‘quv xonasiga qo‘shilmagan.</p></Panel>}
    </> : null}
  </div>;
}
