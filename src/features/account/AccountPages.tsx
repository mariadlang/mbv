"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Heart, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { Button, Card } from "@/src/components/ui/Primitives";
import { billingService } from "@/src/services/billingService";
import { useAccount } from "@/src/hooks/useAccount";
import { analyticsService } from "@/src/services/analyticsService";
import { LanguageSwitcher } from "@/src/components/ui/LanguageSwitcher";

const credentialsSchema = z.object({
  email: z.string().trim().email("Escribe un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});
const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(2, "Cuéntanos cómo quieres que te llamemos.") });

export function LandingPage() {
  const { user } = useAccount();
  return <main className="marketing-page">
    <header className="marketing-header"><BrandMark /><nav aria-label="Navegación pública"><LanguageSwitcher compact /><a href="#como-funciona">Cómo funciona</a><Link to="/trial">Prueba de 15 días</Link><Link to="/login">Iniciar sesión</Link><Link className="button button--primary" to={user ? "/app/dashboard" : "/signup"}>{user ? "Ir a mi espacio" : "Crear mi espacio"}</Link></nav></header>
    <section className="hero-section"><div className="hero-copy"><p className="eyebrow">PLANEACIÓN PERSONAL · HÁBITOS · BIENESTAR</p><h1>Una vida más tuya,<br /><span>un paso posible a la vez.</span></h1><p>Convierte tu visión en decisiones claras para tus próximos años, meses, semanas y días, sin llenar tu agenda de culpa.</p><div className="hero-actions"><Link className="button button--primary" to="/signup">Comenzar prueba gratis <ArrowRight size={17} /></Link><Link className="button button--secondary" to="/trial">Ver qué incluye</Link></div><small><Check size={15} /> 15 días para explorar · sin pago automático</small></div><div className="hero-visual" aria-label="Vista previa del planner"><img src="/brand-icon.svg" alt="Logo de My Best Version" /><Card><span>Tu dirección</span><strong>De la visión a una semana posible</strong><div className="hero-progress"><i /><i /><i /></div></Card><Card><span>Hoy</span><strong>3 prioridades con espacio para respirar</strong></Card></div></section>
    <section id="como-funciona" className="marketing-section"><p className="eyebrow">CÓMO FUNCIONA</p><h2>Tu visión se convierte en un camino que sí puedes recorrer.</h2><div className="marketing-grid">{[["01","Mira hacia adelante","Define tu Dream Life y tus horizontes de 3 años."],["02","Baja a lo concreto","Conecta año, trimestre, mes, semana y día."],["03","Observa con calma","Reconoce hábitos, energía y progreso sin castigos."]].map(([n,title,text]) => <Card key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></Card>)}</div></section>
    <section className="marketing-cta"><Heart size={24} /><h2>Empieza con lo que hoy tiene sentido.</h2><p>Tu prueba comienza después de verificar tu correo y entrar por primera vez.</p><Link className="button button--primary" to="/signup">Crear mi cuenta</Link></section>
    <footer className="marketing-footer"><BrandMark compact /><span>© 2026 My Best Version</span><Link to="/privacy">Privacidad</Link><Link to="/terms">Términos</Link><Link to="/login">Acceso</Link></footer>
  </main>;
}

export function TrialPage() {
  return <PublicFrame><section className="trial-page"><p className="eyebrow">PRUEBA DE 15 DÍAS</p><h1>Explora el sistema completo, con dos horizontes reservados para Premium.</h1><p className="lead">No necesitas registrar una tarjeta. La prueba empieza con tu primer acceso después de verificar el correo.</p><div className="trial-comparison"><Card><span>Durante tu prueba</span><h2>Base completa</h2><ul>{["Visión y objetivos","Planificación hasta 3 meses","Plan mensual, semanal y diario","Hábitos, finanzas, fitness y diario","Progreso, rutinas, proyectos y retos"].map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul></Card><Card className="trial-premium"><Sparkles size={22} /><span>Con Premium</span><h2>Horizonte ampliado</h2><ul><li><Check size={16} /> Todo lo incluido en la prueba</li><li><Check size={16} /> Planificación a 5 años</li><li><Check size={16} /> Feed Hub</li></ul></Card></div><Link className="button button--primary" to="/signup">Comenzar mi prueba</Link></section></PublicFrame>;
}

export function PrivacyPage() {
  return <PublicFrame><article className="legal-page">
    <p className="eyebrow">INFORMACIÓN LEGAL</p>
    <h1>Política de Privacidad</h1>
    <p className="legal-page__updated">Última actualización: 26 de agosto de 2026</p>
    <p className="lead">En My Best Version tratamos tu información con respeto y usamos únicamente los datos necesarios para darte acceso a tu planner.</p>

    <section><h2>1. Información que recopilamos</h2><p>Al crear una cuenta podemos recibir tu nombre, correo electrónico y, si eliges iniciar sesión con Google, tu nombre, dirección de correo y foto de perfil. Google no nos entrega tu contraseña.</p></section>
    <section><h2>2. Datos de tu planner</h2><p>Tu visión, metas, hábitos, tareas, journal, finanzas, registros de bienestar, fotos y demás contenido personal se guardan localmente en el navegador de tu dispositivo. No presentamos información de demostración como si fuera tuya y no conectamos cuentas bancarias.</p></section>
    <section><h2>3. Cómo usamos la información</h2><p>Usamos la información de cuenta para autenticarte, proteger el acceso, mantener tus preferencias y habilitar las funciones correspondientes a tu plan. No vendemos tus datos personales ni los utilizamos para publicidad personalizada.</p></section>
    <section><h2>4. Inicio de sesión con Google</h2><p>El acceso con Google solicita únicamente los permisos básicos de identidad necesarios para iniciar sesión: perfil, nombre y correo electrónico. No solicitamos acceso a Google Drive, Contactos, Calendario ni Gmail.</p><p>El uso y la transferencia de información recibida de las APIs de Google cumplen la Política de Datos del Usuario de los Servicios API de Google, incluidos sus requisitos de Uso Limitado.</p></section>
    <section><h2>5. Proveedores</h2><p>Utilizamos Supabase para la autenticación y Vercel para publicar la aplicación. Estos proveedores procesan información técnica necesaria para prestar el servicio de acuerdo con sus propias obligaciones de seguridad y privacidad.</p></section>
    <section><h2>6. Conservación y control</h2><p>Los datos locales permanecen en el dispositivo hasta que los elimines desde la aplicación, borres los datos del navegador o desinstales el navegador. Puedes exportar un respaldo para trasladarlos a otro dispositivo o dominio. Cerrar sesión no elimina la información guardada.</p></section>
    <section><h2>7. Seguridad</h2><p>Aplicamos medidas razonables para proteger el acceso a la cuenta. Ningún sistema es completamente infalible, por lo que te recomendamos mantener protegido tu dispositivo y no compartir tus credenciales.</p></section>
    <section><h2>8. Tus derechos y contacto</h2><p>Puedes solicitar acceso, corrección o eliminación de la información asociada a tu cuenta mediante el correo de asistencia indicado en la pantalla de consentimiento de Google. También puedes gestionar y eliminar los datos locales desde Ajustes y datos dentro de la aplicación.</p></section>
    <section><h2>9. Cambios a esta política</h2><p>Si esta política cambia de forma relevante, actualizaremos la fecha indicada al inicio y comunicaremos el cambio dentro de la aplicación cuando corresponda.</p></section>
  </article></PublicFrame>;
}

export function TermsPage() {
  return <PublicFrame><article className="legal-page">
    <p className="eyebrow">INFORMACIÓN LEGAL</p>
    <h1>Términos del Servicio</h1>
    <p className="legal-page__updated">Última actualización: 26 de agosto de 2026</p>
    <p className="lead">Estos términos explican las condiciones para utilizar My Best Version. Al crear una cuenta o usar la aplicación, aceptas estas condiciones.</p>

    <section><h2>1. Propósito del servicio</h2><p>My Best Version es una herramienta de organización personal para conectar visión, metas, planificación, hábitos, bienestar, finanzas y reflexión. La aplicación ofrece apoyo para organizar información, pero no sustituye asesoría médica, psicológica, nutricional, financiera o legal.</p></section>
    <section><h2>2. Tu cuenta</h2><p>Debes proporcionar información correcta, proteger tus credenciales y notificarnos si sospechas de un acceso no autorizado. Eres responsable del uso realizado desde tu cuenta y dispositivo.</p></section>
    <section><h2>3. Tus datos y respaldos</h2><p>El contenido detallado del planner se guarda localmente en tu navegador. Eres responsable de exportar respaldos cuando quieras conservar o trasladar esa información. Cambiar de dispositivo, navegador o dominio puede requerir importar un respaldo.</p></section>
    <section><h2>4. Prueba y funciones Premium</h2><p>La aplicación puede ofrecer un periodo de prueba y funciones reservadas para planes de pago. Antes de cualquier compra se mostrarán las condiciones, el precio y el proveedor de pago aplicable. No se realiza un cobro automático sin una acción explícita.</p></section>
    <section><h2>5. Uso permitido</h2><p>No debes usar la aplicación para vulnerar cuentas, interferir con el servicio, distribuir software malicioso, infringir derechos de terceros ni realizar actividades ilegales.</p></section>
    <section><h2>6. Bienestar y emergencias</h2><p>Las sugerencias de bienestar son informativas. Si atraviesas una emergencia o situación de riesgo, contacta de inmediato los servicios de emergencia o una línea profesional de apoyo disponible en tu país.</p></section>
    <section><h2>7. Disponibilidad</h2><p>Trabajamos para ofrecer una experiencia estable y segura, pero pueden existir interrupciones por mantenimiento, actualizaciones o causas fuera de nuestro control.</p></section>
    <section><h2>8. Suspensión o cierre</h2><p>Podemos limitar el acceso cuando exista uso abusivo, fraude, riesgo de seguridad o incumplimiento de estos términos. La información local permanecerá bajo el control del dispositivo salvo que la elimines.</p></section>
    <section><h2>9. Cambios</h2><p>Podemos actualizar estos términos para reflejar mejoras del producto o requisitos legales. Cuando el cambio sea relevante, lo comunicaremos dentro de la aplicación.</p></section>
  </article></PublicFrame>;
}

export function LoginPage() { return <AuthForm mode="login" />; }
export function SignupPage() { return <AuthForm mode="signup" />; }

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const account = useAccount();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (account.user && account.access) return <Navigate to="/app/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    const parsed = (mode === "signup" ? signupSchema : credentialsSchema).safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Revisa los datos."); return; }
    if (!account.configured) { setError("El acceso está temporalmente en configuración. Inténtalo de nuevo en unos minutos."); return; }
    setSaving(true);
    try {
      if (mode === "signup") {
        const result = await account.signUp({ name: form.name, email: form.email, password: form.password });
        if (result.emailVerificationRequired) { navigate("/verify-email", { state: { email: form.email } }); return; }
      } else { await account.signIn({ email: form.email, password: form.password }); analyticsService.track("login_succeeded"); }
      navigate("/app/dashboard");
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "No pudimos completar el acceso.";
      setError(text.includes("Invalid login") ? "El correo o la contraseña no coinciden." : "No pudimos completar el acceso. Revisa los datos e inténtalo de nuevo.");
    } finally { setSaving(false); }
  };

  const continueWithGoogle = async () => {
    setError(""); setMessage("");
    if (!account.configured) { setError("El acceso está temporalmente en configuración. Inténtalo de nuevo en unos minutos."); return; }
    setSaving(true);
    try { await account.signInWithGoogle(); }
    catch { setError("No pudimos abrir el acceso con Google. Inténtalo de nuevo."); setSaving(false); }
  };

  const sendMagicLink = async () => {
    setError(""); setMessage("");
    const parsed = z.string().trim().email("Escribe un correo válido.").safeParse(form.email);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Escribe un correo válido."); return; }
    if (!account.configured) { setError("El acceso está temporalmente en configuración. Inténtalo de nuevo en unos minutos."); return; }
    setSaving(true);
    try {
      await account.signInWithMagicLink(parsed.data);
      setMessage("Te enviamos un enlace seguro. Revisa tu correo para continuar.");
    } catch { setError("No pudimos enviar el enlace. Inténtalo de nuevo."); }
    finally { setSaving(false); }
  };

  return <PublicFrame><section className="auth-card"><span className="auth-card__icon">{mode === "signup" ? <Sparkles size={22} /> : <LockKeyhole size={22} />}</span><p className="eyebrow">{mode === "signup" ? "CREA TU ESPACIO" : "QUÉ BUENO VERTE"}</p><h1>{mode === "signup" ? "Empieza una vida más tuya." : "Vuelve a tu planner."}</h1><p>{mode === "signup" ? "Tendrás 15 días para explorar la experiencia base después de verificar tu correo." : "Continúa desde donde lo dejaste."}</p><div className="auth-options"><Button type="button" variant="outline" disabled={saving} onClick={continueWithGoogle}><span className="google-mark" aria-hidden="true">G</span> Continuar con Google</Button></div><div className="auth-divider"><span>o continúa con tu correo</span></div><form onSubmit={submit}>{mode === "signup" && <label><span>Nombre</span><input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}<label><span>Correo</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span>Contraseña</span><input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="inline-message" role="status">{message}</p>}<Button type="submit" disabled={saving} onClick={() => { if (mode === "signup") analyticsService.track("signup_started"); }}>{saving ? "Un momento…" : mode === "signup" ? "Crear cuenta" : "Iniciar sesión"}</Button>{mode === "login" && <Button type="button" variant="secondary" disabled={saving} onClick={sendMagicLink}><Mail size={17} aria-hidden="true" /> Enviarme un enlace de acceso</Button>}</form>{mode === "login" && <Link to="/forgot-password">Olvidé mi contraseña</Link>}<p>{mode === "signup" ? "¿Ya tienes cuenta?" : "¿Todavía no tienes cuenta?"} <Link to={mode === "signup" ? "/login" : "/signup"}>{mode === "signup" ? "Iniciar sesión" : "Crear cuenta"}</Link></p></section></PublicFrame>;
}

export function VerifyEmailPage() { return <PublicFrame><section className="auth-card auth-card--message"><span className="auth-card__icon"><Mail size={22} /></span><h1>Revisa tu correo.</h1><p>Te enviamos un enlace para verificar tu cuenta. Tu prueba empezará cuando confirmes el correo y entres por primera vez.</p><Link className="button button--primary" to="/login">Ir a iniciar sesión</Link></section></PublicFrame>; }

export function ForgotPasswordPage() {
  const account = useAccount(); const [email, setEmail] = useState(""); const [status, setStatus] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); const parsed = z.string().email().safeParse(email); if (!parsed.success) return setStatus("Escribe un correo válido."); if (!account.configured) return setStatus("El acceso está temporalmente en configuración. Inténtalo de nuevo en unos minutos."); try { await account.requestPasswordReset(email); setStatus("Si existe una cuenta con ese correo, recibirá un enlace de recuperación."); } catch { setStatus("No pudimos enviar el enlace. Inténtalo de nuevo."); } };
  return <PublicFrame><section className="auth-card"><h1>Recupera tu acceso.</h1><p>Te enviaremos un enlace seguro para crear una nueva contraseña.</p><form onSubmit={submit}><label><span>Correo</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{status && <p role="status">{status}</p>}<Button type="submit">Enviar enlace</Button></form><Link to="/login">Volver</Link></section></PublicFrame>;
}

export function UpgradePage() {
  const checkoutUrl = billingService.getCheckoutUrl();
  return <PublicFrame><section className="upgrade-page"><p className="eyebrow">MY BEST VERSION PREMIUM</p><h1>Amplía tu horizonte cuando estés lista.</h1><p>Premium desbloquea el plan a cinco años y Feed Hub, además de conservar todo tu sistema personal.</p><Card><Sparkles size={28} /><h2>Premium</h2><ul><li><Check size={17} /> Planificación completa, incluido el horizonte a 5 años</li><li><Check size={17} /> Feed Hub</li><li><Check size={17} /> Todo tu planner actual</li></ul><a className="button button--primary" href={checkoutUrl} target="_blank" rel="noreferrer" onClick={() => analyticsService.track("upgrade_opened")}>Continuar en Mercado Pago <ArrowRight size={16} /></a><small>El pago ocurre en Mercado Pago. Volver aquí no activa Premium automáticamente; la activación debe confirmarse de forma segura.</small></Card></section></PublicFrame>;
}

export function PublicFrame({ children }: { children: React.ReactNode }) { return <main className="public-frame"><header><Link to="/"><BrandMark /></Link><nav><LanguageSwitcher compact /><Link to="/trial">Prueba</Link><Link to="/privacy">Privacidad</Link><Link to="/terms">Términos</Link><Link to="/login">Iniciar sesión</Link></nav></header>{children}</main>; }
