import { useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowUpDown, Circle, Eraser, Minus, MousePointer2, PenLine, RotateCcw, Square, Trash2, Type } from "lucide-react";

const WIDTH = 1000;
const HEIGHT = 600;
const GRID = 20;
const colors = ["#E9AE43", "#0F766E", "#47B8E0", "#F3F6F5", "#EE786E", "#9A8BEA"];
const tools = [
  ["select", MousePointer2, "Tanlash"], ["pen", PenLine, "Qalam"],
  ["line", Minus, "Chiziq"], ["rect", Square, "To‘rtburchak"],
  ["ellipse", Circle, "Doira"], ["text", Type, "Matn"], ["erase", Eraser, "O‘chirgich"],
];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function bounds(shape) {
  if (shape.type === "pen") {
    const xs = shape.points.map(([x]) => x), ys = shape.points.map(([, y]) => y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  if (shape.type === "line") return { x: Math.min(shape.x, shape.x2), y: Math.min(shape.y, shape.y2), w: Math.abs(shape.x2 - shape.x), h: Math.abs(shape.y2 - shape.y) };
  if (shape.type === "text") return { x: shape.x, y: shape.y - 28, w: Math.max(80, shape.text.length * 14), h: 34 };
  return shape;
}

function translate(shape, dx, dy) {
  const box = bounds(shape);
  dx = clamp(dx, -box.x, WIDTH - box.x - box.w);
  dy = clamp(dy, -box.y, HEIGHT - box.y - box.h);
  if (shape.type === "pen") return { ...shape, points: shape.points.map(([x, y]) => [x + dx, y + dy]) };
  if (shape.type === "line") return { ...shape, x: shape.x + dx, x2: shape.x2 + dx, y: shape.y + dy, y2: shape.y2 + dy };
  return { ...shape, x: shape.x + dx, y: shape.y + dy };
}

function renderShape(shape, selected) {
  const shared = { stroke: shape.color, strokeWidth: selected ? 5 : 4, strokeLinecap: "round", strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" };
  if (shape.type === "rect") return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx="5" fill="transparent" {...shared} />;
  if (shape.type === "ellipse") return <ellipse cx={shape.x + shape.w / 2} cy={shape.y + shape.h / 2} rx={shape.w / 2} ry={shape.h / 2} fill="transparent" {...shared} />;
  if (shape.type === "line") return <line x1={shape.x} y1={shape.y} x2={shape.x2} y2={shape.y2} {...shared} />;
  if (shape.type === "pen") return <polyline points={shape.points.map((point) => point.join(",")).join(" ")} fill="none" {...shared} />;
  return <text x={shape.x} y={shape.y} fill={shape.color} fontSize="28" fontWeight="650">{shape.text}</text>;
}

export default function LiveBoard({ elements = [], canEdit, connected, onChange }) {
  const svgRef = useRef(null);
  const interaction = useRef(null);
  const history = useRef([]);
  const lastLocalChange = useRef(null);
  const [items, setItems] = useState(elements);
  const [draft, setDraft] = useState(null);
  const [selected, setSelected] = useState([]);
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState(colors[0]);
  const [snap, setSnap] = useState(true);
  const [label, setLabel] = useState("Yangi matn");

  useEffect(() => {
    if (elements === lastLocalChange.current) return;
    setItems(elements); history.current = []; setSelected([]);
  }, [elements]);

  function point(event) {
    const svg = svgRef.current;
    const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    const local = p.matrixTransform(svg.getScreenCTM().inverse());
    const grid = snap && tool !== "pen" ? GRID : 1;
    return { x: clamp(Math.round(local.x / grid) * grid, 0, WIDTH), y: clamp(Math.round(local.y / grid) * grid, 0, HEIGHT) };
  }

  function commit(next, previous = items) {
    if (!canEdit) return;
    history.current = [...history.current.slice(-24), previous];
    lastLocalChange.current = next;
    setItems(next); onChange(next);
  }

  function pointerDown(event) {
    if (!canEdit) return;
    const at = point(event);
    const id = event.target.closest("[data-board-id]")?.dataset.boardId;
    if (tool === "erase") { if (id) { commit(items.filter((shape) => shape.id !== id)); setSelected([]); } return; }
    if (tool === "text") {
      const text = label.trim();
      if (text) commit([...items, { id: crypto.randomUUID(), type: "text", color, x: at.x, y: Math.max(at.y, 28), text }]);
      return;
    }
    if (tool === "select") {
      if (!id) { setSelected([]); return; }
      const ids = event.shiftKey ? (selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]) : selected.includes(id) ? selected : [id];
      setSelected(ids);
      interaction.current = { mode: "move", at, before: items, ids, next: items };
    } else {
      const shapeId = crypto.randomUUID();
      const shape = tool === "pen" ? { id: shapeId, type: "pen", color, points: [[at.x, at.y], [at.x, at.y]] }
        : tool === "line" ? { id: shapeId, type: "line", color, x: at.x, y: at.y, x2: at.x, y2: at.y }
          : { id: shapeId, type: tool, color, x: at.x, y: at.y, w: 4, h: 4 };
      interaction.current = { mode: "draw", at, shape };
      setDraft(shape);
    }
    svgRef.current.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    const state = interaction.current;
    if (!state) return;
    const at = point(event);
    if (state.mode === "move") {
      const dx = at.x - state.at.x, dy = at.y - state.at.y;
      state.next = state.before.map((shape) => state.ids.includes(shape.id) ? translate(shape, dx, dy) : shape);
      setItems(state.next);
      return;
    }
    const shape = state.shape;
    if (shape.type === "pen") {
      const last = shape.points.at(-1);
      if (Math.hypot(at.x - last[0], at.y - last[1]) < 3 || shape.points.length >= 300) return;
      state.shape = { ...shape, points: [...shape.points, [at.x, at.y]] };
    } else if (shape.type === "line") state.shape = { ...shape, x2: at.x, y2: at.y };
    else state.shape = { ...shape, x: Math.min(state.at.x, at.x), y: Math.min(state.at.y, at.y), w: Math.max(4, Math.abs(at.x - state.at.x)), h: Math.max(4, Math.abs(at.y - state.at.y)) };
    setDraft(state.shape);
  }

  function pointerUp() {
    const state = interaction.current;
    interaction.current = null;
    if (!state) return;
    if (state.mode === "move") {
      if (state.next.some((shape, index) => shape !== state.before[index])) commit(state.next, state.before);
    } else {
      const shape = state.shape;
      const box = bounds(shape);
      if (box.w >= 4 || box.h >= 4) commit([...items, shape]);
      setDraft(null);
    }
  }

  function align(axis, edge) {
    if (selected.length < 2) return;
    const chosen = items.filter((shape) => selected.includes(shape.id));
    const boxes = chosen.map(bounds);
    const start = Math.min(...boxes.map((box) => box[axis]));
    const end = Math.max(...boxes.map((box) => box[axis] + box[axis === "x" ? "w" : "h"]));
    const next = items.map((shape) => {
      if (!selected.includes(shape.id)) return shape;
      const box = bounds(shape), size = box[axis === "x" ? "w" : "h"];
      const target = edge === "start" ? start : edge === "end" ? end - size : (start + end - size) / 2;
      return translate(shape, axis === "x" ? target - box.x : 0, axis === "y" ? target - box.y : 0);
    });
    commit(next);
  }

  function distribute() {
    if (selected.length < 3) return;
    const sorted = items.filter((shape) => selected.includes(shape.id)).sort((a, b) => bounds(a).x - bounds(b).x);
    const centers = sorted.map((shape) => bounds(shape).x + bounds(shape).w / 2);
    const first = centers[0], step = (centers.at(-1) - first) / (sorted.length - 1);
    commit(items.map((shape) => {
      const index = sorted.findIndex((entry) => entry.id === shape.id);
      return index < 0 ? shape : translate(shape, first + step * index - (bounds(shape).x + bounds(shape).w / 2), 0);
    }));
  }

  return <section className="live-board" aria-label="Jonli dars doskasi">
    <div className="live-board-top"><div><span className="eyebrow">SINF / LAB • LIVE</span><h4>Onlayn doska</h4><p>{canEdit ? "Shaklni chizing, suring va Shift bilan bir nechtasini tanlang." : "Ustozning doskasi barcha ishtirokchilarga ko‘rinadi."}</p></div><span className={connected ? "board-status connected" : "board-status"}>{connected ? "Jonli sinxron" : "Darsga ulanmagan"}</span></div>
    {canEdit ? <div className="board-toolbar" aria-label="Doska asboblari">
      <div className="board-tools">{tools.map(([value, Icon, title]) => <button type="button" key={value} className={tool === value ? "active" : ""} onClick={() => setTool(value)} title={title} aria-label={title} aria-pressed={tool === value}><Icon size={17} /></button>)}</div>
      <div className="board-colors">{colors.map((value) => <button type="button" key={value} className={color === value ? "active" : ""} style={{ "--swatch": value }} onClick={() => setColor(value)} title={value} aria-label={`Rang ${value}`} aria-pressed={color === value} />)}</div>
      <button type="button" className={snap ? "board-pill active" : "board-pill"} onClick={() => setSnap(!snap)}>Katakka yopish {snap ? "ON" : "OFF"}</button>
      {tool === "text" ? <input className="board-text-input" value={label} maxLength={200} onChange={(event) => setLabel(event.target.value)} aria-label="Doskaga qo‘yiladigan matn" /> : null}
    </div> : null}
    {canEdit ? <div className="board-alignment"><span>{selected.length ? `${selected.length} shakl tanlangan` : "Shakllarni tanlang"}</span><button type="button" onClick={() => align("x", "start")} disabled={selected.length < 2} title="Chapga tekislash"><AlignLeft size={17} /></button><button type="button" onClick={() => align("x", "center")} disabled={selected.length < 2} title="Gorizontal markaz"><AlignCenter size={17} /></button><button type="button" onClick={() => align("x", "end")} disabled={selected.length < 2} title="O‘ngga tekislash"><AlignRight size={17} /></button><button type="button" className="board-align-text" onClick={() => align("y", "start")} disabled={selected.length < 2} title="Tepaga tekislash">Tepa</button><button type="button" className="board-align-text" onClick={() => align("y", "center")} disabled={selected.length < 2} title="Vertikal markaz">O‘rta</button><button type="button" className="board-align-text" onClick={() => align("y", "end")} disabled={selected.length < 2} title="Pastga tekislash">Past</button><button type="button" onClick={() => distribute()} disabled={selected.length < 3} title="Teng masofada joylash"><ArrowUpDown size={17} className="board-distribute-icon" /></button><button type="button" onClick={() => { const previous = history.current.pop(); if (previous) { lastLocalChange.current = previous; setItems(previous); onChange(previous); setSelected([]); } }} disabled={!history.current.length} title="Ortga qaytarish"><RotateCcw size={17} /></button><button type="button" onClick={() => { if (items.length) { commit([]); setSelected([]); } }} disabled={!items.length} title="Doskani tozalash"><Trash2 size={17} /></button></div> : null}
    <div className="board-canvas-wrap"><svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Onlayn doska maydoni" className={canEdit ? `board-canvas tool-${tool}` : "board-canvas"} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <rect width={WIDTH} height={HEIGHT} fill="transparent" />
      {items.map((shape) => <g key={shape.id} data-board-id={shape.id} className={selected.includes(shape.id) ? "board-shape selected" : "board-shape"}>{renderShape(shape, selected.includes(shape.id))}</g>)}
      {draft ? <g className="board-draft">{renderShape(draft, false)}</g> : null}
    </svg></div>
  </section>;
}
