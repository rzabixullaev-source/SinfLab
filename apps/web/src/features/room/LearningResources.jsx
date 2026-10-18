import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Link2, Trash2, Upload } from "lucide-react";
import { api, downloadLearningFile, errorText } from "../../lib/api.js";
import { Button, Field, Panel } from "../../components/ui.jsx";
import "./learning-resources.css";

const mimeByExtension = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
  mp4: "video/mp4", webm: "video/webm", txt: "text/plain", csv: "text/csv", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };

export default function LearningResources({ room, session, kind, parentId, staff }) {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const base = `/classrooms/${room.id}/content/${kind}/${parentId}`;
  const refresh = useCallback(async () => {
    const result = await api(base, { token: session.token });
    setItems(result.resources);
  }, [base, session.token]);
  useEffect(() => { refresh().catch((cause) => setError(errorText(cause))); }, [refresh]);

  async function addLink(event) {
    event.preventDefault(); setBusy("link"); setError("");
    try {
      await api(base + "/links", { method: "POST", token: session.token, body: { title, url } });
      setTitle(""); setUrl(""); await refresh();
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }
  async function upload(event) {
    event.preventDefault(); if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError("Fayl hajmi 20 MB dan oshmasligi kerak."); return; }
    const form = event.currentTarget;
    setBusy("file"); setError("");
    try {
      await api(base + "/files", { method: "POST", token: session.token, body: file,
        headers: { "content-type": "application/octet-stream", "x-file-name": encodeURIComponent(file.name),
          "x-file-mime": mimeByExtension[file.name.split(".").at(-1)?.toLowerCase()] || file.type || "application/octet-stream" } });
      setFile(null); form.reset(); await refresh();
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }
  async function remove(item) {
    setBusy(item.id); setError("");
    try { await api(`/classrooms/${room.id}/learning-resources/${item.id}`, { method: "DELETE", token: session.token }); await refresh(); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(""); }
  }

  return <section className="learning-resources" aria-label={kind === "lesson" ? "Dars materiallari" : "Vazifa materiallari"}>
    <div className="learning-resources-head"><h4>{kind === "lesson" ? "Dars materiallari" : "Vazifa materiallari"}</h4><span>{items.length} ta manba</span></div>
    {items.length ? <div className="learning-resource-list">{items.map((item) => <Panel className="learning-resource" key={item.id}>
      <span className="learning-resource-icon">{item.type === "link" ? <Link2 size={18} /> : <FileText size={18} />}</span>
      <div><strong>{item.title}</strong><small>{item.type === "link" ? item.url : `${Math.max(1, Math.round(item.byteSize / 1024))} KB · ${item.mimeType}`}</small></div>
      {item.type === "link" ? <a className="btn btn-secondary" href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Ochish</a>
        : <Button variant="secondary" onClick={() => downloadLearningFile(room.id, item, session.token).catch((cause) => setError(errorText(cause)))}><Download size={15} /> Yuklab olish</Button>}
      {staff ? <button className="learning-resource-remove" type="button" title="O‘chirish" disabled={!!busy} onClick={() => remove(item)}><Trash2 size={16} /></button> : null}
    </Panel>)}</div> : <p className="learning-resources-empty">Hozircha fayl yoki havola joylanmagan.</p>}
    {staff ? <div className="learning-resource-forms"><form onSubmit={upload}><label>PDF, rasm, video, matn, Word yoki Excel fayl (20 MB gacha)</label><div><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.txt,.csv,.doc,.docx,.xls,.xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} required /><Button type="submit" variant="secondary" disabled={!file} loading={busy === "file"}><Upload size={15} /> Fayl qo‘shish</Button></div></form>
      <form onSubmit={addLink}><Field label="Video yoki boshqa havola nomi" value={title} onChange={(event) => setTitle(event.target.value)} minLength={2} maxLength={160} required /><Field label="Havola" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." required /><Button type="submit" variant="secondary" loading={busy === "link"}><Link2 size={15} /> Havola qo‘shish</Button></form></div> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
  </section>;
}
