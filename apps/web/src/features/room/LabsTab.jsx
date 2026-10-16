import { useEffect, useState } from "react";
import { Activity, CheckCircle2, FlaskConical, Plus, RotateCcw } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button, EmptyState, Field, Modal, Panel, SectionHeading, Select } from "../../components/ui.jsx";

export default function LabsTab({ room, labs, lessons, session, refresh, refreshProgress, notify }) {
  const staff = room.role !== "student";
  const prefix = "/classrooms/" + room.id + "/labs";
  const [selected, setSelected] = useState(null);
  const [runs, setRuns] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", lessonId: "", maxVoltage: 24, minResistance: 1, maxResistance: 100, tolerancePercent: 5 });
  const [experiment, setExperiment] = useState({ voltage: 12, resistance: 6, predictedCurrent: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = labs.find((item) => item.id === selected);
  useEffect(() => {
    if (!selected) { setRuns(null); return; }
    let alive = true; setRuns(null);
    api(prefix + "/" + selected + "/runs", { token: session.token }).then((result) => { if (alive) setRuns(result.runs); }).catch((cause) => { if (alive) setError(errorText(cause)); });
    return () => { alive = false; };
  }, [selected, prefix, session.token]);
  async function create(event) {
    event.preventDefault(); setBusy(true); setError("");
    try { await api(prefix, { method: "POST", token: session.token, body: { ...form, lessonId: form.lessonId || undefined, maxVoltage: Number(form.maxVoltage), minResistance: Number(form.minResistance), maxResistance: Number(form.maxResistance), tolerancePercent: Number(form.tolerancePercent) } }); setOpen(false); await refresh(); notify("Laboratoriya qo‘shildi."); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function run(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = { voltage: Number(experiment.voltage), resistance: Number(experiment.resistance), predictedCurrent: Number(experiment.predictedCurrent) };
      const result = await api(prefix + "/" + selected + "/runs", { method: "POST", token: session.token, body });
      setRuns([...(runs || []), result.run]); await refreshProgress(); notify(result.run.correct ? "To‘g‘ri! Hisobingiz mos keldi." : "Natijani ko‘ring va yana urinib ko‘ring.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  return <div className="module-page page-enter"><SectionHeading eyebrow="AMALIY TAJRIBA" title="Laboratoriya" description="Ohm qonunini virtual zanjirda sinab ko‘ring: kuchlanish ÷ qarshilik = tok kuchi." action={staff ? <Button onClick={() => { setError(""); setOpen(true); }}><Plus size={17} /> Mashq yaratish</Button> : null} />
    {labs.length ? <div className="assignment-layout"><div className="item-list">{labs.map((item) => <button key={item.id} className={"item-card " + (selected === item.id ? "selected" : "")} onClick={() => { setSelected(item.id); setExperiment({ voltage: Math.min(12, item.maxVoltage), resistance: Math.max(6, item.minResistance), predictedCurrent: "" }); setError(""); }}><span className="item-card-icon"><FlaskConical size={20} /></span><span className="item-card-copy"><strong>{item.title}</strong><small>Ohm qonuni · virtual tajriba</small></span></button>)}</div><Panel className="detail-panel">{active ? <><div className="detail-head"><Badge tone="teal">FIZIKA</Badge><h3>{active.title}</h3><p>Ruxsat: 0–{active.maxVoltage} V · {active.minResistance}–{active.maxResistance} Ω · xatolik ≤{active.tolerancePercent}%</p></div><div className="detail-content">{error ? <div className="form-error">{error}</div> : null}{staff ? <><h4>O‘quvchilar tajribalari · {runs?.length ?? 0}</h4>{runs?.map((item) => <div className="result-row" key={item.id}><span>{item.studentId.slice(-6)} · {item.voltage} V / {item.resistance} Ω</span><Badge tone={item.correct ? "teal" : "gold"}>{item.correct ? "TO‘G‘RI" : "TAKRORLASH"}</Badge></div>)}</> : <><div className="circuit-visual"><span>V</span><div className="circuit-line"><Activity size={28} /><b>R</b></div><span>I = V / R</span></div><form className="lab-form" onSubmit={run}><div className="form-row"><Field label="Kuchlanish (V)" type="number" min={0} max={active.maxVoltage} step="any" value={experiment.voltage} onChange={(event) => setExperiment({ ...experiment, voltage: event.target.value })} required /><Field label="Qarshilik (Ω)" type="number" min={active.minResistance} max={active.maxResistance} step="any" value={experiment.resistance} onChange={(event) => setExperiment({ ...experiment, resistance: event.target.value })} required /></div><Field label="Taxminiy tok kuchi (A)" type="number" min={0} step="any" value={experiment.predictedCurrent} onChange={(event) => setExperiment({ ...experiment, predictedCurrent: event.target.value })} placeholder="Hisoblab yozing" required /><Button type="submit" loading={busy}><RotateCcw size={16} /> Tajribani ishga tushirish</Button></form><h4>Tajriba tarixi</h4>{runs?.length ? [...runs].reverse().map((item) => <div className="lab-result" key={item.id}><span className={item.correct ? "good" : "retry"}>{item.correct ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}</span><div><strong>{item.correct ? "Hisob mos keldi" : "Yana urinib ko‘ring"}</strong><small>Taxmin {item.predictedCurrent} A · haqiqiy {Number(item.actualCurrent).toFixed(3)} A · xatolik {Number(item.errorPercent).toFixed(1)}%</small></div></div>) : <p className="muted">Birinchi tajribani boshlang.</p>}</>}</div></> : <EmptyState icon={FlaskConical} title="Mashqni tanlang" description="Virtual zanjir shu yerda ochiladi." />}</Panel></div> : <Panel><EmptyState icon={FlaskConical} title="Laboratoriya bo‘sh" description={staff ? "Birinchi tajribani yarating." : "Ustoz mashq qo‘shganda shu yerda ko‘rinadi."} /></Panel>}
    {open ? <Modal title="Ohm qonuni mashqi" onClose={() => setOpen(false)}><form className="modal-form" onSubmit={create}><Field label="Mashq nomi" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} required /><Select label="Darsga bog‘lash" value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value })}><option value="">Dars tanlanmagan</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</Select><div className="form-row"><Field label="Eng katta kuchlanish (V)" type="number" min={1} max={48} value={form.maxVoltage} onChange={(event) => setForm({ ...form, maxVoltage: event.target.value })} required /><Field label="Xatolik chegarasi (%)" type="number" min={1} max={30} value={form.tolerancePercent} onChange={(event) => setForm({ ...form, tolerancePercent: event.target.value })} required /><Field label="Eng kichik qarshilik (Ω)" type="number" min={0.1} max={100} step="any" value={form.minResistance} onChange={(event) => setForm({ ...form, minResistance: event.target.value })} required /><Field label="Eng katta qarshilik (Ω)" type="number" min={1} max={1000} step="any" value={form.maxResistance} onChange={(event) => setForm({ ...form, maxResistance: event.target.value })} required /></div>{error ? <div className="form-error">{error}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" loading={busy}>Mashqni saqlash</Button></div></form></Modal> : null}
  </div>;
}
