"use client";

import { useCallback, useEffect, useState } from "react";
import { createEmptySnapshot } from "@/src/domain/planner";
import type { MoodName, PlannerSnapshot } from "@/src/domain/planner";
import type { GoalFormInput, HabitFormInput, OnboardingInput } from "@/src/lib/schemas";

type PlannerService = (typeof import("@/src/services/plannerService"))["plannerService"];

async function getService(): Promise<PlannerService> {
  const loadedService = await import("@/src/services/plannerService");
  return loadedService.plannerService;
}

export function usePlanner() {
  const [snapshot, setSnapshot] = useState<PlannerSnapshot>(createEmptySnapshot());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const service = await getService();
      setSnapshot(await service.load());
      setError(null);
    } catch {
      setError("No pudimos abrir tus datos locales. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getService()
      .then((service) => service.load())
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        setError(null);
      })
      .catch(() => {
        if (active) setError("No pudimos abrir tus datos locales. Inténtalo de nuevo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const commit = useCallback(
    async (operation: (service: PlannerService) => Promise<PlannerSnapshot>) => {
      setSaving(true);
      try {
        const service = await getService();
        const next = await operation(service);
        setSnapshot(next);
        setError(null);
        return next;
      } catch {
        setError("No pudimos guardar este cambio. Inténtalo de nuevo.");
        throw new Error("Planner operation failed");
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const downloadBackup = useCallback(async () => {
    const service = await getService();
    const json = await service.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `my-best-version-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const importBackup = useCallback(
    async (file: File) => {
      const json = await file.text();
      return commit((service) => service.importBackup(json));
    },
    [commit],
  );

  return {
    snapshot,
    loading,
    saving,
    error,
    retry: load,
    completeOnboarding: (
      input: OnboardingInput & { selectedAreaNames: string[] },
    ) => commit((service) => service.completeOnboarding(input)),
    loadDemo: () => commit((service) => service.loadDemo()),
    createHabit: (input: HabitFormInput) => commit((service) => service.createHabit(input)),
    toggleHabit: (habitId: string, date: string) =>
      commit((service) => service.toggleHabit(habitId, date)),
    createTask: (title: string, date?: string) =>
      commit((service) => service.createTask(title, date)),
    toggleTask: (taskId: string) => commit((service) => service.toggleTask(taskId)),
    rescheduleTask: (taskId: string, date: string) =>
      commit((service) => service.rescheduleTask(taskId, date)),
    saveMood: (mood: MoodName, energy: 1 | 2 | 3 | 4 | 5) =>
      commit((service) => service.saveMood(mood, energy)),
    createGoal: (input: GoalFormInput) => commit((service) => service.createGoal(input)),
    toggleMilestone: (milestoneId: string) =>
      commit((service) => service.toggleMilestone(milestoneId)),
    saveJournal: (text: string) => commit((service) => service.saveJournal(text)),
    updateDailyIntention: (value: string) =>
      commit((service) => service.updateDailyIntention(value)),
    clearAll: () => commit((service) => service.clear()),
    downloadBackup,
    importBackup,
  };
}

export type PlannerController = ReturnType<typeof usePlanner>;
