"use client";

import { useRef, useState, type FormEvent } from "react";
import { Bug, ChevronDown, HelpCircle, Lightbulb, Mail, Paperclip, Send } from "lucide-react";
import { Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { suggestionCategories, type FeedbackType } from "@/src/domain/support";
import { useSupport } from "@/src/hooks/useSupport";
import { analyticsService } from "@/src/services/analyticsService";

type FormState = { category: string; subject: string; message: string; attachment: File | null };
const emptyForm = (): FormState => ({ category: "", subject: "", message: "", attachment: null });

const options: Array<{ type: FeedbackType; title: string; description: string; icon: typeof Lightbulb }> = [
  { type: "suggestion", title: "Enviar una sugerencia", description: "Comparte una idea que pueda hacer tu experiencia más clara o útil.", icon: Lightbulb },
  { type: "bug", title: "Reportar un problema", description: "Cuéntanos qué intentabas hacer y qué ocurrió.", icon: Bug },
  { type: "support", title: "Contactar a soporte", description: "Escríbenos desde tu cuenta y te responderemos por correo.", icon: Mail },
];

export function SupportPage() {
  const support = useSupport();
  const [active, setActive] = useState<FeedbackType>("suggestion");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setNotice(null);
    try {
      const category = active === "suggestion" ? form.category : active === "bug" ? form.category || "Aplicación" : "Soporte general";
      const subject = active === "bug" ? `Intentaba: ${form.subject}` : form.subject;
      await support.submit({ type: active, category, subject, message: form.message, attachment: form.attachment ?? undefined, pageUrl: typeof window === "undefined" ? undefined : window.location.pathname });
      analyticsService.track(active === "suggestion" ? "suggestion_submitted" : active === "bug" ? "bug_report_submitted" : "support_request_submitted", { section: active });
      setForm(emptyForm()); if (fileRef.current) fileRef.current.value = "";
      setNotice({ tone: "success", text: active === "suggestion" ? "¡Gracias por ayudarnos a mejorar! Tu sugerencia fue enviada correctamente." : active === "bug" ? "Gracias por avisarnos. Recibimos tu reporte y podremos revisarlo con el contexto técnico necesario." : "Recibimos tu mensaje. Te responderemos lo antes posible al correo asociado con tu cuenta." });
    } catch (error) {
      const text = error instanceof Error && error.message.includes("2 MB") ? error.message : "No pudimos enviar el mensaje. Revisa los campos e inténtalo de nuevo.";
      setNotice({ tone: "error", text });
    } finally { setSaving(false); }
  };

  const fieldLabel = active === "suggestion" ? "Título" : active === "bug" ? "¿Qué estabas intentando hacer?" : "Asunto";
  const descriptionLabel = active === "suggestion" ? "Descripción de la sugerencia" : active === "bug" ? "Descripción del problema" : "Mensaje";

  return <div className="page-stack support-page">
    <SectionHeading eyebrow="Estamos para escucharte" title="Ayuda y soporte" description="¿Necesitas ayuda o tienes una idea para mejorar My Best Version? Estamos aquí para escucharte." />
    <div className="support-option-grid" role="tablist" aria-label="Opciones de ayuda">
      {options.map((option) => { const Icon = option.icon; return <button key={option.type} type="button" role="tab" aria-selected={active === option.type} className={active === option.type ? "is-active" : ""} onClick={() => { setActive(option.type); setForm(emptyForm()); setNotice(null); }}><span><Icon size={21} /></span><strong>{option.title}</strong><small>{option.description}</small></button>; })}
    </div>
    <Card className="support-form-card">
      <form onSubmit={submit}>
        <header><div><p className="eyebrow">MENSAJE PRIVADO</p><h2>{options.find((item) => item.type === active)?.title}</h2></div><Send size={22} aria-hidden="true" /></header>
        {active === "suggestion" && <label className="form-field"><span>Categoría</span><select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="">Selecciona una categoría</option>{suggestionCategories.map((category) => <option key={category}>{category}</option>)}</select></label>}
        {active === "bug" && <label className="form-field"><span>Sección donde ocurrió</span><input required maxLength={80} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Ej. Planificación semanal" /></label>}
        <label className="form-field"><span>{fieldLabel}</span><input required minLength={3} maxLength={160} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
        <label className="form-field"><span>{descriptionLabel}</span><textarea required minLength={10} maxLength={5000} rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Cuéntanos lo necesario para poder ayudarte, sin incluir contraseñas ni información sensible." /></label>
        <label className="support-file"><Paperclip size={18} /><span><strong>Archivo o captura opcional</strong><small>PDF, JPG, PNG o TXT · máximo 2 MB</small></span><input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" onChange={(event) => setForm({ ...form, attachment: event.target.files?.[0] ?? null })} /></label>
        {notice && <p className={`inline-message ${notice.tone === "error" ? "inline-message--error" : ""}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p>}
        <Button type="submit" loading={saving}>{active === "suggestion" ? "Enviar sugerencia" : active === "bug" ? "Enviar reporte" : "Enviar mensaje"}</Button>
      </form>
      <aside><HelpCircle size={23} /><h3>Tu privacidad importa</h3><p>Un reporte guarda la ruta, fecha, navegador, sistema operativo, versión e ID interno. Nunca registra contraseñas, tokens, diario ni contenido sensible.</p></aside>
    </Card>
    <Card className="support-faqs"><header><div><p className="eyebrow">RESPUESTAS BREVES</p><h2>Preguntas frecuentes</h2></div>{support.loading && <small role="status">Actualizando…</small>}</header>{support.faqs.map((faq) => <details key={faq.id}><summary>{faq.question}<ChevronDown size={17} /></summary><p>{faq.answer}</p></details>)}</Card>
  </div>;
}

export function MarketingPreferenceControl() {
  const support = useSupport();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const update = async (consent: boolean) => { setSaving(true); setMessage(""); try { await support.setMarketingConsent(consent); setMessage(consent ? "Preferencia guardada." : "Dejaste de recibir comunicaciones comerciales."); } catch { setMessage("No pudimos actualizar esta preferencia."); } finally { setSaving(false); } };
  return <div className="marketing-preference"><label><input type="checkbox" checked={support.marketingConsent} disabled={support.loading || saving} onChange={(event) => void update(event.target.checked)} /><span>Quiero recibir novedades, recursos y ofertas de My Best Version por correo electrónico.</span></label><small>Es opcional y puedes retirarlo cuando quieras. Los correos operativos de seguridad, cuenta y soporte se gestionan por separado.</small>{message && <small role="status">{message}</small>}</div>;
}
