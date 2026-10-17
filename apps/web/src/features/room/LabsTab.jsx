import { useEffect, useState } from "react";
import { Activity, ArrowRight, CheckCircle2, FlaskConical, Plus, RotateCcw } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button, EmptyState, Field, Modal, Panel, SectionHeading, Select } from "../../components/ui.jsx";
import LabScene3D, { estimatePh } from "./LabScene3D.jsx";
import "./lab-studio.css";

const catalog = {
  "physics-ohms-law": { subject: "Fizika", title: "Elektr zanjiri", description: "Kuchlanish va qarshilikni o‘zgartirib tokni hisoblang.", formula: "I = U / R", defaults: { maxVoltage: 24, minResistance: 1, maxResistance: 100, tolerancePercent: 5 }, config: [["maxVoltage", "Eng katta kuchlanish · V", 1, 48], ["minResistance", "Eng kichik qarshilik · Ω", 0.1, 100], ["maxResistance", "Eng katta qarshilik · Ω", 1, 1000], ["tolerancePercent", "Xatolik chegarasi · %", 1, 30]], run: [["voltage", "Kuchlanish · V", 0, 48], ["resistance", "Qarshilik · Ω", 0.1, 1000], ["predictedCurrent", "Taxminiy tok · A", 0, 100]] },
  "physics-pendulum": { subject: "Fizika", title: "Mayatnik harakati", description: "Uzunlik va burchak davrga qanday ta’sir qilishini o‘lchang.", formula: "T ≈ 2π√(L / g)", defaults: { minLength: 0.3, maxLength: 2, gravity: 9.81, tolerancePercent: 5 }, config: [["minLength", "Eng qisqa ip · m", 0.2, 2], ["maxLength", "Eng uzun ip · m", 0.5, 3], ["gravity", "Gravitatsiya · m/s²", 1, 20], ["tolerancePercent", "Xatolik chegarasi · %", 1, 30]], run: [["length", "Ip uzunligi · m", 0.2, 3], ["amplitudeDegrees", "Boshlang‘ich burchak · °", 2, 45], ["predictedPeriod", "Taxminiy davr · s", 0.01, 20]] },
  "chemistry-titration": { subject: "Kimyo", title: "Kislota va asos titrlash", description: "Eritmalar nisbatini toping va pH o‘zgarishini kuzating.", formula: "H⁺ + OH⁻ → H₂O", defaults: { acidMolarity: 0.1, acidVolumeMl: 25, baseMolarity: 0.1, maxBaseVolumeMl: 100, tolerancePh: 0.5 }, config: [["acidMolarity", "Kislota konsentratsiyasi · mol/L", 0.01, 2], ["acidVolumeMl", "Kislota hajmi · mL", 5, 100], ["baseMolarity", "Asos konsentratsiyasi · mol/L", 0.01, 2], ["maxBaseVolumeMl", "Eng katta asos hajmi · mL", 5, 200], ["tolerancePh", "pH xatolik chegarasi", 0.1, 2]], run: [["baseVolumeMl", "Qo‘shilgan asos · mL", 0, 200], ["predictedPh", "Taxminiy pH", 0, 14]] },
  "biology-osmosis": { subject: "Biologiya", title: "Hujayrada osmos", description: "Eritma konsentratsiyasini o‘zgartiring va suv yo‘nalishini aniqlang.", formula: "Suv past → yuqori konsentratsiya", defaults: { insideSolutePercent: 5 }, config: [["insideSolutePercent", "Hujayra ichidagi erigan modda · %", 0, 20]], run: [["outsideSolutePercent", "Tashqi eritma · %", 0, 20], ["predictedDirection", "Suv harakati"]] },
  "mathematics-linear": { subject: "Matematika", title: "Chiziqli funksiya", description: "Koordinatani tanlab, grafikdagi y qiymatini taxmin qiling.", formula: "y = mx + b", defaults: { slope: 2, intercept: 1, toleranceAbsolute: 0.25 }, config: [["slope", "Qiyalik · m", -10, 10], ["intercept", "Kesishish · b", -20, 20], ["toleranceAbsolute", "Xatolik chegarasi", 0.01, 2]], run: [["x", "x koordinata", -10, 10], ["predictedY", "Taxminiy y", -120, 120]] },
};
const subjects = ["Barchasi", "Fizika", "Kimyo", "Biologiya", "Matematika"];
const directions = { in: "Hujayraga kiradi", out: "Hujayradan chiqadi", balanced: "Muvozanat" };
const number = (value, digits = 2) => Number(value).toFixed(digits);

function initialExperiment(lab) {
  if (lab.kind === "physics-ohms-law") return { voltage: Math.min(12, lab.maxVoltage), resistance: Math.max(lab.minResistance, Math.min(6, lab.maxResistance)), predictedCurrent: "" };
  if (lab.kind === "physics-pendulum") return { length: Math.max(lab.minLength, Math.min(1, lab.maxLength)), amplitudeDegrees: 15, predictedPeriod: "" };
  if (lab.kind === "chemistry-titration") return { baseVolumeMl: 0, predictedPh: "" };
  if (lab.kind === "biology-osmosis") return { outsideSolutePercent: 2, predictedDirection: "in" };
  return { x: 2, predictedY: "" };
}

function resultLine(run) {
  if (run.kind === "physics-ohms-law") return `Taxmin ${number(run.predictedCurrent, 3)} A · natija ${number(run.actualCurrent, 3)} A · quvvat ${number(run.power, 2)} W`;
  if (run.kind === "physics-pendulum") return `Taxmin ${number(run.predictedPeriod, 3)} s · o‘lchangan ${number(run.actualPeriod, 3)} s · xatolik ${number(run.errorPercent, 1)}%`;
  if (run.kind === "chemistry-titration") return `Taxmin pH ${number(run.predictedPh)} · hisoblangan pH ${number(run.actualPh)}`;
  if (run.kind === "biology-osmosis") return `Taxmin: ${directions[run.predictedDirection]} · natija: ${directions[run.actualDirection]}`;
  return `x = ${run.x} · taxmin y = ${run.predictedY} · natija y = ${run.actualY}`;
}

function OsmosisScene({ lab, experiment }) {
  const outside = Number(experiment.outsideSolutePercent) || 0;
  const difference = lab.insideSolutePercent - outside;
  const radius = difference > 0.25 ? 84 : difference < -0.25 ? 59 : 72;
  return <div className="lab-flat-scene cell-scene"><div className="lab-flat-label">OSMOS MODELI <span>Ichki eritma {lab.insideSolutePercent}% · tashqi eritma {outside}%</span></div><svg viewBox="0 0 560 300" role="img" aria-label="Osmos hujayra modeli"><defs><radialGradient id="cell-grad"><stop stopColor="#58cbbb" stopOpacity=".75" /><stop offset="1" stopColor="#236b73" stopOpacity=".95" /></radialGradient><pattern id="cell-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2" fill="#8ad9d0" opacity=".4" /></pattern></defs><rect width="560" height="300" fill="#0c2634" /><rect width="560" height="300" fill="url(#cell-dots)" /><circle cx="280" cy="150" r={radius + 9} fill="none" stroke="#e9ae43" strokeWidth="3" strokeDasharray="12 8" /><circle cx="280" cy="150" r={radius} fill="url(#cell-grad)" stroke="#76d4c6" strokeWidth="5" /><circle cx="265" cy="140" r="23" fill="#c8b1e6" opacity=".55" /><text x="280" y="216" textAnchor="middle" fill="#e6f6f1" fontSize="15">HUJAYRA</text>{[0, 1, 2, 3].map((i) => <g key={i} transform={`rotate(${i * 90} 280 150)`}><path d={difference >= 0 ? "M 160 150 L 198 150" : "M 207 150 L 169 150"} stroke="#e9ae43" strokeWidth="4" markerEnd="url(#arrowhead)" /></g>)}<defs><marker id="arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="none" stroke="#e9ae43" strokeWidth="2" /></marker></defs></svg><div className="lab-flat-footer"><span>{difference > 0.25 ? "Suv hujayraga kiradi" : difference < -0.25 ? "Suv hujayradan chiqadi" : "Osmotik muvozanat"}</span><strong>{difference > 0.25 ? "GIPOTONIK" : difference < -0.25 ? "GIPERTONIK" : "IZOTONIK"}</strong></div></div>;
}

function FunctionScene({ lab, experiment }) {
  const x = Number(experiment.x) || 0;
  const range = Math.max(20, Math.abs(lab.slope) * 10 + Math.abs(lab.intercept));
  const toX = (value) => 280 + value * 24;
  const toY = (value) => 150 - value * 125 / range;
  const y = lab.slope * x + lab.intercept;
  return <div className="lab-flat-scene graph-scene"><div className="lab-flat-label">FUNKSIYA GRAFIGI <span>y = {lab.slope}x {lab.intercept < 0 ? "−" : "+"} {Math.abs(lab.intercept)}</span></div><svg viewBox="0 0 560 300" role="img" aria-label="Chiziqli funksiya grafigi"><rect width="560" height="300" fill="#0c2634" />{Array.from({ length: 21 }, (_, i) => <line key={`x${i}`} x1={40 + i * 24} x2={40 + i * 24} y1="20" y2="280" stroke="#254452" strokeWidth="1" />)}{Array.from({ length: 11 }, (_, i) => <line key={`y${i}`} x1="40" x2="520" y1={25 + i * 25} y2={25 + i * 25} stroke="#254452" strokeWidth="1" />)}<line x1="40" x2="520" y1="150" y2="150" stroke="#85aeb5" strokeWidth="2" /><line x1="280" x2="280" y1="20" y2="280" stroke="#85aeb5" strokeWidth="2" /><line x1={toX(-10)} y1={toY(lab.slope * -10 + lab.intercept)} x2={toX(10)} y2={toY(lab.slope * 10 + lab.intercept)} stroke="#5ed2c3" strokeWidth="4" /><circle cx={toX(x)} cy={toY(y)} r="9" fill="#e9ae43" stroke="#fff1d1" strokeWidth="3" /><text x={Math.min(485, toX(x) + 14)} y={Math.max(30, toY(y) - 13)} fill="#f3f7f4" fontSize="15">({x}, {number(y, 1)})</text></svg><div className="lab-flat-footer"><span>Nuqtani x bilan o‘zgartiring</span><strong>m = {lab.slope}</strong></div></div>;
}

function ExperimentScene({ lab, experiment }) {
  if (["physics-pendulum", "chemistry-titration"].includes(lab.kind)) return <LabScene3D kind={lab.kind} lab={lab} experiment={experiment} />;
  if (lab.kind === "biology-osmosis") return <OsmosisScene lab={lab} experiment={experiment} />;
  if (lab.kind === "mathematics-linear") return <FunctionScene lab={lab} experiment={experiment} />;
  const current = Number(experiment.voltage) / Number(experiment.resistance || 1);
  return <div className="lab-flat-scene circuit-scene"><div className="lab-flat-label">ELEKTR ZANJIRI <span>{experiment.voltage} V · {experiment.resistance} Ω</span></div><div className="circuit-visual"><span>U</span><div className="circuit-line"><Activity size={28} /><b>R</b></div><span>I = U / R</span></div><div className="lab-flat-footer"><span>Hisoblangan tok kuchi</span><strong>{Number.isFinite(current) ? number(current, 3) : "0.000"} A</strong></div></div>;
}

export default function LabsTab({ room, labs, lessons, session, refresh, refreshProgress, notify }) {
  const staff = room.role !== "student";
  const prefix = `/classrooms/${room.id}/labs`;
  const [subject, setSubject] = useState("Barchasi");
  const [selected, setSelected] = useState(null);
  const [runs, setRuns] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "physics-pendulum", title: "", lessonId: "", ...catalog["physics-pendulum"].defaults });
  const [experiment, setExperiment] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = labs.find((lab) => lab.id === selected);
  const visibleLabs = subject === "Barchasi" ? labs : labs.filter((lab) => catalog[lab.kind]?.subject === subject);

  useEffect(() => {
    if (!selected) { setRuns(null); return; }
    let alive = true; setRuns(null);
    api(`${prefix}/${selected}/runs`, { token: session.token })
      .then((result) => { if (alive) setRuns(result.runs); })
      .catch((cause) => { if (alive) setError(errorText(cause)); });
    return () => { alive = false; };
  }, [selected, prefix, session.token]);

  async function create(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const definition = catalog[form.kind];
      const fields = Object.fromEntries(definition.config.map(([key]) => [key, Number(form[key])]));
      const result = await api(prefix, { method: "POST", token: session.token, body: { kind: form.kind, title: form.title, lessonId: form.lessonId || undefined, ...fields } });
      setOpen(false); setSelected(result.lab.id); setExperiment(initialExperiment(result.lab)); setSubject("Barchasi");
      await refresh(); notify("Yangi laboratoriya qo‘shildi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function run(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = Object.fromEntries(catalog[active.kind].run.map(([key]) => [key, key === "predictedDirection" ? experiment[key] : Number(experiment[key])]));
      const result = await api(`${prefix}/${selected}/runs`, { method: "POST", token: session.token, body });
      setRuns([...(runs || []), result.run]); await refreshProgress();
      notify(result.run.correct ? "Tajriba natijasi taxminingizga mos keldi." : "Natijani tahlil qilib yana urinib ko‘ring.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  const definition = active && catalog[active.kind];
  return <div className="module-page page-enter lab-studio">
    <SectionHeading eyebrow="INTERAKTIV TAJRIBA" title="Laboratoriya studiyasi" description="Fizika, kimyo, biologiya va matematika: parametrni o‘zgartiring, kuzating, taxmin qiling va tekshiring." action={staff ? <Button onClick={() => { setError(""); setOpen(true); }}><Plus size={17} /> Tajriba yaratish</Button> : null} />
    <div className="lab-subjects" role="group" aria-label="Fan bo‘yicha saralash">{subjects.map((name) => <button type="button" key={name} className={subject === name ? "active" : ""} onClick={() => setSubject(name)}>{name}</button>)}</div>
    {labs.length ? <div className="lab-studio-layout"><div className="lab-list">{visibleLabs.length ? visibleLabs.map((lab) => <button type="button" key={lab.id} className={selected === lab.id ? "lab-list-card active" : "lab-list-card"} onClick={() => { setSelected(lab.id); setExperiment(initialExperiment(lab)); setError(""); }}><span className="lab-list-icon"><FlaskConical size={21} /></span><span><small>{catalog[lab.kind]?.subject ?? "Laboratoriya"} / {catalog[lab.kind]?.title ?? "Tajriba"}</small><strong>{lab.title}</strong><em>{catalog[lab.kind]?.formula}</em></span><ArrowRight size={17} /></button>) : <p className="muted">Bu fan bo‘yicha hali tajriba yo‘q.</p>}</div>
      <Panel className="lab-detail">{active && definition ? <><div className="lab-detail-head"><span className="eyebrow">{definition.subject.toUpperCase()} • AMALIYOT</span><h3>{active.title}</h3><p>{definition.description}</p><div className="lab-formula"><span>ASOSIY QOIDA</span><strong>{definition.formula}</strong></div></div><ExperimentScene lab={active} experiment={Object.keys(experiment).length ? experiment : initialExperiment(active)} />
        {error ? <div className="form-error" role="alert">{error}</div> : null}
        <div className="lab-workbench">{staff ? <><h4>O‘quvchilar urinishlari <Badge tone="teal">{runs?.length ?? 0}</Badge></h4>{runs?.length ? [...runs].reverse().map((item) => <div className="lab-history-row" key={item.id}><span className={item.correct ? "lab-status good" : "lab-status retry"}>{item.correct ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}</span><div><strong>O‘quvchi · {item.studentId.slice(-6)}</strong><small>{resultLine(item)}</small></div></div>) : <p className="muted">Hali o‘quvchi urinishlari yo‘q.</p>}</> : <><h4>Parametrlarni sozlang</h4><p className="lab-workbench-hint">Natijani oldindan hisoblang, taxminingizni kiriting va tajribani ishga tushiring.</p><form className="lab-run-form" onSubmit={run}><div className="form-row">{definition.run.map(([key, label, min, max]) => key === "predictedDirection" ? <Select key={key} label={label} value={experiment[key] ?? "in"} onChange={(event) => setExperiment({ ...experiment, [key]: event.target.value })}>{Object.entries(directions).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</Select> : <Field key={key} label={label} type="number" min={min} max={key === "voltage" ? active.maxVoltage : key === "resistance" ? active.maxResistance : key === "length" ? active.maxLength : key === "baseVolumeMl" ? active.maxBaseVolumeMl : max} step="any" value={experiment[key] ?? ""} onChange={(event) => setExperiment({ ...experiment, [key]: event.target.value })} required />)}</div>{active.kind === "chemistry-titration" ? <div className="lab-observation"><span>Kislota {active.acidMolarity} mol/L · {active.acidVolumeMl} mL</span><strong>Ko‘rinayotgan pH ≈ {number(estimatePh(active, Number(experiment.baseVolumeMl) || 0))}</strong></div> : null}<Button type="submit" loading={busy}><Activity size={17} /> Tajribani tekshirish</Button></form><h4>Tajriba jurnali</h4>{runs?.length ? [...runs].reverse().map((item) => <div className="lab-history-row" key={item.id}><span className={item.correct ? "lab-status good" : "lab-status retry"}>{item.correct ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}</span><div><strong>{item.correct ? "Taxmin mos keldi" : "Tahlil qilib takrorlang"}</strong><small>{resultLine(item)}</small></div></div>) : <p className="muted">Birinchi urinishni boshlang.</p>}</>}</div></> : <EmptyState icon={FlaskConical} title="Tajribani tanlang" description="Chap tomondagi laboratoriyalardan birini oching." />}</Panel></div> : <Panel><EmptyState icon={FlaskConical} title="Laboratoriya bo‘sh" description={staff ? "Fizika, kimyo, biologiya yoki matematika tajribasini yarating." : "Ustoz tajriba qo‘shganda shu yerda ko‘rinadi."} /></Panel>}
    {open ? <Modal title="Yangi laboratoriya tajribasi" description="Tajriba fan va parametrlar bilan o‘quv xonasiga qo‘shiladi." onClose={() => setOpen(false)}><form className="modal-form" onSubmit={create}><Select label="Fan va tajriba" value={form.kind} onChange={(event) => { const kind = event.target.value; setForm({ kind, title: form.title, lessonId: form.lessonId, ...catalog[kind].defaults }); }}>{Object.entries(catalog).map(([kind, item]) => <option key={kind} value={kind}>{item.subject} — {item.title}</option>)}</Select><Field label="Tajriba nomi" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} required /><Select label="Darsga bog‘lash" value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value })}><option value="">Dars tanlanmagan</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</Select><div className="form-row">{catalog[form.kind].config.map(([key, label, min, max]) => <Field key={key} label={label} type="number" min={min} max={max} step="any" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required />)}</div>{error ? <div className="form-error" role="alert">{error}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" loading={busy}>Tajribani saqlash</Button></div></form></Modal> : null}
  </div>;
}
