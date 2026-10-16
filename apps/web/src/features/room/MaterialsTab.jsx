import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, Folder, FolderPlus, Upload } from "lucide-react";
import { api, downloadAsset, errorText } from "../../lib/api.js";
import { Badge, Button, EmptyState, Field, Modal, Panel, SectionHeading } from "../../components/ui.jsx";

function fileSize(bytes) {
  return bytes < 1024 * 1024 ? Math.round(bytes / 1024) + " KB" : (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function MaterialsTab({ room, session, notify }) {
  const [folders, setFolders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [folderId, setFolderId] = useState(null);
  const [file, setFile] = useState(null);
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const staff = room.role !== "student";
  const prefix = "/classrooms/" + room.id;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [folderList, assetList] = await Promise.all([
        api(prefix + "/folders", { token: session.token }),
        api(prefix + "/assets" + (folderId ? "?folderId=" + folderId : ""), { token: session.token }),
      ]);
      setFolders(folderList.folders); setAssets(assetList.assets); setError("");
    } catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }, [prefix, folderId, session.token]);
  useEffect(() => { refresh(); }, [refresh]);

  async function createFolder(event) {
    event.preventDefault(); setBusy(true);
    try {
      await api(prefix + "/folders", { method: "POST", token: session.token, body: { name: folderName, parentId: folderId || undefined } });
      setOpen(false); setFolderName(""); await refresh(); notify("Papka yaratildi.");
    } catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }

  async function upload(event) {
    event.preventDefault();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return notify("Fayl 10 MB dan oshmasligi kerak.");
    setBusy(true);
    try {
      await api(prefix + "/assets", {
        method: "POST", token: session.token, body: file,
        headers: { "content-type": "application/octet-stream", "x-file-name": encodeURIComponent(file.name), "x-file-mime": file.type || "application/octet-stream", ...(folderId ? { "x-folder-id": folderId } : {}) },
      });
      setFile(null); event.target.reset(); await refresh(); notify("Fayl yuklandi.");
    } catch (cause) { notify(errorText(cause)); }
    finally { setBusy(false); }
  }

  const current = folders.find((item) => item.id === folderId);
  const children = folders.filter((item) => item.parentId === folderId);

  return <div className="module-page page-enter">
    <SectionHeading eyebrow="KUTUBXONA" title="Materiallar" description="Darsga kerakli fayllar va papkalar shu yerda." action={staff ? <Button variant="secondary" onClick={() => setOpen(true)}><FolderPlus size={17} /> Papka yaratish</Button> : null} />
    {current ? <button className="back-link" onClick={() => setFolderId(current.parentId)}><ArrowLeft size={16} /> {current.name} / Orqaga</button> : <div className="folder-path"><Folder size={15} /> Asosiy papka</div>}
    {staff ? <Panel className="upload-panel"><span className="stat-icon teal"><Upload size={19} /></span><div><strong>Yangi material qo‘shish</strong><p>PDF, rasm yoki hujjat. Maksimum 10 MB.</p></div><form onSubmit={upload}><input aria-label="Yuklanadigan fayl" type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} required /><Button type="submit" loading={busy} disabled={!file}>Yuklash</Button></form></Panel> : null}
    {error ? <div className="form-error">{error} <button onClick={refresh}>Qayta urinish</button></div> : null}
    {loading ? <div className="skeleton" style={{ height: 140 }} /> : <>
      {children.length ? <><h3 className="subheading">Papkalar</h3><div className="folder-grid">{children.map((folder) => <button className="folder-card" key={folder.id} onClick={() => setFolderId(folder.id)}><span><Folder size={23} /></span><strong>{folder.name}</strong></button>)}</div></> : null}
      <h3 className="subheading">Fayllar <Badge tone="neutral">{assets.length}</Badge></h3>
      {assets.length ? <div className="asset-list">{assets.map((asset) => <Panel className="asset-row" key={asset.id}><span className="asset-icon"><FileText size={21} /></span><div><strong>{asset.filename}</strong><small>{fileSize(asset.byteSize)} · {asset.mimeType}</small></div><Button variant="ghost" onClick={() => downloadAsset(room.id, asset, session.token).catch((cause) => notify(errorText(cause)))}><Download size={16} /> Yuklab olish</Button></Panel>)}</div> : <Panel><EmptyState icon={FileText} title="Bu papkada fayl yo‘q" description={staff ? "Dars materiali yoki qo‘llanmani yuklang." : "Ustoz material joylaganda shu yerda ko‘rinadi."} /></Panel>}
    </>}
    {open ? <Modal title="Yangi papka" description={current ? current.name + " papkasi ichida yaratiladi." : "Asosiy katalogda yaratiladi."} onClose={() => setOpen(false)}><form className="modal-form" onSubmit={createFolder}><Field label="Papka nomi" placeholder="Masalan, 1-hafta materiallari" value={folderName} onChange={(event) => setFolderName(event.target.value)} required autoFocus /><div className="modal-actions"><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Bekor qilish</Button><Button type="submit" loading={busy}>Papka yaratish</Button></div></form></Modal> : null}
  </div>;
}
