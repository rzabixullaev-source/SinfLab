import { LoaderCircle, X } from "lucide-react";

export function Button({ children, variant = "primary", loading = false, className = "", ...props }) {
  return <button className={"btn btn-" + variant + " " + className} disabled={loading || props.disabled} {...props}>
    {loading ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : null}
    {children}
  </button>;
}

export function Field({ label, hint, className = "", ...props }) {
  return <label className={"field " + className}>
    <span className="field-label">{label}</span>
    <input {...props} />
    {hint ? <span className="field-hint">{hint}</span> : null}
  </label>;
}

export function TextArea({ label, hint, className = "", ...props }) {
  return <label className={"field " + className}>
    <span className="field-label">{label}</span>
    <textarea {...props} />
    {hint ? <span className="field-hint">{hint}</span> : null}
  </label>;
}

export function Select({ label, children, className = "", ...props }) {
  return <label className={"field " + className}>
    <span className="field-label">{label}</span>
    <select {...props}>{children}</select>
  </label>;
}

export function Panel({ children, className = "" }) {
  return <section className={"panel " + className}>{children}</section>;
}

export function Badge({ children, tone = "neutral" }) {
  return <span className={"badge badge-" + tone}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="empty-state">
    {Icon ? <span className="empty-icon"><Icon size={27} strokeWidth={1.6} /></span> : null}
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>;
}

export function Modal({ title, description, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-heading">
        <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
        <button className="icon-button" onClick={onClose} aria-label="Yopish"><X size={19} /></button>
      </div>
      {children}
    </div>
  </div>;
}

export function SectionHeading({ eyebrow, title, action, description }) {
  return <div className="section-heading">
    <div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
    {action}
  </div>;
}
