import { useCallback, useEffect, useState } from "react";
import { CornerDownRight, MessageCircle, Send, Trash2, X } from "lucide-react";
import { api, errorText } from "../../lib/api.js";
import { dateTimeLabel } from "../../lib/date.js";
import { Badge, Button, EmptyState, Panel, SectionHeading } from "../../components/ui.jsx";

export default function ChatTab({ room, members, session, notify }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const prefix = "/classrooms/" + room.id + "/messages";

  const refresh = useCallback(async () => {
    try { const result = await api(prefix + "?limit=100", { token: session.token }); setMessages(result.messages); setError(""); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, [prefix, session.token]);
  useEffect(() => { refresh(); }, [refresh]);

  async function submit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api(prefix, { method: "POST", token: session.token, body: { body: text.trim(), replyToId: replyTo?.id } });
      setText(""); setReplyTo(null); await refresh();
    } catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function remove(message) {
    try { await api(prefix + "/" + message.id, { method: "DELETE", token: session.token }); await refresh(); notify("Xabar o‘chirildi."); }
    catch (cause) { notify(errorText(cause)); }
  }

  const names = new Map(members.map((member) => [member.userId, member.displayName]));
  return <div className="module-page page-enter">
    <SectionHeading eyebrow="GURUH MULOQOTI" title="Guruh suhbati" description="Savollar va fikrlar bitta o‘quv xonasida saqlanadi." action={<Badge tone="teal">{members.length} A’ZO</Badge>} />
    <Panel className="chat-panel">
      <div className="chat-topline"><span className="live-dot" /><strong>{room.name}</strong><span>Guruh suhbati</span></div>
      <div className="chat-messages" aria-live="polite">{loading ? <div className="chat-loading">Xabarlar yuklanmoqda...</div> : error ? <div className="form-error">{error} <button onClick={refresh}>Qayta urinish</button></div> : messages.length ? messages.map((message) => <div className={"chat-message " + (message.senderId === session.user.id ? "own" : "")} key={message.id}>
        <span className="message-avatar">{(names.get(message.senderId) || "?").slice(0, 1).toUpperCase()}</span><div className="message-main"><div className="message-meta"><strong>{names.get(message.senderId) || "A’zo"}</strong><time>{dateTimeLabel(message.createdAt)}</time></div>{message.replyToId ? <div className="message-reply"><CornerDownRight size={13} /> Javob</div> : null}<p>{message.body || <em>O‘chirilgan xabar</em>}</p>{message.body ? <div className="message-actions"><button onClick={() => setReplyTo(message)}><CornerDownRight size={13} /> Javob berish</button>{message.senderId === session.user.id || room.role === "owner" || (room.mode === "course" && ["teacher", "assistant"].includes(room.role)) ? <button onClick={() => remove(message)}><Trash2 size={13} /> O‘chirish</button> : null}</div> : null}</div>
      </div>) : <EmptyState icon={MessageCircle} title="Suhbat hali boshlanmagan" description="Birinchi savol yoki xabarni yuboring." />}</div>
      <form className="chat-composer" onSubmit={submit}>{replyTo ? <div className="composer-reply"><CornerDownRight size={14} /> {names.get(replyTo.senderId) || "A’zo"} xabariga javob <button type="button" onClick={() => setReplyTo(null)} aria-label="Javobni bekor qilish"><X size={14} /></button></div> : null}<div className="composer-row"><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Xabar yozing..." maxLength={4000} aria-label="Xabar matni" /><Button type="submit" loading={busy} disabled={!text.trim()}><Send size={16} /> Yuborish</Button></div></form>
    </Panel>
  </div>;
}
