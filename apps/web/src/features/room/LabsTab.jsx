import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, BookOpen, CheckCircle2, FlaskConical, Search, Sparkles } from "lucide-react";
import { studioById, studioInventory, studioScenarios, studioSubjects } from "@sinflab/contracts";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button, EmptyState, Panel, SectionHeading } from "../../components/ui.jsx";
import StudioWorkspace from "./StudioWorkspace.jsx";
import LegacyLabsTab from "./LegacyLabsTab.jsx";
import "./lab-studio.css";
import "./studio-workspace.css";

const filters = [["all", "Barcha fanlar"], ...Object.entries(studioSubjects)];
const subjectColors = {
  chemistry: "#e9ae43", physics: "#64c8d0", biology: "#79d1a0", cybersecurity: "#aa9de0",
};

export default function LabsTab({ room, labs, lessons, session, refresh, refreshProgress, notify }) {
  const staff = room.role !== "student";
  const prefix = `/classrooms/${room.id}/labs`;
  const [mode, setMode] = useState("studio");
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => labs.find((lab) => lab.kind === "studio")?.id ?? null);
  const [runs, setRuns] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const studioLabs = labs.filter((lab) => lab.kind === "studio" && studioById[lab.scenarioId]);
  const legacyLabs = labs.filter((lab) => lab.kind !== "studio");
  const visibleLabs = studioLabs.filter((lab) => subject === "all" || studioById[lab.scenarioId].subject === subject);
  const active = studioLabs.find((lab) => lab.id === selected);
  const scenario = active && studioById[active.scenarioId];
  const catalog = useMemo(() => studioScenarios.filter((item) =>
    (subject === "all" || item.subject === subject) &&
    `${item.title} ${item.mission} ${studioSubjects[item.subject]}`.toLowerCase().includes(query.toLowerCase().trim())
  ), [subject, query]);
  const published = new Set(studioLabs.map((lab) => lab.scenarioId));

  useEffect(() => {
    if (!selected || !active) { setRuns(null); return; }
    let alive = true; setRuns(null);
    api(`${prefix}/${selected}/runs`, { token: session.token })
      .then((result) => { if (alive) setRuns(result.runs); })
      .catch((cause) => { if (alive) setError(errorText(cause)); });
    return () => { alive = false; };
  }, [selected, active?.id, prefix, session.token]);

  async function publish(item) {
    setBusy(item.id); setError("");
    try {
      const result = await api(prefix, {
        method: "POST", token: session.token,
        body: { kind: "studio", scenarioId: item.id, title: item.title },
      });
      setSelected(result.lab.id);
      await refresh();
      notify(`${item.title} laboratoriyasi guruhga qo'shildi.`);
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function submit(actions) {
    setBusy("run"); setError("");
    try {
      const result = await api(`${prefix}/${active.id}/runs`, {
        method: "POST", token: session.token, body: { actions },
      });
      setRuns((previous) => [...(previous || []), result.run]);
      await refreshProgress();
      notify(result.run.correct ? "Tajriba natijasi jurnalga saqlandi." : "Urinish saqlandi. Asboblarni yana sinab ko'ring.");
    } catch (cause) { throw new Error(errorText(cause)); }
    finally { setBusy(""); }
  }

  if (mode === "legacy") return <div className="studio-root">
    <div className="studio-switch"><button type="button" onClick={() => setMode("studio")}>40 ta yangi tajriba</button><button type="button" className="active">Oldingi mashqlar</button></div>
    <LegacyLabsTab room={room} labs={legacyLabs} lessons={lessons} session={session} refresh={refresh} refreshProgress={refreshProgress} notify={notify} />
  </div>;

  return <div className="module-page page-enter studio-root">
    <div className="studio-switch"><button type="button" className="active">Interaktiv studiya</button><button type="button" onClick={() => setMode("legacy")}>Oldingi mashqlar</button></div>
    <SectionHeading eyebrow="SINF LAB · AMALIY STUDIYA" title="Tajribani o'zingiz bajaring"
      description="Kimyo, fizika, biologiya va kiberxavfsizlik bo'yicha 40 ta ish. Asboblarni ushlab joylashtiring, parametrlarni sinang va natijani kuzating."
      action={<span className="studio-count"><Sparkles size={17} /> 4 FAN · 40 ISH</span>} />
    <div className="studio-filter-row"><div className="studio-subject-filter" role="group" aria-label="Fan tanlash">{filters.map(([id, label]) => <button type="button" key={id} className={subject === id ? "active" : ""} onClick={() => setSubject(id)}>{label}</button>)}</div><label className="studio-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tajriba qidirish" aria-label="Tajriba qidirish" /></label></div>
    {error ? <div className="form-error" role="alert">{error}</div> : null}

    <section className="studio-library" aria-label="Laboratoriya ishlari katalogi">
      <div className="studio-section-head"><div><small>TAJRIBA KATALOGI</small><h3>{subject === "all" ? "Barcha laboratoriya ishlari" : studioSubjects[subject]} <Badge tone="teal">{catalog.length}</Badge></h3></div><p>{staff ? "Tajribani guruhingizga qo'shing. O'quvchilar uni o'zlari bajaradi." : "Ustoz guruhga qo'shgan tajribalarni pastdagi ish maydonida bajaring."}</p></div>
      <div className="studio-catalog-grid">{catalog.map((item) => <article className="studio-catalog-card" key={item.id} style={{ "--subject-color": subjectColors[item.subject] }}>
        <div className="studio-catalog-card-top"><span>{studioSubjects[item.subject]}</span><span>{String(studioScenarios.filter((entry) => entry.subject === item.subject).findIndex((entry) => entry.id === item.id) + 1).padStart(2, "0")}/10</span></div>
        <div className="studio-catalog-icon"><FlaskConical size={23} /></div>
        <h4>{item.title}</h4><p>{item.mission}</p>
        <div className="studio-catalog-footer"><small>{item.subject === "chemistry" ? studioInventory.chemistry.length : item.tools.length} ta asbob · {item.controls.length ? "o'zgaruvchan model" : "reaksiya modeli"}</small>{staff ? <Button variant={published.has(item.id) ? "secondary" : "primary"} onClick={() => published.has(item.id) ? setSelected(studioLabs.find((lab) => lab.scenarioId === item.id)?.id) : publish(item)} loading={busy === item.id}>{published.has(item.id) ? "Ochish" : "Guruhga qo'shish"} <ArrowRight size={15} /></Button> : <span className={published.has(item.id) ? "studio-available" : "studio-locked"}>{published.has(item.id) ? "Guruhda mavjud" : "Ustoz qo'shadi"}</span>}</div>
      </article>)}</div>
      {!catalog.length ? <p className="muted">Bu qidiruvga mos tajriba topilmadi.</p> : null}
    </section>

    <section className="studio-published" aria-label="Guruh laboratoriyalari">
      <div className="studio-section-head"><div><small>GURUH ISH MAYDONI</small><h3>Guruhdagi tajribalar <Badge tone="teal">{visibleLabs.length}</Badge></h3></div><p>Har bir urinish jurnalda saqlanadi.</p></div>
      {studioLabs.length ? <div className="studio-activity-layout"><div className="studio-activity-list">{visibleLabs.length ? visibleLabs.map((lab) => {
        const item = studioById[lab.scenarioId];
        return <button type="button" key={lab.id} className={selected === lab.id ? "active" : ""} onClick={() => { setSelected(lab.id); setError(""); }} style={{ "--subject-color": subjectColors[item.subject] }}><span>{studioSubjects[item.subject]}</span><strong>{lab.title}</strong><small>{item.mission}</small><ArrowRight size={16} /></button>;
      }) : <p className="muted">Bu fan bo'yicha guruhda hali tajriba yo'q.</p>}</div>
        <Panel className="studio-activity-detail">{scenario ? <>
          <StudioWorkspace key={active.id} scenario={scenario} staff={staff} busy={busy === "run"} onSubmit={submit} />
          <div className="studio-run-history"><h4><BookOpen size={18} /> Tajriba jurnali <Badge tone="teal">{runs?.length ?? 0}</Badge></h4>{runs?.length ? [...runs].reverse().map((run) => <div className="studio-run-row" key={run.id}><span className={run.correct ? "good" : "retry"}>{run.correct ? <CheckCircle2 size={17} /> : <Activity size={17} />}</span><div><strong>{staff ? `O'quvchi · ${run.studentId.slice(-6)}` : run.correct ? "Maqsad bajarildi" : "Qayta urinib ko'ring"}</strong><small>{run.observation}</small></div><em>{run.score} ball</em></div>) : <p className="muted">Hali saqlangan urinish yo'q.</p>}</div>
        </> : <EmptyState icon={FlaskConical} title="Tajribani tanlang" description="Guruhdagi ishlardan birini oching yoki katalogdan yangi ish qo'shing." />}</Panel>
      </div> : <Panel><EmptyState icon={FlaskConical} title="Guruhda tajriba yo'q" description={staff ? "Yuqoridagi katalogdan birinchi laboratoriyani qo'shing." : "Ustoz tajriba qo'shganda shu yerda ochiladi."} /></Panel>}
    </section>
  </div>;
}
