import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Send, ListChecks } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button, EmptyState, Field, Modal, Panel, SectionHeading, Select } from "../../components/ui.jsx";

const blankQuestion = () => ({ prompt: "", choices: ["", ""], correctIndex: 0, points: 1 });

export default function QuizzesTab({ room, quizzes, lessons, session, refresh, refreshProgress, notify }) {
  const staff = room.role !== "student";
  const prefix = "/classrooms/" + room.id + "/quizzes";
  const [selected, setSelected] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [answers, setAnswers] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", lessonId: "", questions: [blankQuestion()] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = quizzes.find((item) => item.id === selected);

  useEffect(() => {
    if (!selected) { setAttempts(null); return; }
    let alive = true;
    setAttempts(null); setError("");
    api(prefix + "/" + selected + "/attempts" + (staff ? "" : "/me"), { token: session.token })
      .then((result) => { if (alive) setAttempts(staff ? result.attempts : result.attempt); })
      .catch((cause) => { if (alive) setError(errorText(cause)); });
    return () => { alive = false; };
  }, [selected, prefix, staff, session.token]);

  function editQuestion(index, patch) {
    setForm((previous) => ({ ...previous, questions: previous.questions.map((question, position) => position === index ? { ...question, ...patch } : question) }));
  }
  function editChoice(index, choiceIndex, value) {
    const choices = [...form.questions[index].choices]; choices[choiceIndex] = value;
    editQuestion(index, { choices });
  }
  async function create(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api(prefix, { method: "POST", token: session.token, body: {
        title: form.title, lessonId: form.lessonId || undefined,
        questions: form.questions.map((item) => ({ prompt: item.prompt, choices: item.choices, correctIndex: Number(item.correctIndex), points: Number(item.points) })),
      } });
      setOpen(false); setForm({ title: "", lessonId: "", questions: [blankQuestion()] });
      await refresh(); notify("Test qoralamasi yaratildi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function publish() {
    setBusy(true);
    try { await api(prefix + "/" + selected + "/publish", { method: "POST", token: session.token }); await refresh(); notify("Test e’lon qilindi."); }
    catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    const values = active.questions.map((_, index) => answers[index]);
    if (values.some((value) => value === undefined)) { setError("Har bir savolga javob bering."); return; }
    setBusy(true); setError("");
    try {
      const result = await api(prefix + "/" + selected + "/attempts", { method: "POST", token: session.token, body: { answers: values } });
      setAttempts(result.attempt); await refreshProgress(); notify("Test yuborildi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }

  return <div className="module-page page-enter">
    <SectionHeading eyebrow="BILIMNI TEKSHIRISH" title="Testlar" description={staff ? "Savollarni tuzing, keyin e’lon qiling." : "Savollarga javob bering va natijangizni darhol ko‘ring."} action={staff ? <Button onClick={() => { setError(""); setOpen(true); }}><Plus size={17} /> Test yaratish</Button> : null} />
    {quizzes.length ? <div className="assignment-layout"><div className="item-list">{quizzes.map((item) => <button className={"item-card " + (selected === item.id ? "selected" : "")} key={item.id} onClick={() => { setSelected(item.id); setAnswers({}); }}><span className="item-card-icon"><ListChecks size={20} /></span><span className="item-card-copy"><strong>{item.title}</strong><small>{item.questions.length} ta savol</small></span><Badge tone={item.status === "published" ? "teal" : "neutral"}>{item.status === "published" ? "E’LON QILINGAN" : "QORALAMA"}</Badge></button>)}</div>
      <Panel className="detail-panel">{!active ? <EmptyState icon={ListChecks} title="Testni tanlang" description="Savollar va natijalar shu yerda ochiladi." /> : <><div className="detail-head"><Badge tone={active.status === "published" ? "teal" : "neutral"}>{active.status === "published" ? "E’LON QILINGAN" : "QORALAMA"}</Badge><h3>{active.title}</h3><p>{active.questions.length} ta savol · {active.questions.reduce((sum, item) => sum + item.points, 0)} ball</p>{staff && active.status === "draft" ? <Button onClick={publish} loading={busy}><Send size={16} /> E’lon qilish</Button> : null}</div>
      <div className="detail-content">{error ? <div className="form-error">{error}</div> : null}{staff ? <><h4>Javoblar · {Array.isArray(attempts) ? attempts.length : "..."}</h4>{Array.isArray(attempts) && attempts.length ? attempts.map((item) => <div className="result-row" key={item.id}><span>O‘quvchi ID: {item.studentId.slice(-6)}</span><strong>{item.score}/{item.maxScore} ball</strong></div>) : <p className="muted">Hali javob yuborilmagan.</p>}<div className="question-list">{active.questions.map((question, index) => <div className="question-card" key={index}><strong>{index + 1}. {question.prompt}</strong><small>{question.choices[question.correctIndex]} · {question.points} ball</small></div>)}</div></> : attempts ? <div className="score-result"><CheckCircle2 size={25} /><span>Natijangiz</span><strong>{attempts.score}/{attempts.maxScore} ball</strong><p>Bu testga javob bir marta yuboriladi.</p></div> : <form onSubmit={submit} className="question-list">{active.questions.map((question, index) => <fieldset className="question-card" key={index}><legend>{index + 1}. {question.prompt} <small>· {question.points} ball</small></legend>{question.choices.map((choice, choiceIndex) => <label className={"answer-option " + (answers[index] === choiceIndex ? "chosen" : "")} key={choiceIndex}><input type="radio" name={"question-" + index} checked={answers[index] === choiceIndex} onChange={() => setAnswers({ ...answers, [index]: choiceIndex })} /> {choice}</label>)}</fieldset>)}<Button type="submit" loading={busy}>Javoblarni yuborish <Send size={16} /></Button></form>}</div></>}</Panel></div> : <Panel><EmptyState icon={ListChecks} title="Hali test yo‘q" description={staff ? "Birinchi test savollarini yarating." : "Ustoz test e’lon qilganda shu yerda ko‘rinadi."} /></Panel>}
    {open ? <Modal title="Yangi test" description="Avval qoralama saqlanadi, keyin e’lon qilasiz." onClose={() => setOpen(false)}><form className="modal-form" onSubmit={create}><Field label="Test nomi" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={3} required /><Select label="Darsga bog‘lash" value={form.lessonId} onChange={(event) => setForm({ ...form, lessonId: event.target.value })}><option value="">Dars tanlanmagan</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</Select>{form.questions.map((question, index) => <div className="question-editor" key={index}><strong>{index + 1}-savol</strong><Field label="Savol" value={question.prompt} onChange={(event) => editQuestion(index, { prompt: event.target.value })} minLength={3} required />{question.choices.map((choice, choiceIndex) => <Field key={choiceIndex} label={(choiceIndex + 1) + "-variant"} value={choice} onChange={(event) => editChoice(index, choiceIndex, event.target.value)} required />)}<div className="form-row"><Select label="To‘g‘ri javob" value={question.correctIndex} onChange={(event) => editQuestion(index, { correctIndex: Number(event.target.value) })}>{question.choices.map((_, choiceIndex) => <option value={choiceIndex} key={choiceIndex}>{choiceIndex + 1}-variant</option>)}</Select><Field label="Ball" type="number" min={1} max={100} value={question.points} onChange={(event) => editQuestion(index, { points: Number(event.target.value) })} required /></div><div className="inline-actions">{question.choices.length < 6 ? <Button type="button" variant="secondary" onClick={() => editQuestion(index, { choices: [...question.choices, ""] })}>Variant qo‘shish</Button> : null}{question.choices.length > 2 ? <Button type="button" variant="secondary" onClick={() => editQuestion(index, { choices: question.choices.slice(0, -1), correctIndex: Math.min(question.correctIndex, question.choices.length - 2) })}>Variantni olib tashlash</Button> : null}{form.questions.length > 1 ? <Button type="button" variant="secondary" onClick={() => setForm({ ...form, questions: form.questions.filter((_, position) => position !== index) })}>Savolni olib tashlash</Button> : null}</div></div>)}<Button type="button" variant="secondary" onClick={() => setForm({ ...form, questions: [...form.questions, blankQuestion()] })}><Plus size={16} /> Savol qo‘shish</Button>{error ? <div className="form-error">{error}</div> : null}<div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" loading={busy}>Qoralamani saqlash</Button></div></form></Modal> : null}
  </div>;
}
