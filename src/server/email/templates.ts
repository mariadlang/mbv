import { minorUnitsToDecimal, type BillingInterval } from "@/src/domain/commercialOffer";

export const TRANSACTIONAL_EMAIL_KINDS = [
  "premium_welcome",
  "commercial_eligibility_admin",
  "commercial_trial_activated",
  "commercial_trial_ended",
  "subscription_renewed",
  "renewal_payment_requested",
  "renewal_pending",
  "payment_failed",
  "subscription_cancelled",
] as const;

export type TransactionalEmailKind = typeof TRANSACTIONAL_EMAIL_KINDS[number];

interface CommonUserEmailInput {
  name?: string | null;
  appUrl: string;
  subscriptionUrl: string;
  supportEmail: string;
  timeZone?: string;
}

export type TransactionalEmailInput =
  | ({
    kind: "premium_welcome";
    interval: BillingInterval;
    amountMinor: number;
    currency: "USD";
    periodStart: string;
    periodEnd: string;
    renewalDescription: string;
  } & CommonUserEmailInput)
  | {
    kind: "commercial_eligibility_admin";
    userName?: string | null;
    userEmail: string;
    eligibleAt: string;
    participationStart: string;
    participationEnd: string;
    adminRecordUrl: string;
    supportEmail: string;
    timeZone?: string;
  }
  | ({ kind: "commercial_trial_activated"; trialStart: string; trialEnd: string } & CommonUserEmailInput)
  | ({ kind: "commercial_trial_ended" } & CommonUserEmailInput)
  | ({
    kind: "subscription_renewed";
    interval: BillingInterval;
    amountMinor: number;
    currency: "USD";
    periodStart: string;
    periodEnd: string;
  } & CommonUserEmailInput)
  | ({
    kind: "renewal_payment_requested";
    interval: BillingInterval;
    amountMinor: number;
    currency: "USD";
    dueAt: string;
    paymentUrl: string;
  } & CommonUserEmailInput)
  | ({ kind: "renewal_pending"; interval: BillingInterval; nextReviewAt?: string | null } & CommonUserEmailInput)
  | ({ kind: "payment_failed"; actionUrl: string; statusDetail?: string | null } & CommonUserEmailInput)
  | ({ kind: "subscription_cancelled"; cancelledAt: string; accessUntil?: string | null } & CommonUserEmailInput);

export interface RenderedTransactionalEmail {
  kind: TransactionalEmailKind;
  subject: string;
  html: string;
  text: string;
}

interface EmailContent {
  subject: string;
  preview: string;
  heading: string;
  paragraphs: string[];
  details?: Array<[string, string]>;
  bullets?: string[];
  cta?: { label: string; url: string };
  footer?: string;
}

const PREMIUM_WELCOME_FEATURES = [
  "Visión: escribe qué quieres construir y qué es importante para ti.",
  "Objetivos y metas: convierte esa visión en objetivos concretos y próximos pasos.",
  "Hábitos: registra las acciones que quieres sostener en tu día a día.",
  "Mi día: organiza las acciones de hoy y marca tus avances.",
  "Dashboard: consulta tu organización y prioridades desde una vista general.",
  "Fitness y alimentación: organiza esta área con las herramientas disponibles.",
  "Finanzas: reúne y revisa tu información financiera dentro del módulo.",
  "Análisis avanzado de tu progreso: revisa avances y patrones disponibles en tus datos.",
  "Recomendaciones para ti: consulta sugerencias basadas en la información de tu perfil.",
] as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeWebUrl(value: string): string {
  const url = new URL(value);
  const local = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) throw new Error("INVALID_EMAIL_URL");
  if (url.username || url.password) throw new Error("INVALID_EMAIL_URL");
  return url.toString();
}

function supportAddress(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error("INVALID_SUPPORT_EMAIL");
  return normalized;
}

function greeting(name?: string | null): string {
  const normalized = name?.trim();
  return normalized ? `Hola, ${normalized}:` : "Hola:";
}

function intervalLabel(interval: BillingInterval): string {
  return interval === "monthly" ? "Premium mensual" : "Premium anual";
}

function formatDate(value: string, timeZone = "America/Bogota"): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_EMAIL_DATE");
  try {
    return new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone }).format(date);
  } catch {
    throw new Error("INVALID_EMAIL_TIME_ZONE");
  }
}

function formatAmount(amountMinor: number, currency: "USD"): string {
  return `${currency} ${minorUnitsToDecimal(amountMinor).replace(".", ",")}`;
}

function renderHtml(content: EmailContent, supportEmail: string): string {
  const details = content.details?.length
    ? `<table role="presentation" class="details" width="100%" cellspacing="0" cellpadding="0">${content.details.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</table>`
    : "";
  const bullets = content.bullets?.length
    ? `<ul>${content.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  const cta = content.cta
    ? `<p class="cta"><a href="${escapeHtml(safeWebUrl(content.cta.url))}" target="_blank">${escapeHtml(content.cta.label)}</a></p>`
    : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(content.subject)}</title><style>
body{margin:0;background:linen;color:darkslategray;font-family:Arial,sans-serif}.preview{display:none;max-height:0;overflow:hidden;opacity:0}.wrap{padding:28px 12px}.card{max-width:620px;margin:0 auto;background:white;border:1px solid gainsboro;border-radius:20px;overflow:hidden}.brand{padding:22px 28px;background:sienna;color:white;font-size:18px;font-weight:700}.content{padding:32px 28px}h1{font-size:27px;line-height:1.25;margin:0 0 20px}p,li,td{font-size:16px;line-height:1.6}ul{padding-left:22px}.details{margin:22px 0;border-collapse:collapse}.details td{padding:9px 0;border-bottom:1px solid linen}.details td:first-child{font-weight:700;padding-right:16px}.details td:last-child{text-align:right}.cta{margin:28px 0}.cta a{display:inline-block;background:sienna;color:white!important;text-decoration:none;padding:13px 20px;border-radius:999px;font-weight:700}.footer{padding:20px 28px;background:seashell;color:dimgray;font-size:13px;line-height:1.5}.footer a{color:sienna}
@media(max-width:520px){.wrap{padding:0}.card{border:0;border-radius:0}.brand,.content,.footer{padding-left:20px;padding-right:20px}h1{font-size:23px}.details td{display:block;text-align:left!important}.details td:first-child{border-bottom:0;padding-bottom:0}.details td:last-child{padding-top:2px}}
</style></head><body><span class="preview">${escapeHtml(content.preview)}</span><div class="wrap"><div class="card"><div class="brand">My Best Version</div><main class="content"><h1>${escapeHtml(content.heading)}</h1>${content.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${details}${bullets}${cta}${content.footer ? `<p>${escapeHtml(content.footer)}</p>` : ""}</main><footer class="footer">Una vida más tuya, paso a paso.<br>¿Necesitas ayuda? Escríbenos a <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</footer></div></div></body></html>`;
}

function renderText(content: EmailContent, supportEmail: string): string {
  const parts = [content.heading, "", ...content.paragraphs];
  if (content.details?.length) parts.push("", ...content.details.map(([label, value]) => `${label}: ${value}`));
  if (content.bullets?.length) parts.push("", ...content.bullets.map((item) => `- ${item}`));
  if (content.cta) parts.push("", `${content.cta.label}: ${safeWebUrl(content.cta.url)}`);
  if (content.footer) parts.push("", content.footer);
  parts.push("", "Una vida más tuya, paso a paso.", `Soporte: ${supportEmail}`);
  return parts.join("\n");
}

function contentFor(input: TransactionalEmailInput): EmailContent {
  const timeZone = input.timeZone ?? "America/Bogota";
  if (input.kind === "premium_welcome") return {
    subject: "Tu Premium de My Best Version está activo: empieza por aquí",
    preview: "Tu pago se confirmó y Premium ya está activo.",
    heading: "Tu Premium está activo",
    paragraphs: [
      greeting(input.name),
      "Tu pago se ha confirmado y Premium ya está activo.",
      "No necesitas configurar todo hoy. Puedes comenzar por lo que más te ayude.",
    ],
    details: [
      ["Tu plan", intervalLabel(input.interval)],
      ["Importe", formatAmount(input.amountMinor, input.currency)],
      ["Período", `${formatDate(input.periodStart, timeZone)} a ${formatDate(input.periodEnd, timeZone)}`],
      ["Próxima renovación o vencimiento", input.renewalDescription],
    ],
    bullets: [...PREMIUM_WELCOME_FEATURES, "Para empezar: completa tu perfil, elige una meta y añade una acción a tu plan del día."],
    cta: { label: "Entrar a My Best Version", url: input.appUrl },
    footer: `Puedes revisar tu suscripción y sus fechas en Mi plan: ${safeWebUrl(input.subscriptionUrl)}`,
  };
  if (input.kind === "commercial_eligibility_admin") return {
    subject: "Nueva elegibilidad para prueba Premium pendiente de revisión",
    preview: "Una persona completó la condición de participación.",
    heading: "Hay una elegibilidad para revisar",
    paragraphs: [
      "Una persona completó 30 días consecutivos de uso válido. El beneficio sigue pendiente hasta que una persona administradora revise y active la prueba.",
      "Este aviso no activa Premium ni modifica pagos.",
    ],
    details: [
      ["Persona", input.userName?.trim() || "Sin nombre registrado"],
      ["Correo", input.userEmail],
      ["Elegibilidad", formatDate(input.eligibleAt, timeZone)],
      ["Período verificado", `${formatDate(input.participationStart, timeZone)} a ${formatDate(input.participationEnd, timeZone)}`],
      ["Estado", "Pendiente de revisión"],
    ],
    cta: { label: "Abrir ficha administrativa", url: input.adminRecordUrl },
  };
  if (input.kind === "commercial_trial_activated") return {
    subject: "Tu prueba de Premium ya está activa",
    preview: "Tienes 30 días de Premium sin cobro automático.",
    heading: "Tu prueba Premium comenzó",
    paragraphs: [greeting(input.name), "Tu beneficio fue revisado y activado. Esta prueba no crea cobros automáticos."],
    details: [["Inicio", formatDate(input.trialStart, timeZone)], ["Final", formatDate(input.trialEnd, timeZone)]],
    cta: { label: "Entrar a My Best Version", url: input.appUrl },
    footer: `Puedes consultar el estado en Mi plan: ${safeWebUrl(input.subscriptionUrl)}`,
  };
  if (input.kind === "commercial_trial_ended") return {
    subject: "Tu prueba de Premium terminó",
    preview: "Tus datos siguen disponibles y puedes continuar con Gratis.",
    heading: "Tu prueba Premium finalizó",
    paragraphs: [greeting(input.name), "Tus datos se conservan. Puedes seguir usando las funciones Gratis y revisar Premium cuando tenga sentido para ti."],
    cta: { label: "Revisar Mi plan", url: input.subscriptionUrl },
  };
  if (input.kind === "subscription_renewed") return {
    subject: "Confirmamos la renovación de tu Premium",
    preview: "Tu pago fue confirmado para el nuevo período.",
    heading: "Tu Premium fue renovado",
    paragraphs: [greeting(input.name), "El pago de este ciclo fue confirmado. Este mensaje resume el período; el comprobante de pago lo gestiona Mercado Pago."],
    details: [
      ["Plan", intervalLabel(input.interval)],
      ["Importe", formatAmount(input.amountMinor, input.currency)],
      ["Período", `${formatDate(input.periodStart, timeZone)} a ${formatDate(input.periodEnd, timeZone)}`],
    ],
    cta: { label: "Revisar Mi plan", url: input.subscriptionUrl },
  };
  if (input.kind === "renewal_payment_requested") return {
    subject: "Tu suscripción Premium está lista para renovar",
    preview: "Hay una solicitud de pago correspondiente a tu próximo período.",
    heading: "Puedes pagar tu próximo período",
    paragraphs: [greeting(input.name), "Esta solicitud corresponde al período indicado. Enviar este mensaje no marca el pago como confirmado."],
    details: [["Plan", intervalLabel(input.interval)], ["Importe", formatAmount(input.amountMinor, input.currency)], ["Fecha", formatDate(input.dueAt, timeZone)]],
    cta: { label: "Pagar mi suscripción", url: input.paymentUrl },
  };
  if (input.kind === "renewal_pending") return {
    subject: "Tu pago de renovación sigue pendiente",
    preview: "No necesitas iniciar un segundo pago mientras se confirma el actual.",
    heading: "Tu pago sigue pendiente",
    paragraphs: [greeting(input.name), "Mercado Pago todavía está procesando el cobro. No inicies un segundo pago mientras este permanezca pendiente."],
    details: [
      ["Plan", intervalLabel(input.interval)],
      ...(input.nextReviewAt ? [["Próxima revisión", formatDate(input.nextReviewAt, timeZone)] as [string, string]] : []),
    ],
    cta: { label: "Revisar Mi plan", url: input.subscriptionUrl },
  };
  if (input.kind === "payment_failed") return {
    subject: "No pudimos confirmar tu pago de Premium",
    preview: "Tu información sigue aquí; puedes revisar el medio de pago.",
    heading: "El pago necesita tu atención",
    paragraphs: [greeting(input.name), "El pago no pudo confirmarse. Tu información no se elimina y un fallo de correo o de pago no crea otro cobro."],
    details: input.statusDetail ? [["Detalle", input.statusDetail]] : undefined,
    cta: { label: "Revisar el pago", url: input.actionUrl },
  };
  return {
    subject: "Confirmamos la cancelación de tu suscripción",
    preview: "La cancelación quedó registrada.",
    heading: "Tu cancelación quedó registrada",
    paragraphs: [greeting(input.name), "No se crearán nuevos períodos después de la cancelación efectiva. Tus datos se conservan y las funciones Gratis siguen disponibles."],
    details: [
      ["Cancelación registrada", formatDate(input.cancelledAt, timeZone)],
      ...(input.accessUntil
        ? [["Acceso Premium hasta", formatDate(input.accessUntil, timeZone)] as [string, string]]
        : [["Acceso Premium", "Finaliza cuando la cancelación se haga efectiva"] as [string, string]]),
    ],
    cta: { label: "Revisar Mi plan", url: input.subscriptionUrl },
  };
}

export function renderTransactionalEmail(input: TransactionalEmailInput): RenderedTransactionalEmail {
  const supportEmail = supportAddress(input.supportEmail);
  const content = contentFor(input);
  return {
    kind: input.kind,
    subject: content.subject,
    html: renderHtml(content, supportEmail),
    text: renderText(content, supportEmail),
  };
}
