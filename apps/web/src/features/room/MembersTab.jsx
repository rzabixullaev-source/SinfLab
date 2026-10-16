import { useState } from "react";
import { Users } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { Badge, EmptyState, Panel, SectionHeading, Select } from "../../components/ui.jsx";

const roles = { owner: "Xona egasi", teacher: "Ustoz", assistant: "Yordamchi", student: "O‘quvchi" };

export default function MembersTab({ room, members, session, refresh, notify }) {
  const [changing, setChanging] = useState(null);
  async function changeRole(member, role) {
    setChanging(member.userId);
    try {
      await api("/classrooms/" + room.id + "/members/" + member.userId, { method: "PATCH", token: session.token, body: { role } });
      await refresh(); notify("A’zo roli yangilandi.");
    } catch (cause) { notify(errorText(cause)); }
    finally { setChanging(null); }
  }

  return <div className="module-page page-enter"><SectionHeading eyebrow="JAMOA" title="Xona a’zolari" description="Bu xonada dars berayotgan va o‘qiyotganlar." action={<Badge tone="teal">{members.length} A’ZO</Badge>} />
    {members.length ? <div className="member-list">{members.map((member) => <Panel className="member-row" key={member.userId}><span className="member-avatar">{member.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{member.displayName}</strong><small>{roles[member.role] || member.role}</small></div>{room.role === "owner" && member.role !== "owner" ? <Select label="Rol" className="role-select" value={member.role} disabled={changing === member.userId} onChange={(event) => changeRole(member, event.target.value)}><option value="teacher">Ustoz</option><option value="assistant">Yordamchi</option><option value="student">O‘quvchi</option></Select> : <Badge tone={member.role === "student" ? "neutral" : "teal"}>{roles[member.role]}</Badge>}</Panel>)}</div> : <Panel><EmptyState icon={Users} title="A’zolar yo‘q" description="Taklif kodi orqali o‘quvchilarni qo‘shing." /></Panel>}
  </div>;
}
