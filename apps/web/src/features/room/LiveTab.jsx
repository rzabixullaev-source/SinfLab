import { useEffect, useState } from "react";
import { ExternalLink, Plus, Radio, Users } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { dateTimeLabel } from "../../lib/date.js";
import { Badge, Button, EmptyState, Field, Modal, Panel, SectionHeading, Select } from "../../components/ui.jsx";
import ZoomClassroom from "./ZoomClassroom.jsx";
import BrowserClassroom from "./BrowserClassroom.jsx";

export default function LiveTab({ room, sessions, lessons, session, onSessionChange, notify, demoMode }) {
  const staff = room.role !== "student";
  const prefix = "/classrooms/" + room.id + "/live-sessions";
  const [rows, setRows] = useState(sessions);
  const [selected, setSelected] = useState(sessions.find((item) => item.status === "live")?.id ?? null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("browser");
  const [form, setForm] = useState({ title: "", lessonId: "", provider: "meet", joinUrl: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setRows(sessions);
    if (!selected) setSelected(sessions.find((item) => item.status === "live")?.id ?? null);
  }, [sessions, selected]);

  async function create(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = kind !== "external"
        ? await api(prefix + (kind === "zoom_sdk" ? "/zoom" : "/browser"), {
          method: "POST", token: session.token,
          body: { title: form.title, lessonId: form.lessonId || undefined },
        })
        : await api(prefix, {
          method: "POST", token: session.token,
          body: { lessonId: form.lessonId, provider: form.provider, joinUrl: form.joinUrl },
        });
      setOpen(false); setForm({ title: "", lessonId: "", provider: "meet", joinUrl: "" });
      onSessionChange(result.session);
      setSelected(result.session.id);
      notify(kind === "browser" ? "Kamera darsi tayyor. Boshlaganingizda guruhga xabar boradi." : "Uchrashuv havolasi e’lon qilindi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function finishExternal(item) {
    setBusy(true);
    try {
      const result = await api(prefix + "/" + item.id + "/end", { method: "POST", token: session.token });
      onSessionChange(result.session);
      notify("Jonli dars yakunlandi.");
    } catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function checkIn(item) {
    try {
      await api(prefix + "/" + item.id + "/check-in", { method: "POST", token: session.token });
      notify("Qatnashish qayd qilindi.");
    } catch (cause) { notify(errorText(cause)); }
  }

  const active = rows.find((item) => item.id === selected);
  return <div className="module-page page-enter">
    <SectionHeading eyebrow="ONLAYN DARSLAR" title="Jonli dars" description="Ustoz tanlangan guruh uchun dars ochadi. O‘quvchilar xabar oladi va gapirish uchun qo‘l ko‘taradi." action={staff ? <Button onClick={() => { setKind("browser"); setError(""); setOpen(true); }}><Plus size={17} /> Jonli dars ochish</Button> : null} />
    {rows.length ? <div className="live-room-layout"><div className="item-list">{[...rows].reverse().map((item) => <button key={item.id} className={"item-card " + (selected === item.id ? "selected" : "")} onClick={() => setSelected(item.id)}><span className="item-card-icon"><Radio size={20} /></span><span className="item-card-copy"><strong>{item.title || lessons.find((lesson) => lesson.id === item.lessonId)?.title || "Jonli dars"}</strong><small>{item.provider === "browser_webrtc" ? "Kamera darsi" : item.provider === "zoom_video_sdk" ? "Zoom Video SDK" : item.provider === "zoom" ? "Zoom havola" : "Tashqi havola"} · {item.startedAt ? dateTimeLabel(item.startedAt) : "Tayyorlanmoqda"}</small></span><Badge tone={item.status === "live" ? "gold" : "neutral"}>{item.status === "live" ? "JONLI" : item.status === "preparing" ? "TAYYOR" : "TUGAGAN"}</Badge></button>)}</div>
    <div>{!active ? <Panel><EmptyState icon={Radio} title="Darsni tanlang" description="Uchrashuv va qo‘l ko‘tarish oynasi shu yerda ochiladi." /></Panel> : active.provider === "browser_webrtc" ? <BrowserClassroom key={active.id} room={room} item={active} session={session} notify={notify} onActivated={(next) => onSessionChange(next)} onEnded={(id) => onSessionChange({ ...active, id, status: "ended", endedAt: new Date().toISOString() })} /> : active.provider === "zoom_video_sdk" ? <ZoomClassroom key={active.id} room={room} item={active} session={session} demoMode={demoMode} notify={notify} onActivated={(next) => onSessionChange(next)} onEnded={(id) => onSessionChange({ ...active, id, status: "ended", endedAt: new Date().toISOString() })} /> : <Panel className="external-live-detail"><Badge tone={active.status === "live" ? "gold" : "neutral"}>{active.status === "live" ? "JONLI DARS" : "YAKUNLANGAN"}</Badge><h3>{lessons.find((lesson) => lesson.id === active.lessonId)?.title || "Jonli dars"}</h3><p>{active.provider === "meet" ? "Google Meet" : active.provider === "zoom" ? "Zoom" : "Boshqa xizmat"} havolasi · {dateTimeLabel(active.startedAt)}</p>{active.status === "live" ? staff ? <div className="inline-actions"><a className="btn btn-secondary" href={active.joinUrl} target="_blank" rel="noopener noreferrer">Uchrashuvga o‘tish <ExternalLink size={16} /></a><Button variant="secondary" onClick={() => finishExternal(active)} loading={busy}>Yakunlash</Button></div> : <a className="btn btn-primary" href={active.joinUrl} target="_blank" rel="noopener noreferrer" onClick={() => checkIn(active)}>Darsga kirish <ExternalLink size={16} /></a> : null}</Panel>}</div></div> : <Panel><EmptyState icon={Radio} title="Jonli dars yo‘q" description={staff ? "Guruh uchun birinchi jonli darsni oching." : "Ustoz dars boshlaganda sizga xabar keladi."} action={staff ? <Button onClick={() => setOpen(true)}><Plus size={16} /> Dars ochish</Button> : null} /></Panel>}
    {open ? <Modal title="Guruh uchun jonli dars" description={"Tanlangan guruh: " + room.name} onClose={() => setOpen(false)}><form className="modal-form" onSubmit={create}><div className="live-kind-switch"><button type="button" className={kind === "browser" ? "active" : ""} onClick={() => setKind("browser")}>Kamera darsi</button><button type="button" className={kind === "zoom_sdk" ? "active" : ""} onClick={() => setKind("zoom_sdk")}>Zoom Video SDK</button><button type="button" className={kind === "external" ? "active" : ""} onClick={() => setKind("external")}>Tayyor havola</button></div><div className="group-target"><Users size={17} /><span><small>GURUH</small><strong>{room.name}</strong></span></div>{kind !== "external" ? <Field label="Dars nomi" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Masalan, Bugungi fizika darsi" minLength={3} maxLength={120} required /> : null}<Select label="Darsga bog‘lash" value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value })} required={kind === "external"}><option value="">Dars tanlanmagan</option>{lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.title}</option>)}</Select>{kind === "external" ? <><Select label="Xizmat" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}><option value="meet">Google Meet</option><option value="zoom">Zoom</option><option value="other">Boshqa</option></Select><Field label="HTTPS uchrashuv havolasi" type="url" pattern="https://.*" value={form.joinUrl} onChange={(event) => setForm({ ...form, joinUrl: event.target.value })} placeholder="https://..." required /></> : <p className="modal-hint">Kamera darsi boshlangach guruhga xabar boradi. Gapirish uchun qo‘l ko‘taring.</p>}{error ? <div className="form-error" role="alert">{error}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" loading={busy}>Dars xonasini yaratish</Button></div></form></Modal> : null}
  </div>;
}
