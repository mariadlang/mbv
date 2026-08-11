"use client";

import { lazy, Suspense, useState, useSyncExternalStore, type FormEvent } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { BookOpen, HeartPulse, Landmark, Plus, Smile } from "lucide-react";
import { usePlanner } from "@/src/hooks/usePlanner";
import { AppShell } from "@/src/components/layout/AppShell";
import { Button } from "@/src/components/ui/Primitives";
import { Modal } from "@/src/components/ui/Modal";
import { Onboarding } from "@/src/features/onboarding/Onboarding";

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
const MoodPage = lazy(() => import("@/src/features/mood/MoodPage").then((module) => ({ default: module.MoodPage })));
const HelpPage = lazy(() => import("@/src/features/help/HelpPage").then((module) => ({ default: module.HelpPage })));
const FinancePage = lazy(() => import("@/src/features/finance/FinancePage").then((module) => ({ default: module.FinancePage })));
const LifeHubPage = lazy(() => import("@/src/features/lifehub/LifeHubPage").then((module) => ({ default: module.LifeHubPage })));

export default function PlannerApp() {
  const planner = usePlanner();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTask, setQuickTask] = useState("");

  if (!mounted || planner.loading) {
    return (
      <main className="brand-loading" aria-label="Cargando My Best Version Planner">
        <span className="wordmark">My Best Version</span>
        <span className="brand-loading__ring" />
        <p>Preparando un espacio para lo que importa…</p>
      </main>
    );
  }

  if (planner.error && !planner.snapshot.profile) {
    return (
      <main className="error-page">
        <p className="wordmark">My Best Version</p>
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
    <BrowserRouter>
      <AppShell
        userName={planner.snapshot.profile.name}
        saving={planner.saving}
        theme={planner.snapshot.profile.theme ?? "light"}
        onQuickAdd={() => setQuickAddOpen(true)}
      >
        {planner.error && <div className="inline-message inline-message--error" role="alert">{planner.error}</div>}
        <Suspense fallback={<div className="route-loading" role="status">Abriendo tu espacio…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
            <Route path="/app/dashboard" element={<DashboardPage planner={planner} />} />
            <Route path="/app/vision" element={<VisionPage planner={planner} />} />
            <Route path="/app/planning" element={<PlanningPage planner={planner} />} />
            <Route path="/app/today" element={<TodayPage planner={planner} />} />
            <Route path="/app/tasks" element={<TasksPage planner={planner} />} />
            <Route path="/app/habits" element={<HabitsPage planner={planner} />} />
            <Route path="/app/mood" element={<MoodPage planner={planner} />} />
            <Route path="/app/finance" element={<FinancePage planner={planner} />} />
            <Route path="/app/life-hub" element={<LifeHubPage planner={planner} />} />
            <Route path="/app/goals" element={<GoalsPage planner={planner} />} />
            <Route path="/app/progress" element={<ProgressPage planner={planner} />} />
            <Route path="/app/journal" element={<JournalPage planner={planner} />} />
            <Route path="/app/settings" element={<SettingsPage planner={planner} />} />
            <Route path="/app/help" element={<HelpPage />} />
            <Route path="/app/more" element={<MorePage />} />
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Modal open={quickAddOpen} title="Capturar una tarea" description="Guárdala ahora. Puedes decidir la fecha y la meta más adelante." onClose={() => setQuickAddOpen(false)}>
        <form className="quick-task-form" onSubmit={addQuickTask}>
          <label className="form-field"><span>Tarea</span><input value={quickTask} onChange={(event) => setQuickTask(event.target.value)} placeholder="Ej. Pedir cita de control" /></label>
          <div className="modal__actions"><Button type="button" variant="ghost" onClick={() => setQuickAddOpen(false)}>Ahora no</Button><Button type="submit"><Plus size={17} /> Guardar en Inbox</Button></div>
          <div className="quick-add-options" aria-label="Otros registros rápidos">
            <span>También puedes registrar</span>
            <Link to="/app/habits" onClick={() => setQuickAddOpen(false)}><HeartPulse size={16} /> Hábito</Link>
            <Link to="/app/mood" onClick={() => setQuickAddOpen(false)}><Smile size={16} /> Ánimo</Link>
            <Link to="/app/journal" onClick={() => setQuickAddOpen(false)}><BookOpen size={16} /> Nota</Link>
            <Link to="/app/finance" onClick={() => setQuickAddOpen(false)}><Landmark size={16} /> Movimiento</Link>
          </div>
        </form>
      </Modal>
    </BrowserRouter>
  );
}
