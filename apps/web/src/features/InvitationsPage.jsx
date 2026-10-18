import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Mail, Users } from "lucide-react";
import { api, errorText } from "../lib/api.js";
import { Badge, Button, Field, Panel, SectionHeading, Select } from "../components/ui.jsx";
import "./invitations.css";

export default function InvitationsPage({ session, rooms, refreshRooms, notify }) {
  const [invitations, setInvitations] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const manageable = rooms.filter((room) => room.role === "owner" || (room.mode === "course" && room.role === "teacher"));
  const activeId = manageable.some((room) => room.id === roomId) ? roomId : manageable[0]?.id;
  const activeRoom = manageable.find((room) => room.id === activeId);
  const refresh = useCallback(async () => {
    const result = await api("/classrooms/invitations", { token: session.token });
    setInvitations(result.invitations);
  }, [session.token]);
  useEffect(() => { refresh().catch((cause) => setError(errorText(cause))); }, [refresh]);

  async function send(event) {
    event.preventDefault(); if (!activeId) return;
    setBusy("send"); setError("");
    try {
      await api(`/classrooms/${activeId}/email-invites`, { method: "POST", token: session.token, body: { email: email.trim(), role } });
      setEmail(""); notify("Taklif yuborildi. U foydalanuvchining Taklifnomalar sahifasida ko‘rinadi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  async function decide(invite, decision) {
    setBusy(invite.id); setError("");
    try {
      const result = await api(`/classrooms/invitations/${invite.id}/${decision}`, { method: "POST", token: session.token });
      await refresh();
      if (decision === "accept") { await refreshRooms(); window.location.hash = `/room/${result.classroom.id}/overview`; }
      else notify("Taklif rad etildi.");
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  return <div className="page-enter invitations-page">
    <SectionHeading eyebrow="GURUHLAR" title="Taklifnomalar" description="Email manzilingizga bog‘langan sinf va chat guruhlari takliflarini shu yerda ko‘rasiz." />
    {error ? <Panel><p role="alert" className="form-error">{error}</p></Panel> : null}
    <div className="invitation-layout"><Panel><div className="invitation-panel-head"><Mail size={22} /><h2>Kelgan takliflar</h2><Badge tone="teal">{invitations.length}</Badge></div>
      {invitations.length ? <div className="invitation-list">{invitations.map((invite) => <article key={invite.id} className="invitation-card"><div><strong>{invite.classroomName}</strong><p>{invite.mode === "club" ? "Oddiy chat guruhi · A’zo" : `Ustozli sinf · ${invite.role === "student" ? "O‘quvchi" : invite.role === "teacher" ? "Ustoz" : "Yordamchi ustoz"}`}</p><small>{new Date(invite.expiresAt).toLocaleDateString("uz-UZ")} gacha</small></div><div className="invitation-actions"><Button variant="secondary" disabled={busy === invite.id} onClick={() => decide(invite, "decline")}>Rad etish</Button><Button loading={busy === invite.id} onClick={() => decide(invite, "accept")}>Qabul qilish <ArrowRight size={16} /></Button></div></article>)}</div> : <p>Hozircha taklifnoma yo‘q.</p>}</Panel>
      {manageable.length ? <Panel><div className="invitation-panel-head"><Users size={22} /><h2>Taklif yuborish</h2></div><p>Ro‘yxatdan o‘tgan foydalanuvchining emailini kiriting. Taklif uning shu sahifasida chiqadi.</p><form className="modal-form" onSubmit={send}><Select label="Guruh" value={activeId} onChange={(event) => setRoomId(event.target.value)}>{manageable.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.mode === "club" ? "Chat" : "Sinf"}</option>)}</Select><Field type="email" label="Foydalanuvchi emaili" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ism@example.com" required />{activeRoom?.mode === "course" ? <Select label="Sinfdagi roli" value={role} onChange={(event) => setRole(event.target.value)}><option value="student">O‘quvchi</option>{activeRoom.role === "owner" ? <><option value="teacher">Ustoz</option><option value="assistant">Yordamchi ustoz</option></> : null}</Select> : null}<Button type="submit" loading={busy === "send"}>Taklif yuborish <ArrowRight size={16} /></Button></form></Panel> : null}</div>
  </div>;
}
