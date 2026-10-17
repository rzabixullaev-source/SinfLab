import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Atom, Bell, BookOpen, CircleHelp, Home, LogOut, Menu, Plus, Radio, UserRound, X } from "lucide-react";
import AuthScreen from "./features/AuthScreen.jsx";
import Dashboard from "./features/Dashboard.jsx";
import RoomPage from "./features/RoomPage.jsx";
import { Button, Field, Modal, Select, TextArea } from "./components/ui.jsx";
import { api, errorText, readSession, saveSession } from "./lib/api.js";

function currentRoute() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/");
  return parts[0] === "room" && parts[1]
    ? { roomId: parts[1], tab: parts[2] || "overview" }
    : { roomId: null, tab: "home" };
}

function initials(name) {
  return (name || "S").trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export default function App() {
  const [session, setSession] = useState(readSession);
  const [booting, setBooting] = useState(Boolean(readSession()));
  const [rooms, setRooms] = useState([]);
  const [route, setRoute] = useState(currentRoute);
  const [demoMode, setDemoMode] = useState(false);
  const [modal, setModal] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", description: "", mode: "course", code: "" });
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const seenLiveAlerts = useRef(new Set());

  useEffect(() => {
    const update = () => { setRoute(currentRoute()); setNavOpen(false); };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  useEffect(() => {
    api("/demo-status").then(() => setDemoMode(true)).catch(() => setDemoMode(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!session?.token) { setLiveAlerts([]); seenLiveAlerts.current.clear(); return; }
    let active = true;
    async function checkLiveAlerts() {
      try {
        const result = await api("/classrooms/live-alerts", { token: session.token });
        if (!active) return;
        const next = result.alerts ?? [];
        const fresh = next.find((item) => !seenLiveAlerts.current.has(item.session.id));
        next.forEach((item) => seenLiveAlerts.current.add(item.session.id));
        setLiveAlerts(next);
        if (fresh) setToast(fresh.classroomName + " guruhida jonli dars boshlandi.");
      } catch {
        if (active) setLiveAlerts([]);
      }
    }
    checkLiveAlerts();
    const timer = setInterval(checkLiveAlerts, 8000);
    return () => { active = false; clearInterval(timer); };
  }, [session?.token]);

  const refreshRooms = useCallback(async (token = session?.token) => {
    if (!token) return;
    const result = await api("/classrooms", { token });
    setRooms(result.classrooms);
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token) { setBooting(false); return; }
    let active = true;
    Promise.all([api("/auth/me", { token: session.token }), api("/classrooms", { token: session.token })])
      .then(([profile, roomList]) => {
        if (!active) return;
        setSession((previous) => {
          const next = { token: previous.token, user: profile.user };
          saveSession(next);
          return next;
        });
        setRooms(roomList.classrooms);
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) { saveSession(null); setSession(null); }
        else setToast(errorText(error));
      })
      .finally(() => { if (active) setBooting(false); });
    return () => { active = false; };
  }, [session?.token]);

  async function authenticate(mode, values) {
    const path = mode === "register" ? "/auth/register" : "/auth/login";
    const body = mode === "register"
      ? { displayName: values.displayName, email: values.email, password: values.password }
      : { email: values.email, password: values.password };
    const data = await api(path, { method: "POST", body });
    const next = { token: data.token, user: data.user };
    saveSession(next);
    setSession(next);
    window.location.hash = "/";
    setToast("Xush kelibsiz, " + data.user.displayName.split(" ")[0] + "!");
  }

  function logout() {
    saveSession(null);
    setSession(null);
    setRooms([]);
    setAlertsOpen(false);
    window.location.hash = "/";
  }

  function navigate(roomId, tab = "overview") {
    window.location.hash = roomId ? "/room/" + roomId + "/" + tab : "/";
  }

  function openModal(name) {
    setForm({ name: "", subject: "", description: "", mode: "course", code: "" });
    setModalError("");
    setModal(name);
  }

  async function submitModal(event) {
    event.preventDefault();
    setModalBusy(true);
    setModalError("");
    try {
      const result = modal === "create"
        ? await api("/classrooms", { method: "POST", token: session.token, body: { name: form.name, subject: form.subject || undefined, description: form.description || undefined, mode: form.mode } })
        : await api("/classrooms/join", { method: "POST", token: session.token, body: { code: form.code.trim() } });
      await refreshRooms();
      setModal(null);
      navigate(result.classroom.id);
      setToast(modal === "create" ? "Yangi xona yaratildi." : "Xonaga muvaffaqiyatli qo‘shildingiz.");
    } catch (error) {
      setModalError(errorText(error));
    } finally {
      setModalBusy(false);
    }
  }

  if (booting) return <div className="boot-screen"><span className="brand-mark"><Atom size={24} /></span><span>Sin<span>Lab</span></span><div className="boot-bar" /></div>;
  if (!session) return <AuthScreen onAuthenticate={authenticate} demoMode={demoMode} />;

  const selectedRoom = rooms.find((room) => room.id === route.roomId);

  return <div className="app-shell">
    {navOpen ? <button className="mobile-scrim" aria-label="Menyuni yopish" onClick={() => setNavOpen(false)} /> : null}
    <aside className={"sidebar " + (navOpen ? "sidebar-open" : "")}>
      <div className="sidebar-brand"><span className="brand-mark"><Atom size={22} strokeWidth={2} /></span><span>Sinf<span>Lab</span></span><button className="sidebar-mobile-close icon-button" onClick={() => setNavOpen(false)} aria-label="Menyuni yopish"><X size={19} /></button></div>
      <div className="sidebar-scroll">
        <div className="nav-caption">ISH MAYDONI</div>
        <button className={"side-link " + (!route.roomId ? "active" : "")} onClick={() => navigate(null)}><Home size={19} /> Bosh sahifa</button>
        <div className="nav-caption side-section-caption">O‘QUV XONALARI <button onClick={() => openModal("create")} aria-label="Xona yaratish"><Plus size={16} /></button></div>
        {rooms.length ? rooms.map((room) => <button key={room.id} className={"side-link room-side-link " + (route.roomId === room.id ? "active" : "")} onClick={() => navigate(room.id)}><span className="side-room-icon"><BookOpen size={16} /></span><span className="side-room-name">{room.name}</span></button>) : <div className="sidebar-empty">Hozircha xonalar yo‘q.</div>}
        <button className="side-link side-join" onClick={() => openModal("join")}><Plus size={18} /> Kod bilan qo‘shilish</button>
      </div>
      <div className="sidebar-bottom"><div className="sidebar-help"><CircleHelp size={18} /><span>Ta’lim bir joyda, aniq tartibda.</span></div><button className="sidebar-profile" onClick={logout} title="Hisobdan chiqish"><span className="profile-avatar">{initials(session.user.displayName)}</span><span><strong>{session.user.displayName}</strong><small>{session.user.email}</small></span><LogOut size={17} /></button></div>
    </aside>

    <div className="app-main">
      <header className="topbar"><div className="topbar-left"><button className="menu-button icon-button" onClick={() => setNavOpen(true)} aria-label="Menyuni ochish"><Menu size={21} /></button><span className="topbar-breadcrumb">SinfLab</span><span className="crumb-divider">/</span><strong>{selectedRoom?.name || "Bosh sahifa"}</strong></div><div className="topbar-right">{demoMode ? <span className="demo-pill">DEMO MUHIT</span> : null}<div className="live-alert-wrap"><button className="live-alert-button" aria-label={"Jonli dars xabarlari: " + liveAlerts.length} onClick={() => setAlertsOpen(!alertsOpen)}><Bell size={18} />{liveAlerts.length ? <span>{liveAlerts.length}</span> : null}</button>{alertsOpen ? <div className="live-alert-popover"><strong>Jonli dars xabarlari</strong>{liveAlerts.length ? liveAlerts.map((item) => <button key={item.session.id} onClick={() => { navigate(item.session.classroomId, "live"); setAlertsOpen(false); }}><Radio size={17} /><span><b>{item.session.title}</b><small>{item.classroomName} guruhida dars boshlandi</small></span><ArrowRight size={15} /></button>) : <p>Hozir jonli dars yo‘q.</p>}</div> : null}</div><span className="topbar-role"><UserRound size={15} /> {selectedRoom?.role === "student" ? "O‘quvchi" : selectedRoom ? "Ustoz" : "Profil"}</span><button className="topbar-avatar" onClick={logout} title="Hisobdan chiqish">{initials(session.user.displayName)}</button></div></header>
      <main className="main-content">{route.roomId
        ? <RoomPage key={route.roomId} session={session} roomId={route.roomId} tab={route.tab} navigate={(tab) => navigate(route.roomId, tab)} notify={setToast} refreshRooms={refreshRooms} demoMode={demoMode} />
        : <Dashboard session={session} rooms={rooms} onOpenRoom={navigate} onCreate={() => openModal("create")} onJoin={() => openModal("join")} />}
      </main>
    </div>

    {modal ? <Modal title={modal === "create" ? "Yangi o‘quv xonasi" : "Xonaga qo‘shilish"} description={modal === "create" ? "Darslar, materiallar va o‘quvchilar uchun yagona joy yarating." : "Ustozingiz yuborgan taklif kodini kiriting."} onClose={() => setModal(null)}>
      <form className="modal-form" onSubmit={submitModal}>
        {modal === "create" ? <><Field label="Xona nomi" placeholder="Masalan, Fizika 9-sinf" minLength={3} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoFocus /><Field label="Fan / yo‘nalish" placeholder="Fizika" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /><Select label="Xona turi" value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option value="course">Kurs xonasi</option><option value="club">O‘quv klubi</option></Select><TextArea label="Qisqacha tavsif" rows={3} placeholder="Bu xonada nimalarni o‘rganasiz?" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></> : <Field label="Taklif kodi" placeholder="Kodni shu yerga qo‘ying" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required autoFocus />}
        {modalError ? <div className="form-error" role="alert">{modalError}</div> : null}
        <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setModal(null)}>Bekor qilish</Button><Button type="submit" loading={modalBusy}>{modal === "create" ? "Xona yaratish" : "Qo‘shilish"}<ArrowRight size={16} /></Button></div>
      </form>
    </Modal> : null}
    {toast ? <div className="toast" role="status"><span className="toast-dot" />{toast}<button onClick={() => setToast("")} aria-label="Xabarni yopish"><X size={16} /></button></div> : null}
  </div>;
}
