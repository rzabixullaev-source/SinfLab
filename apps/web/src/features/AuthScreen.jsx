import { useState } from "react";
import { ArrowRight, Atom, BookOpenCheck, CirclePlay, Layers3, ShieldCheck } from "lucide-react";
import { Button, Field } from "../components/ui.jsx";
import { errorText } from "../lib/api.js";

const demoAccounts = {
  teacher: { email: "ustoz@sinflab.uz", password: "Demo2026!" },
  student: { email: "oquvchi@sinflab.uz", password: "Demo2026!" },
};

export default function AuthScreen({ onAuthenticate, demoMode }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({ displayName: "", email: "", password: "" });

  async function submit(event, override) {
    event?.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onAuthenticate(override ? "login" : mode, override || values);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-layout">
    <section className="auth-story">
      <div className="auth-brand"><span className="brand-mark"><Atom size={22} strokeWidth={2.1} /></span><span>Sinf<span>Lab</span></span></div>
      <div className="auth-story-content">
        <div className="story-kicker"><span className="kicker-line" /> TA’LIM UCHUN YAGONA MUHIT</div>
        <h1>Bilimni bir joyda<br /><em>harakatga aylantiring.</em></h1>
        <p>Jonli dars, vazifa, test va amaliy tajribalar bir o‘quv xonasida. Ustoz uchun boshqaruv, o‘quvchi uchun aniq yo‘l.</p>
        <div className="story-features">
          <div><span><BookOpenCheck size={20} /></span><div><strong>Tartibli darslar</strong><small>Har mavzu va material o‘z joyida</small></div></div>
          <div><span><CirclePlay size={20} /></span><div><strong>Jonli ta’lim</strong><small>Birga o‘rganish va muloqot</small></div></div>
          <div><span><Layers3 size={20} /></span><div><strong>Amaliy natija</strong><small>Vazifa, test va laboratoriya</small></div></div>
        </div>
      </div>
      <div className="auth-story-footer"><ShieldCheck size={16} /> SinfLab · O‘qishning yangi tartibi</div>
      <div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" />
    </section>

    <section className="auth-form-side">
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand"><span className="brand-mark"><Atom size={20} /></span> SinfLab</div>
        <span className="eyebrow">O‘QUV MUHITINGIZGA XUSH KELIBSIZ</span>
        <h2>{mode === "login" ? "Hisobingizga kiring" : "Hisob yarating"}</h2>
        <p className="auth-subtitle">{mode === "login" ? "Davom etish uchun ma’lumotlaringizni kiriting." : "Birinchi o‘quv xonangizga bir qadam qoldi."}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" ? <Field label="Ism va familiya" value={values.displayName} onChange={(event) => setValues({ ...values, displayName: event.target.value })} placeholder="Masalan, Dilshod Karimov" minLength={2} required autoComplete="name" /> : null}
          <Field label="Email manzil" type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} placeholder="ism@example.com" required autoComplete="email" />
          <Field label="Parol" type="password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} placeholder="Kamida 8 ta belgi" minLength={mode === "register" ? 8 : 1} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" loading={busy} className="auth-submit">{mode === "login" ? "Kirish" : "Ro‘yxatdan o‘tish"}<ArrowRight size={17} /></Button>
        </form>
        <div className="auth-switch">{mode === "login" ? "Hali hisobingiz yo‘qmi?" : "Hisobingiz bormi?"} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Ro‘yxatdan o‘tish" : "Kirish"}</button></div>
        {demoMode ? <div className="demo-login">
          <div className="demo-heading"><span className="demo-line" /><span>YOKI DEMO HISOB</span><span className="demo-line" /></div>
          <div className="demo-actions">
            <button disabled={busy} onClick={() => submit(null, demoAccounts.teacher)}>Ustoz sifatida ko‘rish <ArrowRight size={15} /></button>
            <button disabled={busy} onClick={() => submit(null, demoAccounts.student)}>O‘quvchi sifatida ko‘rish <ArrowRight size={15} /></button>
          </div>
          <p>Demo ma’lumotlari vaqtinchalik xotirada saqlanadi.</p>
        </div> : null}
      </div>
    </section>
  </div>;
}
