import { useState } from "react";
import { BookOpen, CalendarDays, Plus } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { dateTimeLabel } from "../../lib/date.js";
import { Badge, Button, EmptyState, Field, Modal, Panel, SectionHeading, TextArea } from "../../components/ui.jsx";
import LearningResources from "./LearningResources.jsx";

export default function LessonsTab({ room, lessons, session, refresh, notify }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", startsAt: "", endsAt: "" });
  const [selectedId, setSelectedId] = useState(null);
  const staff = room.role !== "student";

  async function create(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const created = await api("/classrooms/" + room.id + "/lessons", {
        method: "POST", token: session.token,
        body: {
          title: form.title, description: form.description || undefined,
          startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        },
      });
      setOpen(false); setSelectedId(created.lesson.id); setForm({ title: "", description: "", startsAt: "", endsAt: "" });
      await refresh(); notify("Dars qo‘shildi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  const ordered = [...lessons].sort((a, b) => new Date(a.startsAt || a.createdAt) - new Date(b.startsAt || b.createdAt));

  return <div className="module-page page-enter">
    <SectionHeading eyebrow="DARS JADVALI" title="Darslar" description="Guruhdagi barcha darslar va ularning vaqti." action={staff ? <Button onClick={() => setOpen(true)}><Plus size={17} /> Dars qo‘shish</Button> : null} />
    {ordered.length ? <div className="lesson-list">{ordered.map((lesson, index) => <Panel className="lesson-row" key={lesson.id}>
      <div className="lesson-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="lesson-body"><div className="list-heading"><h3>{lesson.title}</h3><Badge tone={lesson.status === "scheduled" ? "teal" : "neutral"}>{lesson.status === "scheduled" ? "REJALANGAN" : "QORALAMA"}</Badge></div><p>{lesson.description || "Bu dars uchun tavsif yozilmagan."}</p><span className="list-meta"><CalendarDays size={15} /> {dateTimeLabel(lesson.startsAt)}{lesson.endsAt ? " — " + dateTimeLabel(lesson.endsAt) : ""}</span><div className="lesson-resource-action"><Button variant="secondary" onClick={() => setSelectedId(selectedId === lesson.id ? null : lesson.id)}>{selectedId === lesson.id ? "Materiallarni yopish" : "Fayl va havolalarni ko‘rish"}</Button></div>{selectedId === lesson.id ? <LearningResources room={room} session={session} kind="lesson" parentId={lesson.id} staff={staff} /> : null}</div>
    </Panel>)}</div> : <Panel><EmptyState icon={BookOpen} title="Hali dars qo‘shilmagan" description={staff ? "Birinchi darsni yarating va o‘quvchilar uchun jadvalni boshlang." : "Ustoz dars qo‘shganda shu yerda ko‘rinadi."} action={staff ? <Button onClick={() => setOpen(true)}>Birinchi darsni yaratish</Button> : null} /></Panel>}
    {open ? <Modal title="Yangi dars" description="Mavzu va vaqtni kiriting. Saqlagach video, rasm, PDF, Excel va havolalarni qo‘shasiz." onClose={() => setOpen(false)}><form className="modal-form" onSubmit={create}><Field label="Dars mavzusi" placeholder="Masalan, Elektr zanjiri" minLength={3} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required autoFocus /><TextArea label="Tavsif" rows={3} placeholder="Darsda nimalar o‘rganiladi?" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><div className="form-row"><Field label="Boshlanish vaqti" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /><Field label="Tugash vaqti" type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></div>{error ? <div className="form-error" role="alert">{error}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" loading={busy}>Darsni saqlash</Button></div></form></Modal> : null}
  </div>;
}
