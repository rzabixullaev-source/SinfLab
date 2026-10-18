import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, ClipboardList, FlaskConical, GraduationCap, Plus, Sparkles, Users } from "lucide-react";
import { api } from "../lib/api.js";
import { Badge, Button, EmptyState, Panel, SectionHeading } from "../components/ui.jsx";
import { todayLabel } from "../lib/date.js";
import SubjectMap from "./SubjectMap.jsx";

const firstName = (name) => name?.trim().split(/\s+/)[0] || "Do‘st";

export default function Dashboard({ session, rooms, onOpenRoom, onCreate, onJoin }) {
  const [progress, setProgress] = useState(null);
  const [parentInvite, setParentInvite] = useState(null);
  const [parentInviteError, setParentInviteError] = useState("");
  const isStudent = rooms.some((room) => room.role === "student");
  async function createParentInvite() {
    setParentInviteError("");
    try { setParentInvite(await api("/parents/invites", { method: "POST", token: session.token, body: {} })); }
    catch (error) { setParentInviteError(error.message); }
  }
  const studentRoom = useMemo(() => rooms.find((room) => room.role === "student"), [rooms]);
  useEffect(() => {
    if (!studentRoom) { setProgress(null); return; }
    let active = true;
    api("/classrooms/" + studentRoom.id + "/my-progress", { token: session.token })
      .then((data) => { if (active) setProgress(data.progress); })
      .catch(() => { if (active) setProgress(null); });
    return () => { active = false; };
  }, [studentRoom, session.token]);

  const teacherRooms = rooms.filter((room) => room.role !== "student");
  const focus = progress?.assignmentsToDo?.[0] || progress?.quizzesToDo?.[0] || progress?.upcomingLessons?.[0];

  return <div className="page-enter dashboard-page">
    <div className="dashboard-intro">
      <div><span className="eyebrow"><CalendarDays size={14} /> {todayLabel()}</span><h1>Assalomu alaykum, {firstName(session.user.displayName)}.</h1><p>Bugungi ta’lim yo‘lingiz shu yerdan boshlanadi.</p></div>
      <div className="intro-actions"><Button variant="secondary" onClick={onJoin}>Kod bilan qo‘shilish</Button><Button onClick={onCreate}><Plus size={17} /> Yangi xona</Button></div>
    </div>

    {isStudent ? <Panel className="parent-link-panel"><div><strong>Ota-onani bog‘lash</strong><p>Bir martalik kodni faqat ota-onangizga yuboring. Kod 48 soat amal qiladi.</p></div><Button variant="secondary" onClick={createParentInvite}>Kod yaratish</Button>{parentInvite ? <code className="parent-invite-code">{parentInvite.code}</code> : null}{parentInviteError ? <p role="alert">{parentInviteError}</p> : null}</Panel> : null}

    <div className="dashboard-hero">
      <div className="hero-content"><span className="hero-eyebrow"><span className="live-dot" /> BIR JOYDA, BIR MAQSADDA</span><h2>{studentRoom ? "Bugungi o‘qishni davom ettiring" : rooms.length ? "Ta’limni tartib bilan boshqaring" : "Guruh yarating yoki taklif bilan qo‘shiling"}</h2><p>{studentRoom ? focus ? "Sizni kutayotgan navbatdagi ish tayyor. Davom etish uchun xonaga o‘ting." : "Darslar, vazifalar va laboratoriyalar bir joyda." : rooms.length ? "Xonalarni boshqaring, darslarni rejalang va o‘quvchilarning ishini kuzating." : "O‘zingiz guruh yaratsangiz ustoz bo‘lasiz. Taklif kodi bilan qo‘shilsangiz rolingizni sinf ustozi belgilaydi."}</p><Button variant="gold" onClick={() => studentRoom ? onOpenRoom(studentRoom.id) : rooms[0] ? onOpenRoom(rooms[0].id) : onCreate()}>{rooms.length ? "Xonaga o‘tish" : "Birinchi xonani yaratish"}<ArrowRight size={17} /></Button></div>
      <div className="hero-visual" aria-hidden="true"><div className="hero-ring hero-ring-1" /><div className="hero-ring hero-ring-2" /><div className="hero-symbol"><GraduationCap size={60} strokeWidth={1.1} /></div><span className="hero-corner-label">SINF / LAB · 2026</span></div>
    </div>

    <div className="stat-grid">
      <Panel className="stat-card"><span className="stat-icon teal"><BookOpen size={20} /></span><strong>{rooms.length}</strong><span>O‘quv xonalari</span></Panel>
      <Panel className="stat-card"><span className="stat-icon gold"><Users size={20} /></span><strong>{teacherRooms.length}</strong><span>Boshqarilayotgan xonalar</span></Panel>
      <Panel className="stat-card"><span className="stat-icon blue"><ClipboardList size={20} /></span><strong>{progress?.assignmentsToDo?.length ?? 0}</strong><span>Navbatdagi vazifalar</span></Panel>
      <Panel className="stat-card"><span className="stat-icon violet"><Sparkles size={20} /></span><strong>{progress?.reviewQueue?.length ?? 0}</strong><span>Qayta ko‘rish</span></Panel>
    </div>

    {isStudent ? <SubjectMap rooms={rooms.filter((room) => room.role === "student")} onOpenRoom={onOpenRoom} onJoin={onJoin} /> : null}

    <div className="dashboard-columns">
      <div>
        <SectionHeading eyebrow="SIZNING MAKONINGIZ" title="O‘quv xonalari" description="Dars, suhbat va amaliy ishlar o‘z xonasida saqlanadi." action={rooms.length ? <button className="text-link" onClick={onCreate}><Plus size={16} /> Xona yaratish</button> : null} />
        {rooms.length ? <div className="room-grid">{rooms.map((room) => <button className="room-card" key={room.id} onClick={() => onOpenRoom(room.id)}>
          <div className="room-card-top"><span className="room-avatar"><FlaskConical size={23} /></span><Badge tone={room.role === "student" ? "neutral" : "teal"}>{room.role === "owner" ? "Egasi" : room.role === "teacher" ? "Ustoz" : room.role === "assistant" ? "Yordamchi" : "O‘quvchi"}</Badge></div>
          <h3>{room.name}</h3><p>{room.subject || (room.mode === "club" ? "O‘quv klubi" : "Kurs xonasi")}</p><div className="room-card-bottom"><span>{room.mode === "club" ? "KLUB" : "KURS"}</span><ArrowRight size={18} /></div>
        </button>)}</div> : <Panel><EmptyState icon={BookOpen} title="Hali xona yo‘q" description="O‘quv xonasini yarating yoki ustoz yuborgan kod bilan qo‘shiling." action={<div className="empty-actions"><Button onClick={onCreate}>Xona yaratish</Button><Button variant="secondary" onClick={onJoin}>Kod bilan qo‘shilish</Button></div>} /></Panel>}
      </div>
      <aside className="dashboard-aside">
        <SectionHeading eyebrow="YO‘NALISH" title="Keyingi qadam" />
        <Panel className="focus-panel">
          <div className="focus-icon"><CalendarDays size={21} /></div>
          {focus ? <><Badge tone="gold">BUGUNGI FOKUS</Badge><h3>{focus.title}</h3><p>{studentRoom?.name} xonasida sizni kutayotgan ish.</p><button className="text-link" onClick={() => onOpenRoom(studentRoom.id)}>Davom etish <ArrowRight size={16} /></button></> : <><h3>Hammasi joyida</h3><p>Yangi dars va vazifalar paydo bo‘lganda shu yerda ko‘rinadi.</p></>}
        </Panel>
        <Panel className="tip-panel"><span className="eyebrow">SINF LAB FIKRI</span><p>Har bir kichik qadam — katta natijaning boshlanishi.</p><span className="tip-ornament" /></Panel>
      </aside>
    </div>
  </div>;
}
