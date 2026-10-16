import { useState } from "react";
import { CalendarDays, ExternalLink, Plus, Radio, Square } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { dateTimeLabel } from "../../lib/date.js";
import { Badge, Button, EmptyState, Field, Modal, Panel, SectionHeading, Select } from "../../components/ui.jsx";

export default function LiveTab({ room, sessions, lessons, session, refresh, notify }) {
  const staff = room.role !== "student";
  const prefix = "/classrooms/" + room.id + "/live-sessions";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lessonId: "", provider: "meet", joinUrl: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState({});

  async function create(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api(prefix, { method: "POST", token: session.token, body: form }); setOpen(false); setForm({ lessonId: "", provider: "meet", joinUrl: "" }); await refresh(); notify("Jonli dars boshlandi."); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function finish(item) {
    setBusy(true);
    try { await api(prefix + "/" + item.id + "/end", { method: "POST", token: session.token }); await refresh(); notify("Jonli dars yakunlandi."); }
    catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function enter(item) {
    try {
      await api(prefix + "/" + item.id + "/check-in", { method: "POST", token: session.token });
      setJoined({ ...joined, [item.id]: true });
      notify("Qatnashish qayd qilindi.");
    } catch (cause) { notify(errorText(cause)); }
  }
  async function leave(item) {
    setBusy(true);
    try { await api(prefix + "/" + item.id + "/check-out", { method: "POST", token: session.token }); setJoined({ ...joined, [item.id]: false }); notify("Darsdan chiqish qayd qilindi."); }
    catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }
  return <div className="module-page page-enter"><SectionHeading eyebrow="ONLAYN DARSLAR" title="Jonli dars" description="Zoom yoki Google Meet havolasi orqali uchrashing. Qatnashish platformada qayd etiladi." action={staff ? <Button onClick={() => { setError(""); setOpen(true); }} disabled={!lessons.length}><Plus size={17} /> Dars boshlash</Button> : null} />
    {sessions.length ? <div className="lesson-list">{[...sessions].reverse().map((item) => <Panel className="live-session-card" key={item.id}><span className="live-session-icon"><Radio size={21} /></span><div className="live-session-copy"><div className="list-heading"><h3>{lessons.find((lesson) => lesson.id === item.lessonId)?.title || "Jonli dars"}</h3><Badge tone={item.status === "live" ? "gold" : "neutral"}>{item.status === "live" ? "JONLI" : "YAKUNLANGAN"}</Badge></div><p>{item.provider === "meet" ? "Google Meet" : item.provider === "zoom" ? "Zoom" : "Boshqa xizmat"} · {dateTimeLabel(item.startedAt)}</p></div>{item.status === "live" ? staff ? <div className="inline-actions"><a className="btn btn-secondary" href={item.joinUrl} target="_blank" rel="noopener noreferrer">Uchrashuv <ExternalLink size={16} /></a><Button variant="secondary" onClick={() => finish(item)} loading={busy}><Square size={15} /> Yakunlash</Button></div> : <div className="inline-actions">{joined[item.id] ? <Button variant="secondary" onClick={() => leave(item)} loading={busy}>Chiqishni qayd etish</Button> : null}<a className="btn btn-primary" href={item.joinUrl} target="_blank" rel="noopener noreferrer" onClick={() => enter(item)}><ExternalLink size={16} /> Darsga kirish</a></div> : null}</Panel>)}</div> : <Panel><EmptyState icon={Radio} title="Jonli dars yo‘q" description={staff ? "Avval dars yarating, so‘ng uchrashuv havolasini biriktiring." : "Ustoz jonli darsni boshlaganda bu yerda ko‘rinadi."} /></Panel>}
    {open ? <Modal title="Jonli dars boshlash" description="Uchrashuv havolasi HTTPS bilan boshlanishi kerak." onClose={() => setOpen(false)}><form className="modal-form" onSubmit={create}><Select label="Dars" value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value })} required><option value="">Dars tanlang</option>{lessons.map((lesson) => <option value={lesson.id} key={lesson.id}>{lesson.title}</option>)}</Select><Select label="Uchrashuv xizmati" value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}><option value="meet">Google Meet</option><option value="zoom">Zoom</option><option value="other">Boshqa</option></Select><Field label="Uchrashuv havolasi" type="url" value={form.joinUrl} onChange={(event) => setForm({ ...form, joinUrl: event.target.value })} placeholder="https://..." pattern="https://.*" required />{error ? <div className="form-error">{error}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" loading={busy}><CalendarDays size={16} /> Boshlash</Button></div></form></Modal> : null}
  </div>;
}
