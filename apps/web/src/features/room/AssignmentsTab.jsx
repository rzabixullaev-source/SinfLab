import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, Clock3, Plus, Send } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { dateTimeLabel } from "../../lib/date.js";
import { Badge, Button, EmptyState, Field, Modal, Panel, SectionHeading, Select, TextArea } from "../../components/ui.jsx";

const statusLabel = { draft: "QORALAMA", published: "E’LON QILINGAN", submitted: "TEKSHIRILMOQDA", needs_revision: "TUZATISH KERAK", accepted: "QABUL QILINGAN" };

export default function AssignmentsTab({ room, assignments, lessons, session, refresh, refreshProgress, notify }) {
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", instructions: "", lessonId: "", dueAt: "" });
  const [answer, setAnswer] = useState("");
  const [reviewId, setReviewId] = useState(null);
  const [feedback, setFeedback] = useState({ body: "", score: "", needsRevision: false });
  const staff = room.role !== "student";
  const prefix = "/classrooms/" + room.id + "/assignments";

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    let active = true;
    setLoading(true);
    api(prefix + "/" + selected + "/submissions" + (staff ? "" : "/me"), { token: session.token })
      .then((result) => { if (active) setDetail(staff ? result.submissions : result.submission); })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, prefix, staff, session.token]);

  async function reloadDetail(id = selected) {
    if (!id) return;
    const result = await api(prefix + "/" + id + "/submissions" + (staff ? "" : "/me"), { token: session.token });
    setDetail(staff ? result.submissions : result.submission);
  }

  async function create(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api(prefix, { method: "POST", token: session.token, body: {
        title: form.title, instructions: form.instructions,
        lessonId: form.lessonId || undefined, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      } });
      setOpen(false); setForm({ title: "", instructions: "", lessonId: "", dueAt: "" });
      await refresh(); notify("Vazifa qoralamasi yaratildi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function publish(item) {
    setBusy(true);
    try { await api(prefix + "/" + item.id + "/publish", { method: "POST", token: session.token }); await refresh(); notify("Vazifa e’lon qilindi."); }
    catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function submitWork(event) {
    event.preventDefault(); setBusy(true);
    try { await api(prefix + "/" + selected + "/submissions", { method: "POST", token: session.token, body: { body: answer } }); setAnswer(""); await reloadDetail(); await refreshProgress(); notify("Ishingiz ustozga yuborildi."); }
    catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function sendFeedback(event) {
    event.preventDefault(); setBusy(true);
    try {
      await api(prefix + "/" + selected + "/submissions/" + reviewId + "/feedback", { method: "POST", token: session.token,
        body: { body: feedback.body, score: feedback.score === "" ? undefined : Number(feedback.score), needsRevision: feedback.needsRevision } });
      setReviewId(null); setFeedback({ body: "", score: "", needsRevision: false }); await reloadDetail(); notify("Fikr yuborildi.");
    } catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }

  const active = assignments.find((item) => item.id === selected);
  return <div className="module-page page-enter"><SectionHeading eyebrow="MUSTAQIL ISH" title="Vazifalar" description={staff ? "Qoralama yarating, e’lon qiling va ishlarni tekshiring." : "Topshiriqni yuboring va ustoz fikriga ko‘ra davom ettiring."} action={staff ? <Button onClick={() => { setError(""); setOpen(true); }}><Plus size={17} /> Vazifa yaratish</Button> : null} />
    {assignments.length ? <div className="assignment-layout"><div className="item-list">{assignments.map((item) => <button className={"item-card " + (selected === item.id ? "selected" : "")} key={item.id} onClick={() => { setSelected(item.id); setError(""); }}><span className="item-card-icon"><ClipboardList size={20} /></span><span className="item-card-copy"><strong>{item.title}</strong><small>{item.dueAt ? "Muddat: " + dateTimeLabel(item.dueAt) : "Muddat belgilanmagan"}</small></span><Badge tone={item.status === "published" ? "teal" : "neutral"}>{statusLabel[item.status]}</Badge></button>)}</div>
    <Panel className="detail-panel">{!active ? <EmptyState icon={ClipboardList} title="Vazifani tanlang" description="Tafsilot va topshirilgan ishlar shu yerda ochiladi." /> : <><div className="detail-head"><Badge tone={active.status === "published" ? "teal" : "neutral"}>{statusLabel[active.status]}</Badge><h3>{active.title}</h3><p>{active.instructions}</p>{active.dueAt ? <span className="list-meta"><Clock3 size={15} /> {dateTimeLabel(active.dueAt)}</span> : null}{staff && active.status === "draft" ? <Button onClick={() => publish(active)} loading={busy}><Send size={16} /> E’lon qilish</Button> : null}</div>
      {active.status === "published" ? <div className="detail-content">{loading ? <p className="muted">Ishlar yuklanmoqda...</p> : error ? <div className="form-error">{error}</div> : staff ? <><h4>Topshirilgan ishlar · {detail?.length ?? 0}</h4>{detail?.length ? detail.map((work) => <div className="submission-card" key={work.id}><div className="submission-heading"><strong>O‘quvchi ID: {work.studentId.slice(-6)}</strong><Badge tone={work.status === "accepted" ? "teal" : work.status === "needs_revision" ? "gold" : "neutral"}>{statusLabel[work.status]}</Badge></div>{work.revisions.map((revision) => <div className="revision" key={revision.id}><small>{revision.version}-versiya · {dateTimeLabel(revision.submittedAt)}</small><p>{revision.body}</p></div>)}{work.feedback.map((entry) => <div className="feedback-note" key={entry.id}><strong>Ustoz fikri {entry.score !== null ? "· " + entry.score + "/100" : ""}</strong><p>{entry.body}</p></div>)}{work.status === "submitted" ? reviewId === work.id ? <form className="feedback-form" onSubmit={sendFeedback}><TextArea label="O‘quvchiga fikr" value={feedback.body} onChange={(event) => setFeedback({ ...feedback, body: event.target.value })} required rows={3} /><Field label="Baho (0–100)" type="number" min={0} max={100} value={feedback.score} onChange={(event) => setFeedback({ ...feedback, score: event.target.value })} /><label className="checkbox-line"><input type="checkbox" checked={feedback.needsRevision} onChange={(event) => setFeedback({ ...feedback, needsRevision: event.target.checked })} /> Tuzatish so‘rash</label><div className="inline-actions"><Button type="button" variant="secondary" onClick={() => setReviewId(null)}>Bekor qilish</Button><Button type="submit" loading={busy}>Fikr yuborish</Button></div></form> : <Button variant="secondary" onClick={() => setReviewId(work.id)}>Fikr bildirish <ArrowRight size={16} /></Button> : null}</div>) : <EmptyState icon={ClipboardList} title="Hali ish topshirilmagan" description="O‘quvchilar yuborgan ishlar shu yerda ko‘rinadi." />}</> : <><h4>Mening ishim</h4>{detail ? <><Badge tone={detail.status === "accepted" ? "teal" : detail.status === "needs_revision" ? "gold" : "neutral"}>{statusLabel[detail.status]}</Badge>{detail.revisions.map((revision) => <div className="revision" key={revision.id}><small>{revision.version}-versiya · {dateTimeLabel(revision.submittedAt)}</small><p>{revision.body}</p></div>)}{detail.feedback.map((entry) => <div className="feedback-note" key={entry.id}><strong>Ustoz fikri {entry.score !== null ? "· " + entry.score + "/100" : ""}</strong><p>{entry.body}</p></div>)}</> : <p className="muted">Bu vazifa hali topshirilmagan.</p>}{!detail || detail.status === "needs_revision" ? <form className="submission-form" onSubmit={submitWork}><TextArea label={detail ? "Tuzatilgan yechim" : "Yechimingiz"} rows={5} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Yechim bosqichlarini yozing..." required /><Button type="submit" loading={busy}><Send size={16} /> {detail ? "Qayta yuborish" : "Vazifani topshirish"}</Button></form> : detail.status === "submitted" ? <p className="muted"><Clock3 size={16} /> Ustoz fikri kutilmoqda.</p> : <p className="accepted-line"><CheckCircle2 size={17} /> Vazifa qabul qilingan.</p>}</>}</div> : null}</>}</Panel></div> : <Panel><EmptyState icon={ClipboardList} title="Hali vazifa yo‘q" description={staff ? "O‘quvchilarga birinchi mustaqil ishni bering." : "Ustoz vazifa e’lon qilganda shu yerda ko‘rinadi."} action={staff ? <Button onClick={() => setOpen(true)}>Vazifa yaratish</Button> : null} /></Panel>}
    {open ? <Modal title="Yangi vazifa" description="Qoralama yaratiladi. O‘quvchilarga ko‘rinishi uchun keyin e’lon qiling." onClose={() => setOpen(false)}><form className="modal-form" onSubmit={create}><Field label="Vazifa nomi" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} required autoFocus /><TextArea label="Ko‘rsatma" rows={4} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} required /><Select label="Darsga bog‘lash" value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value })}><option value="">Dars tanlanmagan</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</Select><Field label="Topshirish muddati" type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} />{error ? <div className="form-error">{error}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" loading={busy}>Qoralamani saqlash</Button></div></form></Modal> : null}
  </div>;
}
