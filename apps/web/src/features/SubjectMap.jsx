import { useState } from "react";
import { ArrowRight, Map } from "lucide-react";
import { Button, Panel, SectionHeading } from "../components/ui.jsx";
import { mapTowns } from "./subject-map.js";
import "./subject-map.css";

export default function SubjectMap({ rooms, onOpenRoom, onJoin }) {
  const towns = mapTowns(rooms);
  const [selected, setSelected] = useState(null);
  const active = towns.find((town) => town.id === selected);
  return <section className="subject-map-section">
    <SectionHeading eyebrow="FANLAR XARITASI" title="Qaysi shaharchaga boramiz?" description="Fanni tanlang, keyin shu fandagi sinf xonasiga kiring." />
    <div className="subject-map" aria-label="Fanlar xaritasi">{towns.map((town) => <button key={town.id} type="button" className={`subject-town town-${town.theme} ${selected === town.id ? "selected" : ""}`} onClick={() => setSelected(town.id)} aria-pressed={selected === town.id}>
      <span className="town-sky"><span className="town-orbit" /><span className="town-icon">{town.icon}</span><span className="town-buildings"><i /><i /><i /></span></span>
      <span className="town-info"><strong>{town.name}</strong><small>{town.rooms.length ? `${town.rooms.length} ta sinf` : "Sinf topilmadi"}</small></span>
    </button>)}</div>
    {active ? <Panel className="town-detail"><div><span className="eyebrow"><Map size={14} /> {active.name.toUpperCase()}</span><h3>{active.name} shaharchasi</h3><p>{active.rooms.length ? "Sinfingizni tanlang va mashg‘ulotni davom ettiring." : "Bu fan bo‘yicha sinfga taklif kodi bilan qo‘shiling."}</p></div><div className="town-room-actions">{active.rooms.length ? active.rooms.map((room) => <Button key={room.id} variant="secondary" onClick={() => onOpenRoom(room.id)}>{room.name} <ArrowRight size={16} /></Button>) : <Button onClick={onJoin}>Sinfga qo‘shilish</Button>}</div></Panel> : null}
  </section>;
}
