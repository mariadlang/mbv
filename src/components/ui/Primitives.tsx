"use client";

import { cloneElement, useId, type AriaAttributes, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type ReactElement, type ReactNode } from "react";
import { ArrowRight, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";

type FeedbackTone = "success" | "warning" | "danger";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  feedback,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "text" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  feedback?: FeedbackTone;
}) {
  return (
    <button
      className={`button button--${variant} button--${size} ${feedback ? `button--${feedback}` : ""} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-feedback={feedback}
      {...props}
    >
      {loading && <LoaderCircle className="button__spinner" size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  className = "",
  children,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
}) {
  return <button {...props} className={`icon-button ${className}`.trim()} aria-label={label}>{children}</button>;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "rose" | "sage" | "lavender" | "warm" | "danger" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}>
      <div className="progress__meta">
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="progress__track">
        <span className="progress__value" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <span
      className="ds-progress-ring"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      style={{ "--progress": `${safeValue}%` } as CSSProperties}
    >
      <strong>{safeValue}%</strong>
      <small>{label}</small>
    </span>
  );
}

export function Chip({
  children,
  selected = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return <button {...props} className={`chip ${selected ? "is-selected" : ""} ${className}`.trim()} aria-pressed={selected}>{children}</button>;
}

export function Alert({ children, tone = "info", className = "" }: { children: ReactNode; tone?: "info" | FeedbackTone; className?: string }) {
  return <div className={`alert alert--${tone} ${className}`.trim()} role={tone === "danger" ? "alert" : "status"}><CircleAlert size={18} aria-hidden="true" /><span>{children}</span></div>;
}

export function InlineMessage({ children, tone = "info", className = "" }: { children: ReactNode; tone?: "info" | FeedbackTone; className?: string }) {
  return <div className={`inline-message inline-message--${tone} ${className}`.trim()} role={tone === "danger" ? "alert" : "status"}>{children}</div>;
}

type TabItem<T extends string> = { id: T; label: string; disabled?: boolean };

export function Tabs<T extends string>({
  id,
  ariaLabel,
  items,
  value,
  onChange,
  panelId,
  className = "",
}: {
  id?: string;
  ariaLabel: string;
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  panelId?: string;
  className?: string;
}) {
  const generatedId = useId();
  const tabsId = id ?? `tabs-${generatedId.replace(/:/g, "")}`;
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, itemId: T) => {
    const enabledItems = items.filter((item) => !item.disabled);
    const currentIndex = enabledItems.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) return;
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % enabledItems.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = enabledItems.length - 1;
    else return;
    event.preventDefault();
    const next = enabledItems[nextIndex];
    onChange(next.id);
    document.getElementById(`${tabsId}-${next.id}-tab`)?.focus();
  };

  return <div className={`tabs ${className}`.trim()} role="tablist" aria-label={ariaLabel}>{items.map((item) => (
    <button
      type="button"
      role="tab"
      id={`${tabsId}-${item.id}-tab`}
      aria-controls={panelId ?? `${tabsId}-${item.id}-panel`}
      aria-selected={value === item.id}
      tabIndex={value === item.id ? 0 : -1}
      disabled={item.disabled}
      className={value === item.id ? "is-active" : ""}
      key={item.id}
      onClick={() => onChange(item.id)}
      onKeyDown={(event) => moveFocus(event, item.id)}
    >{item.label}</button>
  ))}</div>;
}

export function TabPanel({
  tabsId,
  tabId,
  active,
  className = "",
  children,
}: {
  tabsId: string;
  tabId: string;
  active: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={className} id={`${tabsId}-${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${tabId}-tab`} hidden={!active}>{children}</div>;
}

export function SegmentedControl<T extends string>({
  ariaLabel,
  items,
  value,
  onChange,
  className = "",
}: {
  ariaLabel: string;
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return <div className={`segmented-control ${className}`.trim()} role="group" aria-label={ariaLabel}>{items.map((item) => (
    <button type="button" key={item.id} disabled={item.disabled} aria-pressed={value === item.id} className={value === item.id ? "is-active" : ""} onClick={() => onChange(item.id)}>{item.label}</button>
  ))}</div>;
}

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-required"?: AriaAttributes["aria-required"];
};

export function FormField({
  label,
  hint,
  error,
  required = false,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactElement<FieldControlProps>;
}) {
  const generatedId = useId().replace(/:/g, "");
  const inputId = children.props.id ?? `field-${generatedId}`;
  const messageId = `${inputId}-${error ? "error" : "hint"}`;
  const describedBy = [children.props["aria-describedby"], hint || error ? messageId : undefined].filter(Boolean).join(" ") || undefined;
  return <label className={`form-field ${error ? "form-field--error" : ""} ${className}`.trim()} htmlFor={inputId}>
    <span>{label}{required && <span aria-hidden="true"> *</span>}</span>
    {cloneElement(children, {
      id: inputId,
      required: children.props.required ?? required,
      "aria-describedby": describedBy,
      "aria-invalid": error ? true : children.props["aria-invalid"],
      "aria-required": children.props["aria-required"] ?? (required || undefined),
    })}
    {(error || hint) && <small id={messageId} className={error ? "form-field__error" : "form-field__hint"} role={error ? "alert" : undefined}>{error || hint}</small>}
  </label>;
}

export function FormActions({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`form-actions ${className}`.trim()} {...props} />;
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><LoaderCircle className="button__spinner" size={20} aria-hidden="true" /><span>{label}</span></div>;
}

export function ErrorState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="error-state" role="alert"><CircleAlert size={22} aria-hidden="true" /><div><strong>{title}</strong><p>{text}</p>{action}</div></div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return <Card className="stat-card">{icon && <span className="stat-card__icon">{icon}</span>}<span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</Card>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="section-heading__action">{action}</div>}
    </header>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Sparkles size={20} aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function TextLink({ children }: { children: ReactNode }) {
  return (
    <span className="text-link">
      {children}
      <ArrowRight size={16} aria-hidden="true" />
    </span>
  );
}
