"use client";

import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import NextLink from "next/link";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, HeartPulse, Landmark, Plus, Smile } from "lucide-react";
import { usePlanner } from "@/src/hooks/usePlanner";
import { AppShell } from "@/src/components/layout/AppShell";
import { Button } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { Onboarding } from "@/src/features/onboarding/Onboarding";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { AccountProvider, useAccount } from "@/src/hooks/useAccount";
import { accessLabel } from "@/src/domain/access";
import { ForgotPasswordPage, LandingPage, LoginPage, SignupPage, TrialPage, UpgradePage, VerifyEmailPage } from "@/src/features/account/AccountPages";
import { AiPrivacyPage, CookiesPage, DataDeletionPage, DataPolicyPage, LegalCenterPage, LegalNoticesPage, LegalPrivacyPage, PaymentsPage, PqrPage, PrivacyCenterPage, PrivacyPage, ProviderInfoPage, RetractPage, SecurityPage, TermsPage } from "@/src/features/legal/LegalPages";
import { CookieConsentProvider } from "@/src/features/legal/CookieConsent";
import { LEGAL_VERSION } from "@/src/lib/legalConfig";
import { useLegalPrivacy } from "@/src/hooks/useLegalPrivacy";
import { PlatformPage } from "@/src/features/platform/PlatformPage";
import { I18nProvider } from "@/src/i18n/I18nProvider";
import { GuidedTutorial } from "@/src/features/tutorial/GuidedTutorial";
import { useUiStore } from "@/src/stores/useUiStore";
import { useI18n } from "@/src/i18n/I18nProvider";

const DashboardPage = lazy(() => import("@/src/features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const GoalsPage = lazy(() => import("@/src/features/goals/GoalsPage").then((module) => ({ default: module.GoalsPage })));
const HabitsPage = lazy(() => import("@/src/features/habits/HabitsPage").then((module) => ({ default: module.HabitsPage })));
const JournalPage = lazy(() => import("@/src/features/journal/JournalPage").then((module) => ({ default: module.JournalPage })));
const MorePage = lazy(() => import("@/src/features/more/MorePage").then((module) => ({ default: module.MorePage })));
const PlanningPage = lazy(() => import("@/src/features/planning/PlanningPage").then((module) => ({ default: module.PlanningPage })));
const ProgressPage = lazy(() => import("@/src/features/progress/ProgressPage").then((module) => ({ default: module.ProgressPage })));
const SettingsPage = lazy(() => import("@/src/features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const TodayPage = lazy(() => import("@/src/features/today/TodayPage").then((module) => ({ default: module.TodayPage })));
const VisionPage = lazy(() => import("@/src/features/vision/VisionPage").then((module) => ({ default: module.VisionPage })));
const TasksPage = lazy(() => import("@/src/features/tasks/TasksPage").then((module) => ({ default: module.TasksPage })));
const HelpPage = lazy(() => import("@/src/features/help/HelpPage").then((module) => ({ default: module.HelpPage })));
const FinancePage = lazy(() => import("@/src/features/finance/FinancePage").then((module) => ({ default: module.FinancePage })));
const LifeHubPage = lazy(() => import("@/src/features/lifehub/LifeHubPage").then((module) => ({ default: module.LifeHubPage })));
const FitnessPage = lazy(() => import("@/src/features/fitness/FitnessPage").then((module) => ({ default: module.FitnessPage })));
const LearnPage = lazy(() => import("@/src/features/learn/LearnPage").then((module) => ({ default: module.LearnPage })));
const SupportPage = lazy(() => import("@/src/features/support/SupportPage").then((module) => ({ default: module.SupportPage })));

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // The BrowserRouter and IndexedDB planner are client-only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted;
}

function useBrowserRouteLocation() {
  const routerLocation = useLocation();
  if (typeof window === "undefined") return routerLocation;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function ProtectedPlannerApp() {
  const account = useAccount();
  const navigate = useNavigate();
  const routeLocation = useBrowserRouteLocation();
  const planner = usePlanner();
  const mounted = useMounted();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTask, setQuickTask] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<"overwhelmed" | "start" | "energy" | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const tutorialReplayNonce = useUiStore((state) => state.tutorialReplayNonce);
  const replayTutorial = useUiStore((state) => state.replayTutorial);
  const { t } = useI18n();

  if (account.loading) {
    return <main className="brand-loading" aria-label="Comprobando tu acceso"><BrandMark /><span className="brand-loading__ring" /><p>Preparando tu espacio…</p></main>;
  }
  if (!account.configured || !account.user) return <Navigate to="/login" replace />;
  if (!account.user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!account.access) {
    return <main className="error-page"><BrandMark /><h1>No pudimos comprobar tu acceso.</h1><p>{account.error ?? "Vuelve a intentarlo en un momento."}</p><Button onClick={account.refreshAccess}>Intentar de nuevo</Button></main>;
  }
  const needsLegalAcceptance = account.user.legalVersion !== LEGAL_VERSION || !account.user.termsAcceptedAt || !account.user.dataProcessingAcceptedAt || !account.user.adultDeclaredAt;
  if (needsLegalAcceptance) return <LegalAcceptanceGate />;
  if (account.access.accessStatus === "expired" || account.access.accessStatus === "blocked") {
    return <main className="access-ended"><BrandMark /><div><p className="eyebrow">TU ESPACIO ESTÁ A SALVO</p><h1>{account.access.accessStatus === "blocked" ? "Este acceso necesita revisión." : "Tu prueba de 15 días terminó."}</h1><p>{account.access.accessStatus === "blocked" ? "Contacta al equipo de soporte para revisar el estado de la cuenta." : "Tus datos locales permanecen en este dispositivo. Puedes continuar con Premium cuando estés lista."}</p><div><Link className="button button--primary" to="/upgrade">Ver Premium</Link><Button variant="ghost" onClick={async () => { await account.signOut(); navigate("/"); }}>Cerrar sesión</Button></div></div></main>;
  }

  if (!mounted || planner.loading) {
    return (
      <main className="brand-loading" aria-label="Cargando My Best Version Planner">
        <BrandMark />
        <span className="brand-loading__ring" />
        <p>Preparando un espacio para lo que importa…</p>
      </main>
    );
  }

  if (planner.error && !planner.snapshot.profile) {
    return (
      <main className="error-page">
        <BrandMark />
        <h1>No pudimos abrir tu planner.</h1>
        <p>{planner.error}</p>
        <Button onClick={planner.retry}>Intentar de nuevo</Button>
      </main>
    );
  }

  if (!planner.snapshot.profile?.onboardingCompleted) {
    return <Onboarding planner={planner} />;
  }

  const addQuickTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!quickTask.trim()) return;
    await planner.createTask(quickTask);
    setQuickTask("");
    setQuickAddOpen(false);
  };

  return (
    <>
      <AppShell
        userName={planner.snapshot.profile.name}
        userAvatar={planner.snapshot.profile.avatarDataUrl}
        saving={planner.saving}
        theme={planner.snapshot.profile.theme ?? "light"}
        accessText={accessLabel(account.access)}
        isSuperadmin={account.access.role === "superadmin"}
        onQuickAdd={() => setQuickAddOpen(true)}
        onNeedHelp={() => { setHelpMode(null); setHelpOpen(true); }}
        onSignOut={() => setLogoutOpen(true)}
      >
        {planner.error && <div className="inline-message inline-message--error" role="alert">{planner.error}</div>}
        <Suspense fallback={<div className="route-loading" role="status">Abriendo tu espacio…</div>}>
          <Routes location={routeLocation}>
            <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/app/dashboard" element={<DashboardPage planner={planner} />} />
            <Route path="/app/vision" element={<VisionPage planner={planner} />} />
            <Route path="/app/planning" element={<PlanningPage planner={planner} access={account.access} />} />
            <Route path="/app/planning/long-term" element={<Navigate to="/app/planning" replace />} />
            <Route path="/app/planning/monthly" element={<Navigate to="/app/planning" replace />} />
            <Route path="/app/planning/weekly" element={<PlanningPage planner={planner} access={account.access} initialView="week" />} />
            <Route path="/app/today" element={<TodayPage planner={planner} />} />
            <Route path="/app/tasks" element={<TasksPage planner={planner} />} />
            <Route path="/app/habits" element={<HabitsPage planner={planner} />} />
            <Route path="/app/challenges" element={<Navigate to="/app/life-hub?tab=challenges" replace />} />
            <Route path="/app/mood" element={<Navigate to="/app/habits" replace />} />
            <Route path="/app/finance" element={<FinancePage planner={planner} />} />
            <Route path="/app/life-hub" element={<LifeHubPage planner={planner} />} />
            <Route path="/app/health" element={<FitnessPage planner={planner} />} />
            <Route path="/app/life-hub/fitness" element={<Navigate to="/app/health" replace />} />
            <Route path="/app/goals" element={<GoalsPage planner={planner} />} />
            <Route path="/app/progress" element={<ProgressPage planner={planner} />} />
            <Route path="/app/journal" element={<JournalPage planner={planner} />} />
            <Route path="/app/settings" element={<SettingsPage planner={planner} onReplayTutorial={replayTutorial} onRequestLogout={() => setLogoutOpen(true)} />} />
            <Route path="/app/profile" element={<Navigate to="/app/settings" replace />} />
            <Route path="/app/legal" element={<LegalPrivacyPage />} />
            <Route path="/app/privacy-center" element={<PrivacyCenterPage planner={planner} />} />
            <Route path="/app/pqr" element={<Navigate to="/app/privacy-center" replace />} />
            <Route path="/app/help" element={<HelpPage planner={planner} />} />
            <Route path="/app/support" element={<SupportPage />} />
            <Route path="/app/learn" element={<LearnPage planner={planner} />} />
            <Route path="/app/feed" element={<Navigate to="/app/health" replace />} />
            <Route path="/app/more" element={<MorePage />} />
            <Route path="/admin" element={<Navigate to="/platform" replace />} />
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <GuidedTutorial completed={Boolean(account.preferences?.tutorialCompleted)} loading={account.preferencesLoading} replayNonce={tutorialReplayNonce} onComplete={() => account.updatePreferences({ tutorialCompleted: true })} />
      <Modal open={quickAddOpen} title="Capturar una tarea" description="Guárdala ahora. Puedes decidir la fecha y la meta más adelante." onClose={() => setQuickAddOpen(false)}>
        <form className="quick-task-form" onSubmit={addQuickTask}>
          <label className="form-field"><span>Tarea</span><input value={quickTask} onChange={(event) => setQuickTask(event.target.value)} placeholder="Ej. Pedir cita de control" /></label>
          <div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setQuickAddOpen(false)}>Ahora no</Button><Button type="submit"><Plus size={17} /> Guardar en la bandeja</Button></div>
          <div className="quick-add-options" aria-label="Otros registros rápidos">
            <span>También puedes registrar</span>
            <Link to="/app/habits" onClick={() => setQuickAddOpen(false)}><HeartPulse size={16} /> Hábito</Link>
            <Link to="/app/habits?checkin=1" onClick={() => setQuickAddOpen(false)}><Smile size={16} /> Ánimo</Link>
            <Link to="/app/journal" onClick={() => setQuickAddOpen(false)}><BookOpen size={16} /> Nota</Link>
            <Link to="/app/finance" onClick={() => setQuickAddOpen(false)}><Landmark size={16} /> Movimiento</Link>
          </div>
        </form>
      </Modal>
      <Modal open={helpOpen} title="¿Qué necesitas ahora?" description="Elige lo que se parece más a este momento. Te mostraremos un paso breve." onClose={() => setHelpOpen(false)}>
        {!helpMode ? <div className="unblock-options"><Button variant="secondary" onClick={() => setHelpMode("overwhelmed")}>Estoy abrumada</Button><Button variant="secondary" onClick={() => setHelpMode("start")}>No sé empezar</Button><Button variant="secondary" onClick={() => setHelpMode("energy")}>Tengo poca energía</Button><Link className="button button--ghost" to="/app/help" onClick={() => setHelpOpen(false)}>Ver todas las herramientas</Link></div> : <div className="minimum-mode"><p className="eyebrow">{helpMode === "energy" ? "Modo mínimo" : "Desbloquearme"}</p><h2>{helpMode === "overwhelmed" ? "Reduce el campo de visión" : helpMode === "start" ? "Haz visible el primer movimiento" : "Hoy también cuenta en pequeño"}</h2><ol><li>{helpMode === "overwhelmed" ? "Elige solo una de tus tres prioridades." : helpMode === "start" ? "Abre la tarea y escribe el primer verbo." : "Elige una tarea de menos de 10 minutos."}</li><li>Pon un temporizador de 10 minutos.</li><li>Al terminar, decide con calma si continúas o paras.</li></ol><Link className="button button--primary" to="/app/today" onClick={() => setHelpOpen(false)}>Ver mi próximo paso</Link></div>}
      </Modal>
      <Modal open={logoutOpen} title={t("¿Quieres cerrar tu sesión?")} description={t("Tu información seguirá guardada para cuando vuelvas.")} onClose={() => { if (!loggingOut) setLogoutOpen(false); }}>
        <div className="logout-confirm"><div className="modal__actions"><Button variant="ghost" disabled={loggingOut} onClick={() => setLogoutOpen(false)}>{t("Cancelar")}</Button><Button variant="danger" disabled={loggingOut} onClick={async () => { setLoggingOut(true); await account.signOut(); navigate("/login", { replace: true }); navigate("/login"); setLoggingOut(false); }}>{loggingOut ? t("Un momento…") : t("Cerrar sesión")}</Button></div></div>
      </Modal>
    </>
  );
}

function LegalAcceptanceGate() {
  const account = useAccount();
  const legal = useLegalPrivacy(account.user?.id ?? null);
  const [terms, setTerms] = useState(false);
  const [data, setData] = useState(false);
  const [adult, setAdult] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const accept = async () => {
    if (!terms || !data || !adult) { setError("Confirma por separado los Términos, el tratamiento de datos y que tienes 18 años o más."); return; }
    const now = new Date().toISOString(); setSaving(true); setError("");
    try {
      await account.acceptLegal({ legalVersion: LEGAL_VERSION, termsAcceptedAt: now, dataProcessingAcceptedAt: now, adultDeclaredAt: now, marketingConsent: marketing, marketingAcceptedAt: marketing ? now : null });
      await Promise.all([
        legal.recordConsent({ consentType: "terms", method: "oauth_gate", status: "granted" }),
        legal.recordConsent({ consentType: "data_processing", method: "oauth_gate", status: "granted" }),
        legal.recordConsent({ consentType: "adult_declaration", method: "oauth_gate", status: "granted" }),
        ...(marketing ? [legal.recordConsent({ consentType: "marketing" as const, method: "oauth_gate" as const, status: "granted" as const })] : []),
      ]);
    } catch { setError("No pudimos guardar tu elección. Inténtalo de nuevo."); }
    finally { setSaving(false); }
  };
  return <main className="legal-gate"><BrandMark /><section><p className="eyebrow">UNA ELECCIÓN CLARA</p><h1>Antes de continuar</h1><p>Revisa y acepta cada documento obligatorio. Las novedades son siempre opcionales.</p><label className="legal-consent"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /><span>Acepto los <Link to="/terms" target="_blank">Términos y Condiciones</Link>.</span></label><label className="legal-consent"><input type="checkbox" checked={data} onChange={(event) => setData(event.target.checked)} /><span>Autorizo el tratamiento de datos según la <Link to="/data-policy" target="_blank">Política de Tratamiento</Link>.</span></label><label className="legal-consent"><input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} /><span>Declaro que tengo 18 años o más.</span></label><label className="legal-consent"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Quiero recibir novedades. Esta opción es voluntaria y revocable.</span></label>{error && <p className="form-error" role="alert">{error}</p>}<Button loading={saving} onClick={accept}>Guardar y continuar</Button><Button variant="ghost" onClick={() => void account.signOut()}>Cerrar sesión</Button></section></main>;
}

export default function PlannerApp() {
  const mounted = useMounted();
  if (!mounted) return <main className="brand-loading" aria-label="My Best Version">
    <BrandMark />
    <h1>My Best Version</h1>
    <p>Aplicación de planificación personal para convertir tu visión de vida en metas, planes, hábitos y acciones sostenibles.</p>
    <nav className="brand-loading__legal" aria-label="Información pública"><NextLink href="/privacy">Política de Privacidad</NextLink><NextLink href="/terms">Términos del Servicio</NextLink><NextLink href="/legal">Centro Legal</NextLink></nav>
    <span className="brand-loading__ring" aria-hidden="true" />
  </main>;
  return <I18nProvider><BrowserRouter><CookieConsentProvider><AccountProvider><RootRoutes /></AccountProvider></CookieConsentProvider></BrowserRouter></I18nProvider>;
}

function RootRoutes() {
  const routeLocation = useBrowserRouteLocation();
  return <Routes location={routeLocation}>
    <Route path="/" element={<LandingPage />} />
    <Route path="/trial" element={<TrialPage />} />
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/terms" element={<TermsPage />} />
    <Route path="/data-policy" element={<DataPolicyPage />} />
    <Route path="/legal" element={<LegalCenterPage />} />
    <Route path="/cookies" element={<CookiesPage />} />
    <Route path="/data-deletion" element={<DataDeletionPage />} />
    <Route path="/legal-notices" element={<LegalNoticesPage />} />
    <Route path="/payments" element={<PaymentsPage />} />
    <Route path="/retract" element={<RetractPage />} />
    <Route path="/ai-privacy" element={<AiPrivacyPage />} />
    <Route path="/provider-info" element={<ProviderInfoPage />} />
    <Route path="/security" element={<SecurityPage />} />
    <Route path="/pqr" element={<PqrPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/upgrade" element={<UpgradePage />} />
    <Route path="/platform" element={<PlatformPage />} />
    <Route path="/admin" element={<Navigate to="/platform" replace />} />
    <Route path="*" element={<ProtectedPlannerApp />} />
  </Routes>;
}
