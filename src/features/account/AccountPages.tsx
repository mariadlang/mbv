"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { Button, Card } from "@/src/components/ui/Primitives";
import { billingService } from "@/src/services/billingService";
import { useAccount } from "@/src/hooks/useAccount";
import { analyticsService, clearAuthAnalyticsIntent, rememberAuthAnalyticsIntent } from "@/src/services/analyticsService";
import { LanguageSwitcher } from "@/src/components/ui/LanguageSwitcher";
import { CookiePreferencesButton, useCookieConsent } from "@/src/features/legal/CookieConsent";
import { LEGAL_VERSION } from "@/src/lib/legalConfig";
import { CTA } from "@/src/lib/cta";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { MessageKey } from "@/src/i18n/keys";
import { captureReferralAttribution } from "@/src/services/referralAttributionService";
import { publicConfig } from "@/src/lib/publicConfig";
import { isBillingInterval, type BillingInterval } from "@/src/domain/commercialOffer";
import { buildAuthEntryPath, DEFAULT_AUTH_DESTINATION, resolveAuthDestination } from "@/src/lib/authRedirect";
export { LandingPage } from "@/src/features/landing/LandingPage";

const credentialsSchema = z.object({
  email: z.string().trim().email("Escribe un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});
const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(2, "Cuéntanos cómo quieres que te llamemos.") });
const PENDING_AUTH_DESTINATION_KEY = "mbv-pending-auth-destination-v1";

function rememberAuthDestination(destination: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PENDING_AUTH_DESTINATION_KEY, JSON.stringify({ destination, expiresAt: Date.now() + 86_400_000 }));
  } catch {
    // The query string remains the primary return path when storage is unavailable.
  }
}

function readPendingAuthDestination() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_AUTH_DESTINATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { destination?: unknown; expiresAt?: unknown };
    if (typeof parsed.destination !== "string" || typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) {
      window.localStorage.removeItem(PENDING_AUTH_DESTINATION_KEY);
      return null;
    }
    const loginPath = buildAuthEntryPath("/login", parsed.destination);
    if (loginPath === "/login") return null;
    return resolveAuthDestination(new URL(loginPath, window.location.origin).search);
  } catch {
    return null;
  }
}

function clearPendingAuthDestination() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(PENDING_AUTH_DESTINATION_KEY); } catch { /* Storage can be unavailable. */ }
}

const freeCapabilityKeys = ["free.capability.vision", "free.capability.goals", "free.capability.habits", "free.capability.today", "free.capability.dashboard"] satisfies MessageKey[];
const premiumCapabilityKeys = ["premium.capability.included", "premium.capability.fitness", "premium.capability.finances", "premium.capability.analysis", "premium.capability.recommendations"] satisfies MessageKey[];
const rewardStepKeys = ["trial.reward.free", "trial.reward.streak", "trial.reward.alert", "trial.reward.activation"] satisfies MessageKey[];
type BillingConfirmationState = "checking" | "pending" | "confirmed" | "auth" | "error";

async function readBillingConfirmationState(): Promise<BillingConfirmationState> {
  try {
    const status = await billingService.getStatus();
    return status.accessStatus === "paid_monthly" || status.accessStatus === "paid_annual" ? "confirmed" : "pending";
  } catch (caught) {
    return caught instanceof Error && caught.message === "AUTH_REQUIRED" ? "auth" : "error";
  }
}

async function syncBillingConfirmation(refreshAccess: () => Promise<void>): Promise<BillingConfirmationState> {
  const state = await readBillingConfirmationState();
  if (state !== "confirmed") return state;
  try {
    await refreshAccess();
    return "confirmed";
  } catch {
    return "error";
  }
}

function BillingConfirmationCard() {
  const { m } = useI18n();
  const { refreshAccess } = useAccount();
  const refreshAccessRef = useRef(refreshAccess);
  const [state, setState] = useState<BillingConfirmationState>("checking");

  useEffect(() => { refreshAccessRef.current = refreshAccess; }, [refreshAccess]);
  useEffect(() => {
    let active = true;
    void syncBillingConfirmation(() => refreshAccessRef.current()).then((nextState) => { if (active) setState(nextState); });
    return () => { active = false; };
  }, []);

  const retry = async () => {
    setState("checking");
    setState(await syncBillingConfirmation(() => refreshAccessRef.current()));
  };

  return <Card className="billing-confirmation" role="status" aria-live="polite"><p className="eyebrow">{m("premium.confirmation.eyebrow")}</p><h2>{m("premium.confirmation.title")}</h2><p>{m("premium.confirmation.description")}</p>{state === "checking" ? <p>{m("premium.confirmation.checking")}</p> : null}{state === "pending" ? <p>{m("premium.confirmation.pending")}</p> : null}{state === "confirmed" ? <p className="billing-confirmation__confirmed">{m("premium.confirmation.confirmed")}</p> : null}{state === "auth" ? <p>{m("premium.confirmation.auth")}</p> : null}{state === "error" ? <p role="alert">{m("premium.confirmation.error")}</p> : null}<div className="billing-confirmation__actions">{state !== "checking" && state !== "confirmed" ? <Button type="button" variant="secondary" onClick={() => void retry()}>{m("premium.confirmation.retry")}</Button> : null}{state === "auth" ? <Link className="button button--primary" to={buildAuthEntryPath("/login", "/upgrade")}>{m("public.nav.login")}</Link> : null}<Link className="button button--outline" to="/app/settings#plan-settings">{m("premium.confirmation.plan")}</Link></div></Card>;
}

export function TrialPage() {
  const { m } = useI18n();
  return <PublicFrame><section className="trial-page" data-i18n-explicit="true"><p className="eyebrow">{m("trial.eyebrow")}</p><h1>{m("trial.title")}</h1><p className="lead">{m("trial.note")}</p><div className="trial-comparison"><Card><span>{m("trial.included.label")}</span><h2>{m("trial.included.title")}</h2><strong className="trial-plan-price">USD 0</strong><ul>{freeCapabilityKeys.map((key) => <li key={key}><Check size={16} />{m(key)}</li>)}</ul></Card><Card className="trial-premium"><Sparkles size={22} /><span>{m("trial.premium.label")}</span><h2>{m("trial.premium.title")}</h2><strong className="trial-plan-price">{m("premium.monthly.price")} · {m("premium.annual.price")}</strong><ul>{premiumCapabilityKeys.map((key) => <li key={key}><Check size={16} />{m(key)}</li>)}</ul><Link className="button button--secondary" to="/upgrade">{m("premium.eyebrow")}</Link></Card></div><section className="trial-reward" aria-labelledby="trial-reward-title"><p className="eyebrow">{m("trial.reward.eyebrow")}</p><h2 id="trial-reward-title">{m("trial.reward.title")}</h2><p>{m("trial.reward.description")}</p><ol>{rewardStepKeys.map((key, index) => <li key={key}><span>{index + 1}</span><strong>{m(key)}</strong></li>)}</ol></section><Link className="button button--primary" to="/signup" onClick={() => analyticsService.track(CTA.acquisition.event, { source: "trial", route: "/signup", version: 2 })}>{m("public.cta.startTrial")}</Link></section></PublicFrame>;
}

export function PrivacyPage() {
  return <PublicFrame><article className="legal-page">
    <p className="eyebrow">INFORMACIÓN LEGAL</p>
    <h1>Política de Privacidad</h1>
    <p className="legal-page__updated">Última actualización: 11 de septiembre de 2026</p>
    <p className="lead">En My Best Version tratamos tu información con respeto y usamos únicamente los datos necesarios para darte acceso a tu planner y a las integraciones opcionales que decidas activar.</p>

    <section><h2>1. Información que recopilamos</h2><p>Al crear una cuenta podemos recibir tu nombre, correo electrónico y, si eliges iniciar sesión con Google, tu nombre, dirección de correo y foto de perfil. Google no nos entrega tu contraseña. Si después conectas Google Calendar, recibimos el correo de la cuenta conectada, los calendarios que selecciones y los datos necesarios de sus eventos para sincronizarlos.</p></section>
    <section><h2>2. Datos de tu planner</h2><p>Tu visión, metas, hábitos, tareas, journal, finanzas, registros de bienestar, fotos y demás contenido personal se guardan localmente en el navegador de tu dispositivo. La excepción es la copia operativa de los eventos de Google Calendar que decidas sincronizar, que se conserva de forma separada en el servidor únicamente para ejecutar y mostrar la sincronización. No presentamos información de demostración como si fuera tuya y no conectamos cuentas bancarias.</p></section>
    <section><h2>3. Cómo usamos la información</h2><p>Usamos la información de cuenta para autenticarte, proteger el acceso, mantener tus preferencias y habilitar las funciones correspondientes a tu plan. Si conectas Google Calendar, usamos los datos autorizados exclusivamente para mostrar y sincronizar eventos entre los calendarios elegidos y My Best Version.</p><p>Si autorizas la categoría Analítica, registramos eventos técnicos de uso vinculados a tu cuenta para entender activación y funcionamiento. No incluyen nombres, correos, títulos, contenido del journal ni información de salud, finanzas o calendarios. No vendemos tus datos personales ni los utilizamos para publicidad personalizada.</p></section>
    <section><h2>4. Servicios de Google</h2><p>El inicio de sesión con Google solicita únicamente los permisos básicos de identidad necesarios para acceder: perfil, nombre y correo electrónico. No concede acceso a Google Calendar y se mantiene separado de cualquier integración posterior.</p><p>Conectar Google Calendar es opcional y requiere una autorización expresa e independiente desde Ajustes. Rechazarla o retirarla no afecta tu cuenta ni las demás funciones. La conexión solicita únicamente <code>openid</code>, <code>email</code>, lectura de la lista de calendarios mediante <code>calendar.calendarlist.readonly</code> y acceso a eventos mediante <code>calendar.events</code>. Dentro del producto limitamos el tratamiento a los calendarios que elijas; no solicitamos acceso a Google Drive, Contactos ni Gmail.</p><p>Los tokens de acceso y actualización se cifran en el servidor y nunca se guardan en el navegador ni en tus respaldos. La copia de títulos, descripciones, fechas, horas, zonas horarias e identificadores se usa únicamente para sincronizar. Puedes desconectar la integración cuando quieras; desde la app intentamos revocar el permiso en Google y eliminamos los tokens y la copia sincronizada del servidor.</p><p>El uso y la transferencia de información recibida de las APIs de Google cumplen la Política de Datos del Usuario de los Servicios API de Google, incluidos sus requisitos de Uso Limitado.</p></section>
    <section><h2>5. Datos sensibles y menores</h2><p>Algunos registros de bienestar, salud, ánimo, sueño o medidas pueden considerarse sensibles. Permanecen localmente en tu dispositivo y su uso es opcional. Si eres menor de edad, utiliza la aplicación únicamente con autorización y acompañamiento de tu representante legal.</p></section>
    <section><h2>6. Proveedores y tratamiento internacional</h2><p>Utilizamos Supabase para autenticación, controles legales y almacenamiento server-side de la integración de Calendar; Vercel para publicar y ejecutar la aplicación; y Google únicamente cuando eliges iniciar sesión o conectar Calendar. Estos proveedores pueden procesar información técnica fuera de Colombia para prestar el servicio, bajo sus compromisos contractuales y de seguridad. No les autorizamos a utilizar tu información para sus propios fines publicitarios.</p></section>
    <section><h2>7. Conservación y control</h2><p>Los datos locales permanecen en el dispositivo hasta que los elimines desde la aplicación, borres los datos del navegador o desinstales el navegador. Puedes exportar un respaldo para trasladarlos a otro dispositivo o dominio. Cerrar sesión no elimina la información guardada. Las credenciales cifradas y la copia de sincronización de Google Calendar se conservan mientras mantengas la conexión; al desconectarla desde la app se eliminan del servidor, sin borrar los eventos locales creados en My Best Version.</p></section>
    <section><h2>8. Seguridad</h2><p>Aplicamos medidas razonables para proteger el acceso a la cuenta. Ningún sistema es completamente infalible, por lo que te recomendamos mantener protegido tu dispositivo y no compartir tus credenciales.</p></section>
    <section><h2>9. Derechos de las personas titulares</h2><p>Puedes conocer, actualizar y rectificar tus datos; solicitar prueba de la autorización; conocer el uso dado a la información; revocar la autorización o pedir la supresión cuando proceda; acceder gratuitamente a tus datos y presentar quejas ante la autoridad de protección de datos competente.</p></section>
    <section><h2>10. Consultas y reclamos</h2><p>Solicita acceso, corrección, revocación o eliminación mediante el correo de asistencia indicado en la pantalla de consentimiento de Google. Incluye el correo de la cuenta, una descripción clara y la información necesaria para verificar tu identidad. Atenderemos la solicitud dentro de los plazos legales aplicables. También puedes gestionar los datos locales desde Ajustes y datos.</p></section>
    <section><h2>11. Base y finalidad del tratamiento</h2><p>Tratamos la información con tu autorización, para ejecutar el servicio que solicitas, proteger la cuenta, cumplir obligaciones legales y atender solicitudes. La base de datos de cuentas se conservará mientras mantengas una relación con el servicio y durante los periodos adicionales exigidos por seguridad o ley.</p></section>
    <section><h2>12. Cambios a esta política</h2><p>Si esta política cambia de forma relevante, actualizaremos la fecha indicada al inicio y comunicaremos el cambio dentro de la aplicación cuando corresponda.</p></section>
  </article></PublicFrame>;
}

export function TermsPage() {
  return <PublicFrame><article className="legal-page">
    <p className="eyebrow">INFORMACIÓN LEGAL</p>
    <h1>Términos del Servicio</h1>
    <p className="legal-page__updated">Última actualización: 11 de septiembre de 2026</p>
    <p className="lead">Estos términos explican las condiciones para utilizar My Best Version. Al crear una cuenta o usar la aplicación, aceptas estas condiciones.</p>

    <section><h2>1. Propósito del servicio</h2><p>My Best Version es una herramienta de organización personal para conectar visión, metas, planificación, hábitos, bienestar, finanzas y reflexión. La aplicación ofrece apoyo para organizar información, pero no sustituye asesoría médica, psicológica, nutricional, financiera o legal.</p></section>
    <section><h2>2. Tu cuenta</h2><p>Debes proporcionar información correcta, proteger tus credenciales y notificarnos si sospechas de un acceso no autorizado. Eres responsable del uso realizado desde tu cuenta y dispositivo.</p></section>
    <section><h2>3. Tus datos y respaldos</h2><p>El contenido detallado del planner se guarda principalmente en tu navegador. Si conectas Google Calendar, una copia operativa de los eventos seleccionados se conserva separadamente en el servidor sólo para sincronizarlos y no se incluye en el respaldo local. Eres responsable de exportar respaldos cuando quieras conservar o trasladar la información local.</p></section>
    <section><h2>4. Prueba y funciones Premium</h2><p>La aplicación puede ofrecer un periodo de prueba y funciones reservadas para planes de pago. Antes de cualquier compra se mostrarán las condiciones, el precio y el proveedor de pago aplicable. No se realiza un cobro automático sin una acción explícita.</p></section>
    <section><h2>5. Uso permitido</h2><p>No debes usar la aplicación para vulnerar cuentas, interferir con el servicio, distribuir software malicioso, infringir derechos de terceros ni realizar actividades ilegales.</p></section>
    <section><h2>6. Bienestar y emergencias</h2><p>Las sugerencias de bienestar son informativas. Si atraviesas una emergencia o situación de riesgo, contacta de inmediato los servicios de emergencia o una línea profesional de apoyo disponible en tu país.</p></section>
    <section><h2>7. Disponibilidad</h2><p>Trabajamos para ofrecer una experiencia estable y segura, pero pueden existir interrupciones por mantenimiento, actualizaciones o causas fuera de nuestro control.</p></section>
    <section><h2>8. Suspensión o cierre</h2><p>Podemos limitar el acceso cuando exista uso abusivo, fraude, riesgo de seguridad o incumplimiento de estos términos. La información local permanecerá bajo el control del dispositivo salvo que la elimines.</p></section>
    <section><h2>9. Cambios</h2><p>Podemos actualizar estos términos para reflejar mejoras del producto o requisitos legales. Cuando el cambio sea relevante, lo comunicaremos dentro de la aplicación.</p></section>
  </article></PublicFrame>;
}

export function LegalCenterPage() {
  const resources = [
    ["/privacy", "Política de Privacidad", "Qué información usamos, para qué y cuáles son tus derechos."],
    ["/terms", "Términos del Servicio", "Las reglas claras para utilizar My Best Version."],
    ["/cookies", "Cookies y almacenamiento local", "Cómo funciona la sesión y dónde se guarda tu planner."],
    ["/data-deletion", "Control y eliminación de datos", "Cómo borrar, respaldar o solicitar la eliminación de tu información."],
    ["/legal-notices", "Avisos importantes", "Límites de las funciones de bienestar, fitness y finanzas."],
  ];
  return <PublicFrame><article className="legal-page legal-page--center">
    <p className="eyebrow">TRANSPARENCIA Y CONFIANZA</p>
    <h1>Centro Legal</h1>
    <p className="lead">Aquí encuentras, en lenguaje claro, cómo funciona My Best Version y qué control tienes sobre tu información.</p>
    <div className="legal-resource-grid">{resources.map(([href, title, text]) => <Link key={href} to={href}><h2>{title}</h2><p>{text}</p><span>Leer documento <ArrowRight size={15} /></span></Link>)}</div>
    <section><h2>Vigencia</h2><p>Estos documentos están vigentes en su versión actual desde el 11 de septiembre de 2026. Las versiones nuevas indicarán su fecha de actualización.</p></section>
  </article></PublicFrame>;
}

export function CookiesPage() {
  return <PublicFrame><article className="legal-page">
    <p className="eyebrow">INFORMACIÓN LEGAL</p><h1>Cookies y almacenamiento local</h1><p className="legal-page__updated">Última actualización: 11 de septiembre de 2026</p>
    <p className="lead">My Best Version utiliza almacenamiento técnico para mantener tu sesión y conservar tu planner en el dispositivo.</p>
    <section><h2>1. Tecnologías necesarias</h2><p>La autenticación puede utilizar cookies o almacenamiento del navegador estrictamente necesarios para mantener la sesión, proteger el acceso y prevenir abusos. Supabase y Google pueden usar sus propias tecnologías durante el inicio de sesión y, sólo si lo solicitas, durante la autorización independiente de Google Calendar.</p></section>
    <section><h2>2. Almacenamiento de tu planner</h2><p>El contenido detallado del planner se conserva en IndexedDB, una base de datos local del navegador. Esto permite que tus metas, hábitos, tareas y reflexiones permanezcan disponibles en ese dispositivo.</p></section>
    <section><h2>3. Analítica opcional y sin publicidad comportamental</h2><p>La categoría Analítica permanece apagada hasta que la autorices. Con tu consentimiento, una cola temporal en localStorage conserva hasta 80 eventos técnicos durante un máximo de 30 días y los envía a Supabase cuando existe una sesión autenticada. No guarda el texto de tu planner ni información sensible. No utilizamos cookies de publicidad personalizada ni vendemos perfiles de navegación.</p></section>
    <section><h2>4. Cómo administrar estos datos</h2><p>Puedes cambiar tu decisión desde Preferencias de cookies. Retirar Analítica elimina la cola local y detiene nuevos registros. También puedes cerrar sesión, eliminar los datos desde Ajustes o borrar el almacenamiento del sitio desde la configuración del navegador. Si bloqueas el almacenamiento estrictamente necesario, algunas funciones pueden dejar de operar.</p></section>
  </article></PublicFrame>;
}

export function DataDeletionPage() {
  return <PublicFrame><article className="legal-page">
    <p className="eyebrow">TU INFORMACIÓN, TU CONTROL</p><h1>Control y eliminación de datos</h1><p className="legal-page__updated">Última actualización: 11 de septiembre de 2026</p>
    <p className="lead">Puedes borrar el contenido del planner, desconectar Google Calendar, retirar el acceso de Google o solicitar la eliminación de la cuenta.</p>
    <section><h2>Eliminar el contenido local</h2><ol><li>Entra a My Best Version.</li><li>Abre Más → Ajustes y datos.</li><li>Selecciona “Eliminar todos los datos”.</li><li>Confirma la acción cuando la aplicación lo solicite.</li></ol><p>Esta acción elimina del navegador las metas, hábitos, tareas, journal, finanzas, fotos y demás registros locales. Antes puedes exportar un respaldo.</p></section>
    <section><h2>Eliminar o corregir la cuenta</h2><p>Solicita la eliminación o corrección desde el correo de asistencia que aparece en la pantalla de consentimiento de Google. Incluye el correo de la cuenta y el tipo de solicitud. Podremos pedir una verificación razonable de identidad antes de procesarla.</p></section>
    <section><h2>Desconectar Google Calendar</h2><p>Desde Más → Ajustes y datos puedes desconectar Calendar. La app intenta revocar el permiso en Google y elimina del servidor los tokens cifrados, calendarios vinculados y la copia usada para sincronizar. Los eventos locales creados en My Best Version permanecen en tu dispositivo.</p></section>
    <section><h2>Retirar el acceso desde Google</h2><p>También puedes retirar el permiso desde tu Cuenta de Google, en Seguridad → Conexiones con apps y servicios de terceros. Esto detiene el acceso futuro, pero no elimina automáticamente la copia de sincronización ya guardada en My Best Version; para eliminarla, desconecta la integración desde la app o solicita la supresión. El permiso de inicio de sesión y el de Calendar son independientes.</p></section>
    <section><h2>Plazos y excepciones</h2><p>Atenderemos consultas y reclamos conforme a los plazos aplicables. Podemos conservar información mínima cuando sea necesaria para seguridad, prevención de fraude o cumplimiento de una obligación legal.</p></section>
  </article></PublicFrame>;
}

export function LegalNoticesPage() {
  return <PublicFrame><article className="legal-page">
    <p className="eyebrow">AVISOS IMPORTANTES</p><h1>Uso responsable de la aplicación</h1><p className="legal-page__updated">Última actualización: 26 de agosto de 2026</p>
    <p className="lead">My Best Version acompaña tu organización personal; no reemplaza profesionales ni servicios de emergencia.</p>
    <section><h2>Bienestar y salud mental</h2><p>Los registros de ánimo, sueño, energía y concentración son herramientas de autoobservación. No constituyen diagnóstico, tratamiento ni recomendación clínica. Ante una crisis o riesgo inmediato, busca los servicios de emergencia o una línea profesional de tu país.</p></section>
    <section><h2>Fitness y nutrición</h2><p>Los ejercicios, macros y medidas son registros personales. Consulta profesionales cualificados antes de iniciar cambios relevantes, especialmente si tienes una condición médica, estás embarazada o presentas dolor o síntomas inusuales.</p></section>
    <section><h2>Finanzas</h2><p>Los presupuestos, ahorros y metas financieras tienen fines organizativos. No constituyen asesoría financiera, contable, tributaria ni de inversión. La aplicación no se conecta a tus bancos y los valores dependen de lo que registres.</p></section>
    <section><h2>Sugerencias automatizadas</h2><p>Las sugerencias de planificación o IA, cuando estén disponibles, pueden ser incompletas o equivocarse. Revísalas con tu propio criterio antes de tomar decisiones importantes.</p></section>
  </article></PublicFrame>;
}

export function LoginPage() { return <AuthForm mode="login" />; }
export function SignupPage() { return <AuthForm mode="signup" />; }

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { m } = useI18n();
  const account = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", acceptedTerms: false, acceptedData: false, adult: false, marketing: false });
  const [message, setMessage] = useState<MessageKey | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [storedDestination] = useState(readPendingAuthDestination);
  const hasExplicitDestination = new URLSearchParams(location.search).has("next");
  const authDestination = hasExplicitDestination
    ? resolveAuthDestination(location.search)
    : storedDestination ?? DEFAULT_AUTH_DESTINATION;
  useEffect(() => {
    if (mode === "signup" && publicConfig.productFeatureFlags.referrals) captureReferralAttribution(location.search);
  }, [location.search, mode]);
  if (account.user && account.access) return <Navigate to={authDestination} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(null); setMessage(null);
    const parsed = (mode === "signup" ? signupSchema : credentialsSchema).safeParse(form);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      setError(field === "email" ? "auth.validation.email" : field === "password" ? "auth.validation.password" : field === "name" ? "auth.validation.name" : "auth.validation.review");
      return;
    }
    if (mode === "signup" && (!form.acceptedTerms || !form.acceptedData || !form.adult)) { setError("auth.validation.consents"); return; }
    if (!account.configured) { setError("auth.error.configuration"); return; }
    if (mode === "signup") analyticsService.track(CTA.signupForm.event, { source: "email_form", route: "/signup", version: 2 }, "email-form:v2");
    rememberAuthDestination(authDestination);
    setSaving(true);
    try {
      if (mode === "signup") {
        const now = new Date().toISOString();
        const result = await account.signUp({ name: form.name, email: form.email, password: form.password, legalVersion: LEGAL_VERSION, termsAcceptedAt: now, dataProcessingAcceptedAt: now, adultDeclaredAt: now, marketingConsent: form.marketing, marketingAcceptedAt: form.marketing ? now : null });
        analyticsService.track("signup_completed", { source: "email_form", version: 2 }, "email-signup:v2");
        if (result.emailVerificationRequired) { navigate("/verify-email", { state: { email: form.email, destination: authDestination } }); return; }
      } else { await account.signIn({ email: form.email, password: form.password }); analyticsService.track("login_succeeded"); }
      clearPendingAuthDestination();
      navigate(authDestination);
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "";
      setError(text.includes("Invalid login") ? "auth.error.credentials" : "auth.error.access");
    } finally { setSaving(false); }
  };

  const continueWithGoogle = async () => {
    setError(null); setMessage(null);
    if (mode === "signup" && (!form.acceptedTerms || !form.acceptedData || !form.adult)) { setError("auth.validation.googleConsents"); return; }
    if (!account.configured) { setError("auth.error.configuration"); return; }
    if (mode === "signup") analyticsService.track(CTA.signupForm.event, { source: "google", route: "/signup", version: 2 }, "google:v2");
    rememberAuthAnalyticsIntent(mode, "google");
    rememberAuthDestination(authDestination);
    setSaving(true);
    try { await account.signInWithGoogle(); }
    catch { clearAuthAnalyticsIntent(); setError("auth.error.google"); setSaving(false); }
  };

  const sendMagicLink = async () => {
    setError(null); setMessage(null);
    const parsed = z.string().trim().email("Escribe un correo válido.").safeParse(form.email);
    if (!parsed.success) { setError("auth.validation.email"); return; }
    if (!account.configured) { setError("auth.error.configuration"); return; }
    rememberAuthDestination(authDestination);
    setSaving(true);
    try {
      await account.signInWithMagicLink(parsed.data);
      rememberAuthAnalyticsIntent("login", "magic_link");
      setMessage("auth.magicLink.sent");
    } catch { setError("auth.error.magicLink"); }
    finally { setSaving(false); }
  };

  const alternateAuthPath = buildAuthEntryPath(mode === "signup" ? "/login" : "/signup", authDestination);
  return <PublicFrame><section className="auth-card" data-i18n-explicit="true"><span className="auth-card__icon">{mode === "signup" ? <Sparkles size={22} /> : <LockKeyhole size={22} />}</span><p className="eyebrow">{m(mode === "signup" ? "auth.signup.eyebrow" : "auth.login.eyebrow")}</p><h1>{m(mode === "signup" ? "auth.signup.title" : "auth.login.title")}</h1><p>{m(mode === "signup" ? "auth.signup.description" : "auth.login.description")}</p>{mode === "signup" && <div className="signup-consents" aria-label={m("auth.consent.label")}><label className="legal-consent"><input type="checkbox" checked={form.acceptedTerms} onChange={(event) => setForm({ ...form, acceptedTerms: event.target.checked })} /><span>{m("auth.consent.terms")} <Link to="/terms">{m("public.nav.termsFull")}</Link>. <strong>{m("auth.consent.required")}</strong></span></label><label className="legal-consent"><input type="checkbox" checked={form.acceptedData} onChange={(event) => setForm({ ...form, acceptedData: event.target.checked })} /><span>{m("auth.consent.data")} <Link to="/data-policy">{m("public.nav.dataPolicyTitle")}</Link>. <strong>{m("auth.consent.required")}</strong></span></label><label className="legal-consent"><input type="checkbox" checked={form.adult} onChange={(event) => setForm({ ...form, adult: event.target.checked })} /><span>{m("auth.consent.adult")} <strong>{m("auth.consent.required")}</strong></span></label><label className="legal-consent"><input type="checkbox" checked={form.marketing} onChange={(event) => setForm({ ...form, marketing: event.target.checked })} /><span>{m("auth.consent.marketing")}</span></label></div>}<div className="auth-options"><Button type="button" variant="outline" disabled={saving} onClick={continueWithGoogle}><span className="google-mark" aria-hidden="true">G</span> {m("auth.google.continue")}</Button>{mode === "login" && <small className="auth-legal-note">{m("auth.google.privacy")} <Link to="/privacy">{m("public.nav.privacyNotice")}</Link>.</small>}</div><div className="auth-divider"><span>{m("auth.email.divider")}</span></div><form onSubmit={submit}>{mode === "signup" && <label><span>{m("auth.field.name")}</span><input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}<label><span>{m("auth.field.email")}</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span>{m("auth.field.password")}</span><input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error" role="alert">{m(error)}</p>}{message && <p className="inline-message" role="status">{m(message)}</p>}<Button type="submit" disabled={saving}>{saving ? m("auth.loading") : m(mode === "signup" ? "public.cta.account" : "public.nav.login")}</Button>{mode === "login" && <Button type="button" variant="secondary" disabled={saving} onClick={sendMagicLink}><Mail size={17} aria-hidden="true" /> {m("auth.magicLink.submit")}</Button>}</form>{mode === "login" && <Link to="/forgot-password">{m("auth.forgot")}</Link>}<p>{m(mode === "signup" ? "auth.hasAccount" : "auth.needsAccount")} <Link to={alternateAuthPath}>{m(mode === "signup" ? "public.nav.login" : "public.cta.account")}</Link></p></section></PublicFrame>;
}

export function VerifyEmailPage() {
  const { m } = useI18n();
  const location = useLocation();
  const requestedDestination = (location.state as { destination?: unknown } | null)?.destination;
  const fallbackDestination = readPendingAuthDestination() ?? DEFAULT_AUTH_DESTINATION;
  const loginPath = buildAuthEntryPath(
    "/login",
    typeof requestedDestination === "string" ? requestedDestination : fallbackDestination,
  );
  return <PublicFrame><section className="auth-card auth-card--message" data-i18n-explicit="true"><span className="auth-card__icon"><Mail size={22} /></span><h1>{m("auth.verify.title")}</h1><p>{m("auth.verify.description")}</p><a className="button button--primary" href="mailto:">{m("public.cta.verify")}</a><Link className="button button--secondary" to={loginPath}>{m("auth.verify.confirmed")}</Link></section></PublicFrame>;
}

export function ForgotPasswordPage() {
  const { m } = useI18n();
  const account = useAccount(); const [email, setEmail] = useState(""); const [status, setStatus] = useState<MessageKey | null>(null);
  const submit = async (event: FormEvent) => { event.preventDefault(); const parsed = z.string().email().safeParse(email); if (!parsed.success) return setStatus("auth.validation.email"); if (!account.configured) return setStatus("auth.error.configuration"); try { await account.requestPasswordReset(email); setStatus("auth.recovery.sent"); } catch { setStatus("auth.error.magicLink"); } };
  return <PublicFrame><section className="auth-card" data-i18n-explicit="true"><h1>{m("auth.recovery.title")}</h1><p>{m("auth.recovery.description")}</p><form onSubmit={submit}><label><span>{m("auth.field.email")}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{status && <p role="status">{m(status)}</p>}<Button type="submit">{m("auth.recovery.submit")}</Button></form><Link to="/login">{m("public.cta.return")}</Link></section></PublicFrame>;
}

export function UpgradePage() {
  const { m } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const intervalParam = query.get("interval");
  const selectedInterval = isBillingInterval(intervalParam) ? intervalParam : null;
  const confirmingPayment = query.get("billing") === "confirming";
  const [checkoutPeriod, setCheckoutPeriod] = useState<BillingInterval | null>(null);
  const [checkoutError, setCheckoutError] = useState(false);
  const { preferences: cookiePreferences } = useCookieConsent();
  const trackedOpen = useRef(false);
  useEffect(() => {
    if (!cookiePreferences?.analytics || trackedOpen.current) return;
    trackedOpen.current = true;
    analyticsService.track("upgrade_opened", { source: "upgrade_page", route: "/upgrade", version: 2 }, "page-opened:v2");
    analyticsService.track("paywall_view", { source: "upgrade_page", route: "/upgrade", section: "planes", version: 2 }, "page-opened:v2");
  }, [cookiePreferences?.analytics]);
  const trackCheckout = (period: BillingInterval) => {
    analyticsService.track("premium_checkout_click", { source: "upgrade_page", route: "/upgrade", section: period, version: 2 }, `mercado-pago:${period}:v2`);
    analyticsService.track(CTA.checkout.event, { source: "upgrade_page", route: "/upgrade", version: 2 }, `mercado-pago:${period}:v2`);
  };

  const startCheckout = async (period: BillingInterval) => {
    setCheckoutError(false);
    setCheckoutPeriod(period);
    trackCheckout(period);
    try {
      const checkout = await billingService.startCheckout(period);
      window.location.assign(checkout.checkoutUrl);
    } catch (caught) {
      if (caught instanceof Error && caught.message === "AUTH_REQUIRED") {
        navigate(buildAuthEntryPath("/login", `/upgrade?interval=${period}`));
        return;
      }
      setCheckoutError(true);
    } finally {
      setCheckoutPeriod(null);
    }
  };

  return <PublicFrame><section className="upgrade-page" data-i18n-explicit="true"><p className="eyebrow">{m("premium.eyebrow")}</p><h1>{m("premium.title")}</h1><p>{m("premium.description")}</p>{confirmingPayment ? <BillingConfirmationCard /> : null}<Card><Sparkles size={28} /><h2>Premium</h2><ul>{premiumCapabilityKeys.map((key) => <li key={key}><Check size={17} />{m(key)}</li>)}</ul><div className="upgrade-purchase-options" role="group" aria-label={m("premium.purchase.label")}>{(["monthly", "annual"] as const).map((period) => <article key={period} className={selectedInterval === period ? "is-selected" : undefined}><span>{m(period === "monthly" ? "premium.monthly.label" : "premium.annual.label")}</span><strong className="upgrade-price">{m(period === "monthly" ? "premium.monthly.price" : "premium.annual.price")}</strong><Button type="button" variant={period === "monthly" ? "secondary" : "primary"} loading={checkoutPeriod === period} disabled={checkoutPeriod !== null} onClick={() => void startCheckout(period)}>{checkoutPeriod === period ? m("premium.checkout.loading") : m(period === "monthly" ? "premium.monthly.cta" : "premium.annual.cta")} {checkoutPeriod !== period ? <ArrowRight size={16} aria-hidden="true" /> : null}</Button></article>)}</div>{checkoutError ? <p className="form-error" role="alert">{m("premium.checkout.error")}</p> : null}<Link className="upgrade-free-link" to="/trial">{m("public.cta.startTrial")}</Link><small>{m("premium.checkout.note")}</small></Card></section></PublicFrame>;
}

export function PublicFrame({ children }: { children: React.ReactNode }) { const { m } = useI18n(); return <main className="public-frame"><header data-i18n-explicit="true"><Link to="/" aria-label={m("public.brand.home")}><BrandMark /></Link><nav><LanguageSwitcher compact /><Link to="/trial">{m("public.nav.trialShort")}</Link><Link to="/legal">{m("public.nav.legal")}</Link><Link to="/privacy">{m("public.nav.privacy")}</Link><Link to="/terms">{m("public.nav.terms")}</Link><Link to="/login">{m("public.nav.login")}</Link></nav></header>{children}<footer className="public-legal-footer" data-i18n-explicit="true"><span>© 2026 My Best Version</span><Link to="/terms">{m("public.nav.terms")}</Link><Link to="/data-policy">{m("public.nav.dataPolicy")}</Link><Link to="/privacy">{m("public.nav.privacy")}</Link><Link to="/cookies">{m("public.nav.cookies")}</Link><CookiePreferencesButton /><Link to="/pqr">{m("public.nav.pqr")}</Link><a href="https://www.sic.gov.co/" target="_blank" rel="noreferrer">{m("public.nav.industryAuthority")}</a></footer></main>; }
