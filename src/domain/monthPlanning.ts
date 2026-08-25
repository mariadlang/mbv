import type { CascadePlan } from "@/src/domain/planner";

export interface YearMonthSlot {
  monthIndex: number;
  periodKey: string;
  plan?: CascadePlan;
  isCurrent: boolean;
}

export function monthPeriodKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function buildYearMonthSlots(year: number, plans: CascadePlan[], today = new Date()): YearMonthSlot[] {
  const plansByPeriod = new Map(
    plans
      .filter((plan) => plan.horizon === "monthly")
      .map((plan) => [plan.periodKey, plan]),
  );

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const periodKey = monthPeriodKey(year, monthIndex);
    return {
      monthIndex,
      periodKey,
      plan: plansByPeriod.get(periodKey),
      isCurrent: year === today.getFullYear() && monthIndex === today.getMonth(),
    };
  });
}

export function parseAreaGoals(value?: string): Record<string, string> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

export function serializeAreaGoals(goals: Record<string, string>) {
  const populated = Object.fromEntries(
    Object.entries(goals)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => Boolean(value)),
  );
  return Object.keys(populated).length ? JSON.stringify(populated) : undefined;
}
