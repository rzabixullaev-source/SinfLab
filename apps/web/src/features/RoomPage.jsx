import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Bot, CalendarDays, CheckCircle2, ClipboardList, Copy, FlaskConical, Gamepad2, Hash, MessageCircle, Radio, Target, Users } from "lucide-react";
import { api, errorText } from "../lib/api.js";
import { Badge, Button, EmptyState, Modal, Panel, SectionHeading, Select } from "../components/ui.jsx";
import { dateTimeLabel } from "../lib/date.js";
import LessonsTab from "./room/LessonsTab.jsx";
import ChatTab from "./room/ChatTab.jsx";
import MaterialsTab from "./room/MaterialsTab.jsx";
import MembersTab from "./room/MembersTab.jsx";
import AssignmentsTab from "./room/AssignmentsTab.jsx";
import QuizzesTab from "./room/QuizzesTab.jsx";
import LiveTab from "./room/LiveTab.jsx";
import ProgressTab from "./room/ProgressTab.jsx";
import AiTab from "./room/AiTab.jsx";
import GamesTab from "./room/GamesTab.jsx";
import { townForSubject } from "./subject-map.js";
import "./subject-room.css";

const LabsTab = lazy(() => import("./room/LabsTab.jsx"));

const roleName = { owner: "Ustoz", teacher: "Ustoz", assistant: "Yordamchi ustoz", student: "O‘quvchi", member: "A’zo" };

export default function RoomPage({ session, roomId, tab, navigate, notify, demoMode }) {
  const [room, setRoom] = useState(null);
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState("student");
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);
  const loadedRoomId = useRef(null);

  const refresh = useCallback(async () => {
    if (loadedRoomId.current !== roomId) setLoading(true);
    setError("");
    try {
      const prefix = "/classrooms/" + roomId;
      const results = await Promise.all([
        api(prefix, { token: session.token }),
        api(prefix + "/lessons", { token: session.token }),
        api(prefix + "/assignments", { token: session.token }),
        api(prefix + "/quizzes", { token: session.token }),
        api(prefix + "/live-sessions", { token: session.token }),
        api(prefix + "/labs", { token: session.token }),
        api(prefix + "/members", { token: session.token }),
      ]);
      setRoom(results[0].classroom);
      loadedRoomId.current = roomId;
      setData({ lessons: results[1].lessons, assignments: results[2].assignments, quizzes: results[3].quizzes, sessions: results[4].sessions, labs: results[5].labs, members: results[6].members });
      if (results[0].classroom.role === "student") {
        const summary = await api(prefix + "/my-progress", { token: session.token });
        setProgress(summary.progress);
      } else setProgress(null);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [roomId, session.token]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (room?.role !== "student") return;
    let lastTick = Date.now();
    let lastInteraction = Date.now();
    const interacted = () => { lastInteraction = Date.now(); };
    const send = () => {
      const now = Date.now();
      const seconds = Math.min(30, Math.floor((now - lastTick) / 1000));
      lastTick = now;
      if (document.visibilityState !== "visible" || now - lastInteraction > 120000 || seconds < 1) return;
      api(`/classrooms/${roomId}/activity`, { method: "POST", token: session.token, body: { area: tab, seconds } }).catch(() => {});
    };
    window.addEventListener("pointerdown", interacted);
    window.addEventListener("keydown", interacted);
    window.addEventListener("scroll", interacted, { passive: true });
    const timer = window.setInterval(send, 30000);
    return () => {
      window.clearInterval(timer);
      send();
      window.removeEventListener("pointerdown", interacted);
      window.removeEventListener("keydown", interacted);
      window.removeEventListener("scroll", interacted);
    };
  }, [room?.role, roomId, session.token, tab]);

  const refreshProgress = useCallback(async () => {
    const result = await api("/classrooms/" + roomId + "/my-progress", { token: session.token });
    setProgress(result.progress);
  }, [roomId, session.token]);

  const updateLiveSession = useCallback((next) => {
    setData((previous) => previous && {
      ...previous,
      sessions: previous.sessions.some((item) => item.id === next.id)
        ? previous.sessions.map((item) => item.id === next.id ? next : item)
        : [...previous.sessions, next],
    });
  }, []);

  async function makeInvite() {
    setBusy(true);
    try {
      const result = await api("/classrooms/" + roomId + "/invites", {
        method: "POST", token: session.token, body: { role: inviteRole },
      });
      setInvite(result.invite);
    } catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function copyCode() {
    if (!invite) return;
    try { await navigator.clipboard.writeText(invite.code); notify("Taklif kodi nusxalandi."); }
    catch { notify("Kodni belgilab qo‘lda nusxalang."); }
  }

  if (loading) return <div className="room-loading"><div className="skeleton room-skeleton-head" /><div className="skeleton room-skeleton-card" /><div className="skeleton room-skeleton-card" /></div>;
  if (error || !room) return <Panel><EmptyState icon={BookOpen} title="Xonani ochib bo‘lmadi" description={error || "Ma’lumot topilmadi."} action={<Button onClick={refresh}>Qayta urinish</Button>} /></Panel>;

  const staff = room.mode === "course" && room.role !== "student";
  const nextLesson = data.lessons.filter((lesson) => lesson.startsAt && new Date(lesson.startsAt) >= new Date()).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0] || data.lessons[0];
  const activeSession = data.sessions.find((item) => item.status === "live");
  const tabs = room.mode === "club" ? [
    { id: "overview", label: "Umumiy", icon: BookOpen },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "members", label: "A’zolar", icon: Users },
  ] : [
    { id: "overview", label: "Umumiy", icon: BookOpen },
    { id: "lessons", label: "Darslar", icon: CalendarDays },
    { id: "assignments", label: "Vazifalar", icon: ClipboardList },
    { id: "quizzes", label: "Testlar", icon: CheckCircle2 },
    { id: "ai", label: "Yordamchi AI", icon: Bot },
    { id: "games", label: "O‘yinlar", icon: Gamepad2 },
    { id: "live", label: "Jonli dars", icon: Radio },
    { id: "labs", label: "Laboratoriya", icon: FlaskConical },
    ...(!staff ? [{ id: "progress", label: "Mening rejam", icon: Target }] : []),
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "materials", label: "Materiallar", icon: Hash },
    { id: "members", label: "A’zolar", icon: Users },
  ];

  return <div className={`page-enter room-page subject-${townForSubject(room.subject || room.name)}`}>
    <div className="room-banner"><div><span className="eyebrow">{room.mode === "club" ? "ODDIY CHAT GURUHI" : "USTOZLI SINF"} <span className="eyebrow-separator">·</span> {room.mode === "club" ? (room.role === "owner" ? "Yaratuvchi" : "A’zo") : roleName[room.role]}</span><h1>{room.name}</h1><p>{room.description || "Birga o‘rganish va ishlash uchun o‘quv muhiti."}</p></div><div className="room-banner-actions">{room.role === "owner" || staff ? <><Button variant="secondary" onClick={() => { window.location.hash = "/invitations"; }}><Users size={17} /> Email orqali taklif</Button><Button variant="secondary" onClick={() => { setInvite(null); setInviteOpen(true); }}>Kod yaratish</Button></> : null}<span className="room-banner-icon"><FlaskConical size={37} strokeWidth={1.3} /></span></div></div>
    <nav className="room-tabs" aria-label="Xona bo‘limlari">{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => navigate(item.id)}><item.icon size={17} /> {item.label}</button>)}</nav>
    {tab === "overview" && room.mode === "club" ? <Panel><SectionHeading eyebrow="CHAT GURUHI" title="Birga suhbatlashing" description="Bu guruhda ustoz va o‘quvchi rollari yo‘q. Barcha a’zolar chatda qatnashadi." /><Button onClick={() => navigate("chat")}>Chatni ochish <ArrowRight size={16} /></Button></Panel> : null}
    {tab === "overview" && room.mode !== "club" ? <div className="room-overview">
      <div className="overview-main">
        <SectionHeading eyebrow="XONA HOLATI" title={staff ? "Dars muhiti" : "Sizning o‘qish yo‘lingiz"} description={staff ? "Darslar va o‘quvchilar faoliyati bir joyda." : "Navbatdagi dars va bajariladigan ishlar shu yerda."} />
        {activeSession ? <Panel className="live-callout"><span className="live-callout-icon"><Radio size={21} /></span><div><Badge tone="gold">JONLI DARS</Badge><h3>Dars hozir davom etmoqda</h3><p>Guruh bilan uchrashuvga o‘tishingiz mumkin.</p></div>{activeSession.joinUrl ? <a className="btn btn-gold" href={activeSession.joinUrl} target="_blank" rel="noopener noreferrer">Uchrashuvga o‘tish <ArrowRight size={17} /></a> : null}</Panel> : null}
        <div className="overview-feature-grid">
          <Panel className="overview-feature"><div className="overview-feature-heading"><span className="stat-icon teal"><CalendarDays size={20} /></span><Badge tone="teal">KEYINGI DARS</Badge></div>{nextLesson ? <><h3>{nextLesson.title}</h3><p>{nextLesson.description || "Dars tafsilotlari xonada saqlanadi."}</p><div className="feature-meta"><CalendarDays size={16} /> {dateTimeLabel(nextLesson.startsAt)}</div></> : <><h3>Hali dars yo‘q</h3><p>Ustoz dars qo‘shganda shu yerda ko‘rinadi.</p></>}</Panel>
          <Panel className="overview-feature"><div className="overview-feature-heading"><span className="stat-icon gold"><ClipboardList size={20} /></span><Badge tone="gold">{staff ? "BAHOLASH" : "VAZIFALAR"}</Badge></div><h3>{staff ? data.assignments.length + " ta vazifa" : (progress?.assignmentsToDo?.length ?? 0) + " ta navbatdagi vazifa"}</h3><p>{staff ? "Vazifa va testlarni ushbu xona ichida boshqaring." : "Vazifalarni o‘z vaqtida topshiring va fikrlarni ko‘ring."}</p><div className="feature-meta"><ClipboardList size={16} /> {data.quizzes.length} ta test</div></Panel>
        </div>
        {progress?.missedLessons?.length ? <Panel className="missed-panel"><div className="missed-icon"><BookOpen size={21} /></div><div><span className="eyebrow">DAVOM ETTIRISH</span><h3>Qoldirilgan dars bor</h3><p>{progress.missedLessons[0].title} darsining tafsilotlarini ko‘rib chiqing.</p></div><ArrowRight size={20} /></Panel> : null}
        <SectionHeading eyebrow="O‘QUV OQIMI" title="Hammasi bir xonada" />
        <div className="module-grid"><div><span><BookOpen size={19} /></span><strong>Darslar</strong><small>{data.lessons.length} ta dars</small></div><div><span><MessageCircle size={19} /></span><strong>Guruh suhbati</strong><small>Savol va javoblar</small></div><div><span><FlaskConical size={19} /></span><strong>Laboratoriya</strong><small>{data.labs.length} ta mashq</small></div></div>
      </div>
      <aside className="overview-aside"><Panel className="overview-stat"><span className="eyebrow">XONA RAQAMLARDA</span><div><strong>{data.members.length}</strong><span>A’zolar</span></div><div><strong>{data.lessons.length}</strong><span>Darslar</span></div><div><strong>{data.quizzes.length}</strong><span>Testlar</span></div></Panel><Panel className="overview-guide"><span className="eyebrow">ESLATMA</span><h3>Bilim harakat bilan mustahkamlanadi.</h3><p>Darsdan keyin kichik amaliy mashqni bajarib ko‘ring.</p></Panel></aside>
    </div> : null}
    {tab === "lessons" ? <LessonsTab room={room} lessons={data.lessons} session={session} refresh={refresh} notify={notify} /> : null}
    {tab === "assignments" ? <AssignmentsTab room={room} assignments={data.assignments} lessons={data.lessons} session={session} refresh={refresh} refreshProgress={refreshProgress} notify={notify} /> : null}
    {tab === "quizzes" ? <QuizzesTab room={room} quizzes={data.quizzes} lessons={data.lessons} session={session} refresh={refresh} refreshProgress={refreshProgress} notify={notify} /> : null}
    {tab === "ai" ? <AiTab room={room} session={session} /> : null}
    {tab === "games" ? <GamesTab room={room} session={session} onNavigate={navigate} /> : null}
    {tab === "live" ? <LiveTab room={room} sessions={data.sessions} lessons={data.lessons} session={session} onSessionChange={updateLiveSession} notify={notify} demoMode={demoMode} /> : null}
    {tab === "labs" ? <Suspense fallback={<Panel><p className="muted">Laboratoriya yuklanmoqda...</p></Panel>}><LabsTab room={room} labs={data.labs} lessons={data.lessons} session={session} refresh={refresh} refreshProgress={refreshProgress} notify={notify} /></Suspense> : null}
    {tab === "progress" && !staff ? <ProgressTab progress={progress} navigate={navigate} room={room} session={session} /> : null}
    {tab === "chat" ? <ChatTab room={room} members={data.members} session={session} notify={notify} /> : null}
    {tab === "materials" ? <MaterialsTab room={room} session={session} notify={notify} /> : null}
    {tab === "members" ? <MembersTab room={room} members={data.members} session={session} refresh={refresh} notify={notify} /> : null}
    {inviteOpen ? <Modal title="Guruhga taklif" description="Kod faqat shu yerda ko‘rsatiladi. Uni kerakli odamga yuboring." onClose={() => setInviteOpen(false)}>{invite ? <div className="invite-result"><span className="eyebrow">TAKLIF KODI</span><code>{invite.code}</code><p>Kod {new Date(invite.expiresAt).toLocaleString("uz-UZ")} gacha amal qiladi.</p><Button onClick={copyCode}><Copy size={17} /> Kodni nusxalash</Button></div> : <div className="modal-form">{room.mode === "course" ? <Select label="Taklif roli" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}><option value="student">O‘quvchi</option>{room.role === "owner" ? <><option value="teacher">Ustoz</option><option value="assistant">Yordamchi ustoz</option></> : null}</Select> : <p>Oddiy chatga qo‘shilganlar “A’zo” bo‘ladi.</p>}<div className="modal-actions"><Button variant="secondary" onClick={() => setInviteOpen(false)}>Bekor qilish</Button><Button onClick={makeInvite} loading={busy}>Kod yaratish <ArrowRight size={16} /></Button></div></div>}</Modal> : null}
  </div>;
}
