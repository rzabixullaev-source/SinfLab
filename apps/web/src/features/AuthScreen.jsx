import { useState } from "react";
import { ArrowRight, Atom, BookOpenCheck, CirclePlay, Layers3, ShieldCheck } from "lucide-react";
import { Button, Field } from "../components/ui.jsx";
import { errorText } from "../lib/api.js";
import { SettingsControls, useSettings } from "../lib/settings.jsx";

const demoAccounts = {
  teacher: { email: "ustoz@sinflab.uz", password: "Demo2026!" },
  student: { email: "oquvchi@sinflab.uz", password: "Demo2026!" },
  parent: { email: "otaona@sinflab.uz", password: "Demo2026!" },
};

export default function AuthScreen({ onAuthenticate, demoMode, initialError = "" }) {
  const { t } = useSettings();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [values, setValues] = useState({ displayName: "", email: "", password: "" });

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onAuthenticate(mode, values);
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
        <div className="story-kicker"><span className="kicker-line" /> {t("authKicker")}</div>
        <h1>{t("authHeadline")}<br /><em>{t("authEmphasis")}</em></h1>
        <p>{t("authStory")}</p>
        <div className="story-features">
          <div><span><BookOpenCheck size={20} /></span><div><strong>{t("authLessons")}</strong><small>{t("authLessonsText")}</small></div></div>
          <div><span><CirclePlay size={20} /></span><div><strong>{t("authLive")}</strong><small>{t("authLiveText")}</small></div></div>
          <div><span><Layers3 size={20} /></span><div><strong>{t("authPractice")}</strong><small>{t("authPracticeText")}</small></div></div>
        </div>
      </div>
      <div className="auth-story-footer"><ShieldCheck size={16} /> SinfLab · {t("authBrand")}</div>
      <div className="story-orbit orbit-one" /><div className="story-orbit orbit-two" />
    </section>

    <section className="auth-form-side">
      <div className="auth-form-wrap">
        <div className="auth-mobile-brand"><span className="brand-mark"><Atom size={20} /></span> SinfLab</div>
        <SettingsControls />
        <span className="eyebrow">{t("authEyebrow")}</span>
        <h2>{t(mode === "login" ? "loginTitle" : "registerTitle")}</h2>
        <p className="auth-subtitle">{t(mode === "login" ? "loginSubtitle" : "registerSubtitle")}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" ? <Field label={t("fullName")} value={values.displayName} onChange={(event) => setValues({ ...values, displayName: event.target.value })} placeholder="Dilshod Karimov" minLength={2} required autoComplete="name" /> : null}
          <Field label={t("email")} type="email" value={values.email} onChange={(event) => { setError(""); setValues({ ...values, email: event.target.value }); }} placeholder="name@example.com" required autoComplete="email" />
          <Field label={t("password")} type="password" value={values.password} onChange={(event) => { setError(""); setValues({ ...values, password: event.target.value }); }} placeholder="••••••••" minLength={mode === "register" ? 8 : 1} required autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error ? <div className="form-error" role="alert">{error}</div> : null}
          <Button type="submit" loading={busy} className="auth-submit">{t(mode === "login" ? "login" : "register")}<ArrowRight size={17} /></Button>
        </form>
        <div className="auth-switch">{t(mode === "login" ? "noAccount" : "hasAccount")} <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{t(mode === "login" ? "register" : "login")}</button></div>
        {demoMode && mode === "login" ? <div className="demo-login">
          <div className="demo-heading"><span className="demo-line" /><span>{t("demoAccount")}</span><span className="demo-line" /></div>
          <div className="demo-account-list">{Object.entries(demoAccounts).map(([key, account]) => <button key={key} type="button" disabled={busy} onClick={() => setValues({ ...values, ...account })}>{key === "teacher" ? "Ustoz" : key === "student" ? "O‘quvchi" : "Ota-ona"}: {account.email}</button>)}</div>
          <p>{t("demoHint")}</p>
        </div> : null}
      </div>
    </section>
  </div>;
}
