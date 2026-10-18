import { useEffect, useState } from "react";
import { BookOpen, Bot, CheckCircle2, MessageSquareText, Save, Send, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button, Panel, SectionHeading, Select, TextArea } from "../../components/ui.jsx";
import "./ai-tab.css";

export default function AiTab({ room, session }) {
  const teacher = ["owner", "teacher"].includes(room.role);
  const student = room.role === "student";
  const prefix = `/classrooms/${room.id}`;
  const [guide, setGuide] = useState("");
  const [lessons, setLessons] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [quality, setQuality] = useState([]);
  const [lessonId, setLessonId] = useState("");
  const [content, setContent] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api(prefix + "/teaching-guide", { token: session.token }),
      api(prefix + "/ai-materials", { token: session.token }),
      ...(teacher ? [api(prefix + "/lessons", { token: session.token }), api(prefix + "/assistant-quality", { token: session.token })] : []),
    ]).then(([guideData, materialData, lessonData, qualityData]) => {
      if (!active) return;
      setGuide(guideData.guide);
      setMaterials(materialData.materials);
      setLessons(lessonData?.lessons || []);
      setQuality(qualityData?.feedback || []);
      if (teacher) {
        const first = lessonData?.lessons?.[0]?.id || "";
        setLessonId(first);
        setContent(materialData.materials.find((item) => item.lessonId === first)?.content || "");
      }
    }).catch((cause) => { if (active) setMessage(errorText(cause)); });
    return () => { active = false; };
  }, [room.id, session.token, teacher]);

  const selectedMaterial = materials.find((item) => item.lessonId === lessonId);
  const helpful = quality.filter((item) => item.rating === "helpful").length;
  const unhelpful = quality.filter((item) => item.rating === "unhelpful").length;

  function selectLesson(id) {
    setLessonId(id);
    setContent(materials.find((item) => item.lessonId === id)?.content || "");
    setMessage("");
  }

  async function saveGuide(event) {
    event.preventDefault(); setBusy("guide"); setMessage("");
    try {
      await api(prefix + "/teaching-guide", { method: "PUT", token: session.token, body: { guide } });
      setMessage("O‘qitish uslubi saqlandi.");
    } catch (cause) { setMessage(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function saveMaterial(event) {
    event.preventDefault(); setBusy("material"); setMessage("");
    try {
      const data = await api(prefix + `/ai-materials/${lessonId}`, { method: "PUT", token: session.token, body: { content } });
      setMaterials((previous) => [...previous.filter((item) => item.lessonId !== lessonId), data.material]);
      setMessage("Dars matni qoralama sifatida saqlandi. O‘quvchiga berish uchun tasdiqlang.");
    } catch (cause) { setMessage(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function changeApproval() {
    setBusy("approval"); setMessage("");
    try {
      const data = await api(prefix + `/ai-materials/${lessonId}/approval`, { method: "PATCH", token: session.token, body: { approved: !selectedMaterial.approved } });
      setMaterials((previous) => previous.map((item) => item.lessonId === lessonId ? { ...item, approved: data.approved } : item));
      setMessage(data.approved ? "Dars matni AI yordamchisiga tasdiqlandi." : "Dars matni AI yordamchisidan olib tashlandi.");
    } catch (cause) { setMessage(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function ask(event) {
    event.preventDefault(); setBusy("question"); setMessage(""); setResult(null); setFeedback(""); setComment("");
    try {
      const data = await api(prefix + "/assistant", { method: "POST", token: session.token, body: { question, ...(lessonId ? { lessonId } : {}) } });
      setResult(data);
    } catch (cause) { setMessage(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function rate(rating) {
    if (!result?.responseId) return;
    setBusy("feedback"); setMessage("");
    try {
      await api(prefix + `/assistant-responses/${result.responseId}/feedback`, { method: "POST", token: session.token, body: { rating, comment } });
      setFeedback(rating);
      setMessage("Bahoyingiz ustozga yuborildi. Rahmat!");
    } catch (cause) { setMessage(errorText(cause)); }
    finally { setBusy(""); }
  }

  return <div className="module-page page-enter ai-tab">
    <SectionHeading eyebrow="YORDAMCHI AI" title={teacher ? "O‘qitish uslubi va dars konteksti" : "AI bilan o‘rganing"} description={teacher ? "Uslubni belgilang, dars matnini tekshirib tasdiqlang va javob sifati bo‘yicha fikrlarni ko‘ring." : "Mavzuni tanlang va savolingizni yozing. AI ustoz tasdiqlagan dars matniga tayanadi."} />
    {teacher ? <>
      <div className="ai-teacher-grid">
        <Panel className="ai-card"><div className="ai-card-title"><Sparkles size={19} /><div><h3>Pedagogik uslub</h3><p>Yordamchi qanday tushuntirishi va qanday savollar berishini yozing.</p></div></div><form className="modal-form" onSubmit={saveGuide}><TextArea label="Ustoz qo‘llanmasi" rows={7} value={guide} onChange={(event) => setGuide(event.target.value)} minLength={20} maxLength={3000} required placeholder="Masalan: avval sodda misol, keyin bosqichma-bosqich savol..." /><Button type="submit" loading={busy === "guide"}><Save size={16} /> Uslubni saqlash</Button></form></Panel>
        <Panel className="ai-card"><div className="ai-card-title"><BookOpen size={19} /><div><h3>Dars matni</h3><p>Faqat siz tasdiqlagan matn o‘quvchiga AI orqali tushuntiriladi.</p></div></div>{lessons.length ? <><Select label="Dars" value={lessonId} onChange={(event) => selectLesson(event.target.value)}>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}</Select><form className="modal-form" onSubmit={saveMaterial}><TextArea label="AI uchun tekshirilgan dars mazmuni" rows={7} value={content} onChange={(event) => setContent(event.target.value)} minLength={50} maxLength={6000} required placeholder="Asosiy tushunchalar, misollar, keng tarqalgan xatolar..." /><div className="ai-actions"><Button type="submit" loading={busy === "material"}><Save size={16} /> Qoralamani saqlash</Button>{selectedMaterial ? <Button type="button" variant="secondary" loading={busy === "approval"} disabled={content.trim() !== selectedMaterial.content} onClick={changeApproval}><ShieldCheck size={16} /> {selectedMaterial.approved ? "Tasdiqni bekor qilish" : "Tasdiqlash"}</Button> : null}</div></form>{selectedMaterial ? <Badge tone={selectedMaterial.approved ? "teal" : "gold"}>{selectedMaterial.approved ? "O‘QUVCHILARGA TAYYOR" : "QORALAMA"}</Badge> : null}</> : <p className="ai-muted">Avval “Darslar” bo‘limida dars yarating.</p>}</Panel>
      </div>
      <Panel className="ai-card ai-quality"><div className="ai-card-title"><MessageSquareText size={19} /><div><h3>Javoblar sifati</h3><p>O‘quvchilarning so‘nggi 20 ta baholangan javobi. Izohlar qo‘llanmani yaxshilashga yordam beradi.</p></div></div><div className="ai-quality-stats"><span><ThumbsUp size={16} /> {helpful} foydali</span><span><ThumbsDown size={16} /> {unhelpful} yaxshilash kerak</span></div>{quality.length ? <div className="ai-quality-list">{quality.map((item) => <article key={item.id}><Badge tone={item.rating === "helpful" ? "teal" : "gold"}>{item.rating === "helpful" ? "FOYDALI" : "YAXSHILASH KERAK"}</Badge><strong>{item.question}</strong><p>{item.answer}</p>{item.comment ? <small>O‘quvchi izohi: {item.comment}</small> : null}</article>)}</div> : <p className="ai-muted">Hozircha baholangan javob yo‘q.</p>}</Panel>
    </> : student ? <Panel className="ai-card ai-student-card"><div className="ai-card-title"><Bot size={21} /><div><h3>Savolingizni bering</h3><p>Yordamchi tayyor javobni ko‘chirib bermaydi: bosqichma-bosqich yo‘l ko‘rsatadi.</p></div></div><form className="modal-form" onSubmit={ask}><Select label="Dars mavzusi" value={lessonId} onChange={(event) => setLessonId(event.target.value)}><option value="">Umumiy savol</option>{materials.map((item) => <option key={item.lessonId} value={item.lessonId}>{item.title}</option>)}</Select><TextArea label="Savolingiz" rows={4} value={question} onChange={(event) => setQuestion(event.target.value)} minLength={3} maxLength={2000} required placeholder="Masalan: shu formulani qaysi vaziyatda ishlatamiz?" /><Button type="submit" loading={busy === "question"}><Send size={16} /> So‘rash</Button></form>{result ? <div className="ai-answer"><strong><Bot size={17} /> AI javobi</strong><p>{result.answer}</p><div className="ai-answer-footer"><small>Bugun qolgan so‘rovlar: {result.usage?.remaining ?? "—"} / {result.usage?.limit ?? "—"}</small><span>Javob foydali bo‘ldimi?</span><Button type="button" variant="secondary" disabled={busy === "feedback" || feedback === "helpful"} onClick={() => rate("helpful")}><ThumbsUp size={15} /> Ha</Button><Button type="button" variant="secondary" disabled={busy === "feedback" || feedback === "unhelpful"} onClick={() => rate("unhelpful")}><ThumbsDown size={15} /> Yo‘q</Button></div><TextArea label="Ustozga qisqa izoh (ixtiyoriy)" rows={2} maxLength={300} value={comment} onChange={(event) => setComment(event.target.value)} /></div> : null}</Panel> : <Panel><p>Yordamchi uslubini ustoz belgilaydi.</p></Panel>}
    {message ? <p className="ai-message" role="status"><CheckCircle2 size={16} /> {message}</p> : null}
  </div>;
}
