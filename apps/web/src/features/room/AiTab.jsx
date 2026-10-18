import { useEffect, useState } from "react";
import { Bot, Save, Send } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Button, Panel, SectionHeading, TextArea } from "../../components/ui.jsx";

export default function AiTab({ room, session }) {
  const [guide, setGuide] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const teacher = ["owner", "teacher"].includes(room.role);
  useEffect(() => {
    api(`/classrooms/${room.id}/teaching-guide`, { token: session.token }).then((result) => setGuide(result.guide)).catch((cause) => setMessage(errorText(cause)));
  }, [room.id, session.token]);

  async function saveGuide(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await api(`/classrooms/${room.id}/teaching-guide`, { method: "PUT", token: session.token, body: { guide } }); setMessage("O‘qitish uslubi saqlandi."); }
    catch (cause) { setMessage(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function ask(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setAnswer("");
    try { const result = await api(`/classrooms/${room.id}/assistant`, { method: "POST", token: session.token, body: { question } }); setAnswer(result.answer); }
    catch (cause) { setMessage(errorText(cause)); }
    finally { setBusy(false); }
  }

  return <div className="module-page page-enter"><SectionHeading eyebrow="YORDAMCHI AI" title={teacher ? "O‘qitish uslubi" : "AI bilan o‘rganing"} description={teacher ? "O‘zingizning tushuntirish usulingiz va o‘quvchiga qanday yordam berish kerakligini yozing." : "Yordamchi sizga ustoz belgilagan uslubda mavzuni tushuntiradi."} />
    {teacher ? <Panel><form className="modal-form" onSubmit={saveGuide}><TextArea label="Pedagogik qo‘llanma" rows={8} value={guide} onChange={(event) => setGuide(event.target.value)} minLength={20} maxLength={3000} required placeholder="Masalan: avval sodda misol, keyin bosqichma-bosqich savol..." /><Button type="submit" loading={busy}><Save size={16} /> Saqlash</Button></form></Panel> : room.role === "student" ? <Panel><form className="modal-form" onSubmit={ask}><TextArea label="Savolingiz" rows={4} value={question} onChange={(event) => setQuestion(event.target.value)} minLength={3} maxLength={2000} required /><Button type="submit" loading={busy}><Send size={16} /> So‘rash</Button></form>{answer ? <div className="feedback-note"><strong><Bot size={16} /> AI javobi</strong><p style={{ whiteSpace: "pre-wrap" }}>{answer}</p></div> : null}</Panel> : <Panel><p>Yordamchi uslubini ustoz belgilaydi.</p></Panel>}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
