import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, GraduationCap, Search, Users } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Badge, Button, EmptyState, Panel, SectionHeading, Select } from "../../components/ui.jsx";
import StudentInsights, { durationLabel } from "../StudentInsights.jsx";
import "./members-dashboard.css";

const roles = { owner: "Xona egasi", teacher: "Ustoz", assistant: "Yordamchi", student: "O‘quvchi" };

export default function MembersTab({ room, members, session, refresh, notify }) {
  const [changing, setChanging] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState("");
  const [advice, setAdvice] = useState("");
  const [adviceBusy, setAdviceBusy] = useState(false);
  const [classOverview, setClassOverview] = useState(null);
  const staff = room.role !== "student";
  const students = members.filter((member) => member.role === "student");
  const visible = members.filter((member) => member.displayName.toLocaleLowerCase("uz").includes(search.toLocaleLowerCase("uz")));
  const selected = members.find((member) => member.userId === selectedId && member.role === "student");

  useEffect(() => {
    if (!staff) return;
    let active = true;
    api(`/classrooms/${room.id}/teaching-overview`, { token: session.token })
      .then((result) => { if (active) setClassOverview(result.overview); })
      .catch(() => { if (active) setClassOverview(null); });
    return () => { active = false; };
  }, [room.id, session.token, staff]);

  useEffect(() => {
    if (!staff || !selected) { setReport(null); return; }
    let active = true;
    setReport(null); setReportError(""); setAdvice("");
    api(`/classrooms/${room.id}/students/${selected.userId}/report`, { token: session.token })
      .then((result) => { if (active) setReport(result.report); })
      .catch((cause) => { if (active) setReportError(errorText(cause)); });
    return () => { active = false; };
  }, [room.id, selected?.userId, session.token, staff]);

  async function changeRole(member, role) {
    setChanging(member.userId);
    try {
      await api(`/classrooms/${room.id}/members/${member.userId}`, { method: "PATCH", token: session.token, body: { role } });
      if (selectedId === member.userId && role !== "student") setSelectedId(null);
      await refresh(); notify("A’zo roli yangilandi.");
    } catch (cause) { notify(errorText(cause)); }
    finally { setChanging(null); }
  }

  async function requestAdvice() {
    if (!selected) return;
    setAdviceBusy(true); setAdvice("");
    try {
      const result = await api(`/classrooms/${room.id}/students/${selected.userId}/ai-advice`, { token: session.token });
      setAdvice(result.advice);
    } catch (cause) { setAdvice(errorText(cause)); }
    finally { setAdviceBusy(false); }
  }

  return <div className="module-page page-enter members-dashboard">
    <SectionHeading eyebrow="SINF NAZORATI" title="O‘quvchilar va a’zolar" description={staff ? "Har bir o‘quvchining vaqtini, bajarilgan ishlarini va rivojlanishini ko‘ring." : "Shu sinfdagi o‘quvchilar va ustozlar."} action={<Badge tone="teal">{members.length} A’ZO</Badge>} />
    {staff ? <div className="member-overview"><Panel><Users size={20} /><strong>{classOverview?.students ?? students.length}</strong><span>O‘quvchi</span></Panel><Panel><GraduationCap size={20} /><strong>{classOverview?.activeStudents ?? "—"}</strong><span>7 kunda faol bo‘lganlar</span></Panel><Panel><ArrowRight size={20} /><strong>{durationLabel(classOverview?.weekSeconds ?? 0)}</strong><span>Sinfning 7 kunlik faol vaqti</span></Panel><Panel><BookOpenCheck size={20} /><strong>{classOverview?.awaitingFeedback ?? "—"}</strong><span>Tekshirishni kutayotgan ishlar</span></Panel></div> : null}
    {members.length ? <><label className="member-search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="A’zo ismi bo‘yicha qidirish" aria-label="A’zo ismi bo‘yicha qidirish" /></label><div className="member-list">{visible.map((member) => <div key={member.userId}>
      <Panel className={`member-row member-row-rich ${selectedId === member.userId ? "selected" : ""}`}>
        <span className="member-avatar">{member.displayName.slice(0, 1).toUpperCase()}</span>
        <div className="member-identity"><strong>{member.displayName}</strong><small>{roles[member.role] || member.role}{member.joinedAt ? ` · ${new Date(member.joinedAt).toLocaleDateString("uz-UZ")} dan beri` : ""}</small></div>
        {staff && member.role === "student" ? <Button variant={selectedId === member.userId ? "primary" : "secondary"} onClick={() => setSelectedId(selectedId === member.userId ? null : member.userId)}>{selectedId === member.userId ? "Yopish" : "Profilni ko‘rish"}</Button> : null}
        {room.role === "owner" && member.role !== "owner" ? <Select label="Rol" className="role-select" value={member.role} disabled={changing === member.userId} onChange={(event) => changeRole(member, event.target.value)}><option value="teacher">Ustoz</option><option value="assistant">Yordamchi</option><option value="student">O‘quvchi</option></Select> : <Badge tone={member.role === "student" ? "neutral" : "teal"}>{roles[member.role]}</Badge>}
      </Panel>
      {selectedId === member.userId ? <div className="member-report">{report ? <StudentInsights report={report} title={member.displayName} advice={advice} onAdvice={requestAdvice} adviceBusy={adviceBusy} /> : <Panel><p>{reportError || "O‘quvchi profili yuklanmoqda..."}</p></Panel>}</div> : null}
    </div>)}</div>{!visible.length ? <Panel><p>Qidiruvga mos a’zo topilmadi.</p></Panel> : null}</> : <Panel><EmptyState icon={Users} title="A’zolar yo‘q" description="Taklif kodi orqali o‘quvchilarni qo‘shing." /></Panel>}
  </div>;
}
