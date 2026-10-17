import { useMemo, useRef, useState } from "react";
import { Activity, ArrowDown, CheckCircle2, FlaskConical, RotateCcw, Undo2, X } from "lucide-react";
import { simulateStudio, studioInventory, studioSubjects, studioTools } from "@sinflab/contracts";
import { Button } from "../../components/ui.jsx";
import StudioScene3D from "./StudioScene3D.jsx";

function CyberWorkbench({ scenario, state, onAdd, onRemove }) {
  const dropRef = useRef(null);
  const drag = useRef(null);
  const [command, setCommand] = useState("");
  const [terminal, setTerminal] = useState(["SinfLab isolated sandbox ready.  help / inspect / status / test"]);
  const v = state.values;
  const traces = {
    password: [["ACCOUNT", "Parol uzunligi", `${v.length} belgi`], ["POLICY", "Kamida 12 belgi", v.length >= 12 ? "QABUL" : "ZAIF"], ["VAULT", "Menejer ulangan", state.placed.some((item) => item.itemId === "vault") ? "HA" : "YO'Q"]],
    phishing: [["MESSAGE", "Jo'natuvchi", "support@sinflab.example"], ["HEADER", "Reply-To", "notice@verify.example"], ["SIGNAL", "Shubhali belgilar", `${v.signals}/5`]],
    firewall: [["PACKET", "443 / HTTPS", v.allowed > 0 ? "RUXSAT" : "BLOK"], ["PACKET", "3389 / REMOTE", v.allowed > 3 ? "RUXSAT" : "BLOK"], ["RULESET", "Ochiq portlar", `${v.allowed} ta`]],
    mfa: [["LOGIN", "Parol bosqichi", "TEKSHIRILDI"], ["MFA", "Qo'shimcha kod", state.placed.some((item) => item.itemId === "authenticator") ? "ULANDI" : "KUTILMOQDA"], ["ATTEMPT", "Sinov kirishlari", `${v.attempts} ta`]],
    tls: [["TLS", "Sertifikat", v.days > 0 ? "AMALDA" : "MUDDATI TUGAGAN"], ["BROWSER", "Qolgan muddat", `${v.days} kun`], ["CHANNEL", "Ulanish", v.days > 0 && state.correct ? "HIMOYALI" : "TEKSHIRILMADI"]],
    backup: [["DATABASE", "Asosiy nusxa", "ONLAYN"], ["BACKUP", "Oxirgi nusxa", `${v.interval} kun oldin`], ["RECOVERY", "Siyosat", v.interval <= 7 ? "MOS" : "ESKIRGAN"]],
    permission: [["USER", "Foydalanuvchi", "STUDENT"], ["ROLE", "Berilgan huquqlar", `${v.permissions} ta`], ["POLICY", "Minimal huquq", v.permissions <= 4 ? "MOS" : "ORTIQCHA"]],
    monitor: [["LOG", "Hodisa oqimi", "12 ta hodisa"], ["ALERT", "Chegara", `${v.threshold} ta`], ["MONITOR", "Signal", v.threshold <= 10 ? "FAOL" : "KECHIKADI"]],
    patch: [["SERVER", "Sinov muhiti", "ISHLAMOQDA"], ["PATCH", "Yangilanish yoshi", `${v.age} kun`], ["POLICY", "Holat", v.age <= 30 ? "MOS" : "ESKIRGAN"]],
    validation: [["FORM", "Kirish ma'lumoti", "SINOV"], ["CHECK", "Tekshiruvlar", `${v.checks} ta`], ["RESULT", "Qoidalar", v.checks >= 3 ? "FAOL" : "YETARLI EMAS"]],
  };
  function runCommand(event) {
    event.preventDefault();
    const cmd = command.trim().toLowerCase();
    if (!cmd) return;
    const answer = cmd === "help" ? "Buyruqlar: help, inspect, status, test, clear"
      : cmd === "inspect" ? traces[scenario.model].map(([channel, label, value]) => `${channel} ${label}: ${value}`).join("  |  ")
        : cmd === "status" ? state.observation
          : cmd === "test" ? state.correct ? "PASS — himoya modeli talabga mos." : "FAIL — asboblar yoki qoida hali mos emas."
            : cmd === "clear" ? "" : "Noma'lum buyruq. help deb yozing.";
    setTerminal((previous) => cmd === "clear" ? [] : [...previous, `> ${cmd}`, answer].slice(-12));
    setCommand("");
  }
  function down(event, itemId) {
    drag.current = { itemId, startX: event.clientX, startY: event.clientY, element: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event) {
    if (!drag.current) return;
    const { element, startX, startY } = drag.current;
    element.style.transform = `translate(${event.clientX - startX}px,${event.clientY - startY}px) scale(1.04)`;
    element.style.zIndex = "5";
  }
  function up(event) {
    if (!drag.current) return;
    const { element, itemId, startX, startY } = drag.current;
    const box = dropRef.current?.getBoundingClientRect();
    const inside = box && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (inside || Math.hypot(event.clientX - startX, event.clientY - startY) < 8) onAdd(itemId);
    element.style.transform = ""; element.style.zIndex = "";
    drag.current = null;
  }
  return <div className="cyber-workbench">
    <div className="cyber-topline"><span className="cyber-pulse" /> SINF LAB / ISOLATED SANDBOX <span>LIVE MODEL</span></div>
    <div className="cyber-network">
      <div className="cyber-node"><span>01</span><strong>Kirish nuqtasi</strong><small>{scenario.title}</small></div>
      <div className="cyber-wire"><i /></div>
      <div className="cyber-node active"><span>02</span><strong>Sinov muhiti</strong><small>{state.measurement ? `${state.measurement.label}: ${state.measurement.value} ${state.measurement.unit}` : "Asboblarni joylang"}</small></div>
      <div className="cyber-wire"><i /></div>
      <div className="cyber-node"><span>03</span><strong>Natija</strong><small>{state.correct ? "Himoya sozlandi" : "Tekshirish kutilmoqda"}</small></div>
    </div>
    <div className="cyber-inspector"><div className="cyber-inspector-title"><span>JONLI SANDBOX NATIJASI</span><strong>{scenario.model.toUpperCase()}</strong></div>{traces[scenario.model].map(([channel, label, value], index) => <div className="cyber-trace" key={`${channel}-${index}`}><code>{channel}</code><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="cyber-terminal"><div className="cyber-terminal-head"><span>●</span> SINF LAB / TERMINAL <small>LOCAL SIMULATION</small></div><div className="cyber-terminal-lines" aria-live="polite">{terminal.map((line, index) => <div key={index}>{line}</div>)}</div><form onSubmit={runCommand}><span>&gt;</span><input value={command} maxLength={60} onChange={(event) => setCommand(event.target.value)} aria-label="Sandbox buyrug'i" placeholder="help, inspect, status, test..." /><button type="submit">ISHGA TUSHIRISH</button></form></div>
    <div className="cyber-drop" ref={dropRef}>
      <span>ASBOBLARNI SHU YERGA OLIB KELING</span>
      <div className="cyber-installed">{state.placed.length ? state.placed.map((item, index) =>
        <button type="button" key={index} onClick={() => onRemove(item.itemId)} style={{ "--tool-color": studioTools[item.itemId][1] }} title="Ish maydonidan olish">
          {studioTools[item.itemId][0]} <X size={14} />
        </button>) : <em>Hali hech narsa ulanmagan</em>}</div>
    </div>
    <div className="cyber-tools">{scenario.tools.map((itemId) => <button type="button" key={itemId} className="cyber-tool"
      onPointerDown={(event) => down(event, itemId)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onAdd(itemId); } }}
      style={{ "--tool-color": studioTools[itemId][1] }}>
      <span>{studioTools[itemId][0].slice(0, 1)}</span><strong>{studioTools[itemId][0]}</strong><ArrowDown size={15} />
    </button>)}</div>
    <div className="cyber-bottomline"><span>Bu muhit faqat simulyatsiya: haqiqiy tarmoqqa ulanmaydi.</span><span>●  LOCAL</span></div>
  </div>;
}

export default function StudioWorkspace({ scenario, onSubmit, busy = false, staff = false }) {
  const [actions, setActions] = useState([]);
  const [amount, setAmount] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const state = useMemo(() => {
    try { return simulateStudio(scenario, actions); }
    catch { return simulateStudio(scenario, []); }
  }, [scenario, actions]);
  const add = (itemId) => {
    if (actions.length >= 80 || state.placed.length >= 16) { setError("Ish maydoni to'ldi. Biror asbobni oling yoki tajribani qayta boshlang."); return; }
    setActions((previous) => [...previous, { type: "add", itemId, amount: scenario.subject === "chemistry" ? amount : 10 }]);
    setError("");
  };
  const remove = (itemId) => {
    if (actions.length >= 80) { setError("Harakatlar chegarasiga yetdingiz. Ortga qayting yoki tajribani qayta boshlang."); return; }
    setActions((previous) => [...previous, { type: "remove", itemId }]); setError("");
  };
  const setControl = (controlId, value) => {
    setActions((previous) => {
      const last = previous.at(-1);
      if (last?.type === "set" && last.controlId === controlId) return [...previous.slice(0, -1), { type: "set", controlId, value }];
      if (previous.length >= 80) { setError("Harakatlar chegarasiga yetdingiz. Ortga qayting yoki tajribani qayta boshlang."); return previous; }
      return [...previous, { type: "set", controlId, value }];
    });
  };
  const reset = () => { setActions([]); setError(""); };
  const undo = () => { setActions((previous) => previous.slice(0, -1)); setError(""); };
  const submit = async () => {
    if (!actions.length) { setError("Avval tajriba asboblari bilan ishlang."); return; }
    try { await onSubmit(actions); setError(""); }
    catch (cause) { setError(cause.message || "Tajriba saqlanmadi."); }
  };
  return <div className="studio-workspace">
    <div className="studio-mission"><div><small>TOPSHIRIQ · {studioSubjects[scenario.subject].toUpperCase()}</small><h4>{scenario.title}</h4><p>{scenario.mission}</p></div><span className={state.correct ? "studio-mission-check ready" : "studio-mission-check"}>{state.correct ? <CheckCircle2 size={19} /> : <Activity size={19} />}{state.correct ? "Kuzatuv tayyor" : "Tajriba davom etmoqda"}</span></div>
    {scenario.subject === "cybersecurity" ? <CyberWorkbench scenario={scenario} state={state} onAdd={add} onRemove={remove} />
      : <StudioScene3D scenario={scenario} state={state} onAdd={add} onRemove={remove} />}
    <div className="studio-console">
      {scenario.subject !== "cybersecurity" ? <div className="studio-tool-shelf"><div className="studio-console-title"><span>ASBOBLAR VA MODDALAR</span><small>3D sahnada ushlab olib boring yoki shu yerdan qo'shing</small></div><div className={showAll ? "studio-tool-buttons expanded" : "studio-tool-buttons"}>{(scenario.subject === "chemistry" && showAll ? studioInventory.chemistry : scenario.tools).map((itemId) => <button type="button" key={itemId} onClick={() => add(itemId)} style={{ "--tool-color": studioTools[itemId][1] }}><i /><span>{studioTools[itemId][0]}</span><strong>+</strong></button>)}</div>{scenario.subject === "chemistry" ? <button className="studio-inventory-toggle" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Asosiy moddalar" : `Barcha moddalar ombori · ${studioInventory.chemistry.length} reagent`}</button> : null}</div> : null}
      {scenario.subject === "chemistry" ? <label className="studio-amount">Quyiladigan miqdor <strong>{amount} ml</strong><input type="range" min="1" max="50" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></label> : null}
      {scenario.controls.length ? <div className="studio-controls"><div className="studio-console-title"><span>TAJRIBA SOZLAMALARI</span><small>Qiymatni o'zgartiring, model darhol javob beradi</small></div><div className="studio-control-grid">{scenario.controls.map((control) => <label key={control.id}><span>{control.label}<strong>{state.values[control.id]} {control.unit}</strong></span><input type="range" min={control.min} max={control.max} step={control.step} value={state.values[control.id]} onChange={(event) => setControl(control.id, Number(event.target.value))} /></label>)}</div></div> : null}
      <div className="studio-observation" style={{ "--reaction-color": state.reaction?.color ?? "#0f766e" }}><div><small>JONLI KUZATUV</small><strong>{state.observation}</strong>{state.measurement ? <span>{state.measurement.label}: {state.measurement.value} {state.measurement.unit}</span> : null}</div><FlaskConical size={25} /></div>
      <div className="studio-tray"><span>ISH MAYDONI · {state.placed.length} TA BUYUM</span><div>{state.placed.length ? state.placed.map((item, index) => <button type="button" key={index} onClick={() => remove(item.itemId)} title="Olib tashlash">{studioTools[item.itemId][0]} <X size={13} /></button>) : <em>Buyumni tanlang yoki 3D sahnadan olib keling</em>}</div></div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="studio-actions"><Button variant="secondary" type="button" onClick={undo} disabled={!actions.length}><Undo2 size={16} /> Ortga</Button><Button variant="secondary" type="button" onClick={reset} disabled={!actions.length}><RotateCcw size={16} /> Qayta boshlash</Button>{!staff ? <Button type="button" onClick={submit} loading={busy}><CheckCircle2 size={17} /> Natijani jurnalga saqlash</Button> : <span className="studio-preview-note">Ustoz ko'rinishi · o'quvchi natijani saqlaydi</span>}</div>
    </div>
  </div>;
}
