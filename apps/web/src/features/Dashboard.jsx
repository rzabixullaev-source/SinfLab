import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, ClipboardList, FlaskConical, GraduationCap, MapPinned, Plus, Sparkles, Users } from "lucide-react";
import { api } from "../lib/api.js";
import { Badge, Button, EmptyState, Panel, SectionHeading } from "../components/ui.jsx";
import { todayLabel } from "../lib/date.js";
import { useSettings } from "../lib/settings.jsx";

const firstName = (name) => name?.trim().split(/\s+/)[0] || "Do‘st";

export default function Dashboard({ session, rooms, onOpenRoom, onCreate, onJoin, onMap }) {
  const { t } = useSettings();
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
      <div><span className="eyebrow"><CalendarDays size={14} /> {todayLabel()}</span><h1>{t("dashboardGreeting", { name: firstName(session.user.displayName) })}</h1><p>{t("dashboardLead")}</p></div>
      <div className="intro-actions"><Button variant="secondary" onClick={onMap}><MapPinned size={17} /> {t("subjectMap")}</Button><Button variant="secondary" onClick={onJoin}>{t("joinCode")}</Button><Button onClick={onCreate}><Plus size={17} /> {t("newRoom")}</Button></div>
    </div>

    {isStudent ? <Panel className="parent-link-panel"><div><strong>{t("connectParent")}</strong><p>{t("parentCodeHint")}</p></div><Button variant="secondary" onClick={createParentInvite}>{t("makeCode")}</Button>{parentInvite ? <code className="parent-invite-code">{parentInvite.code}</code> : null}{parentInviteError ? <p role="alert">{parentInviteError}</p> : null}</Panel> : null}

    <div className="dashboard-hero">
      <div className="hero-content"><span className="hero-eyebrow"><span className="live-dot" /> {t("heroKicker")}</span><h2>{t(studentRoom ? "continueLearning" : rooms.length ? "manageLearning" : "joinOrCreate")}</h2><p>{t(studentRoom ? focus ? "focusReady" : "allInOne" : rooms.length ? "manageRooms" : "firstRoomHint")}</p><Button variant="gold" onClick={() => studentRoom ? onOpenRoom(studentRoom.id) : rooms[0] ? onOpenRoom(rooms[0].id) : onCreate()}>{t(rooms.length ? "openRoom" : "createFirstRoom")}<ArrowRight size={17} /></Button></div>
      <div className="hero-visual" aria-hidden="true"><div className="hero-ring hero-ring-1" /><div className="hero-ring hero-ring-2" /><div className="hero-symbol"><GraduationCap size={60} strokeWidth={1.1} /></div><span className="hero-corner-label">SINF / LAB · 2026</span></div>
    </div>

    <div className="stat-grid">
      <Panel className="stat-card"><span className="stat-icon teal"><BookOpen size={20} /></span><strong>{rooms.length}</strong><span>{t("learningRooms")}</span></Panel>
      <Panel className="stat-card"><span className="stat-icon gold"><Users size={20} /></span><strong>{teacherRooms.length}</strong><span>{t("managedRooms")}</span></Panel>
      <Panel className="stat-card"><span className="stat-icon blue"><ClipboardList size={20} /></span><strong>{progress?.assignmentsToDo?.length ?? 0}</strong><span>{t("nextTasks")}</span></Panel>
      <Panel className="stat-card"><span className="stat-icon violet"><Sparkles size={20} /></span><strong>{progress?.reviewQueue?.length ?? 0}</strong><span>{t("reviewAgain")}</span></Panel>
    </div>

    <div className="dashboard-columns">
      <div>
        <SectionHeading eyebrow={t("yourSpace")} title={t("learningRooms")} description={t("roomsIntro")} action={rooms.length ? <button className="text-link" onClick={onCreate}><Plus size={16} /> {t("createRoom")}</button> : null} />
        {rooms.length ? <div className="room-grid">{rooms.map((room) => <button className="room-card" key={room.id} onClick={() => onOpenRoom(room.id)}>
          <div className="room-card-top"><span className="room-avatar"><FlaskConical size={23} /></span><Badge tone={room.role === "student" ? "neutral" : "teal"}>{t(room.role === "owner" ? "roomOwner" : room.role === "teacher" ? "teacher" : room.role === "assistant" ? "assistant" : "student")}</Badge></div>
          <h3>{room.name}</h3><p>{room.subject || t(room.mode === "club" ? "studyClub" : "courseRoom")}</p><div className="room-card-bottom"><span>{room.mode === "club" ? "CLUB" : "COURSE"}</span><ArrowRight size={18} /></div>
        </button>)}</div> : <Panel><EmptyState icon={BookOpen} title={t("noRoomTitle")} description={t("noRoomText")} action={<div className="empty-actions"><Button onClick={onCreate}>{t("createRoom")}</Button><Button variant="secondary" onClick={onJoin}>{t("joinCode")}</Button></div>} /></Panel>}
      </div>
      <aside className="dashboard-aside">
        <SectionHeading eyebrow={t("direction")} title={t("nextStep")} />
        <Panel className="focus-panel">
          <div className="focus-icon"><CalendarDays size={21} /></div>
          {focus ? <><Badge tone="gold">{t("todayFocus")}</Badge><h3>{focus.title}</h3><p>{t("waitingInRoom", { name: studentRoom?.name })}</p><button className="text-link" onClick={() => onOpenRoom(studentRoom.id)}>{t("continue")} <ArrowRight size={16} /></button></> : <><h3>{t("allGood")}</h3><p>{t("newWorkHint")}</p></>}
        </Panel>
        <Panel className="tip-panel"><span className="eyebrow">SINF LAB</span><p>{t("dailyThought")}</p><span className="tip-ornament" /></Panel>
      </aside>
    </div>
  </div>;
}
