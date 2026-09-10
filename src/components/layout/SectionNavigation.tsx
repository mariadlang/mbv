"use client";

import { Link, useLocation } from "react-router-dom";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { NavigationSpaceProgressMessageKey } from "@/src/i18n/messages/features/navigation-space-progress";

type Section = "plan" | "progress" | "space";

const sections = {
  plan: {
    labelKey: "section.plan.label",
    items: [
      ["/app/vision", "section.item.vision"],
      ["/app/goals", "section.item.goals"],
      ["/app/planning", "section.item.yearMonths"],
      ["/app/planning/weekly", "section.item.week"],
      ["/app/life-hub?tab=events", "section.item.calendar"],
    ],
  },
  progress: {
    labelKey: "section.progress.label",
    items: [
      ["/app/progress", "section.item.summary"],
      ["/app/goals", "section.item.goals"],
      ["/app/progress#statistics", "section.item.statistics"],
    ],
  },
  space: {
    labelKey: "section.space.label",
    items: [
      ["/app/life-hub", "section.item.summary"],
      ["/app/habits", "section.item.habits"],
      ["/app/tasks", "section.item.tasks"],
      ["/app/journal", "section.item.journal"],
      ["/app/health", "section.item.wellbeing"],
      ["/app/finance", "section.item.finances"],
      ["/app/life-hub?tab=lists", "section.item.inbox"],
      ["/app/more", "section.item.moreTools"],
    ],
  },
} satisfies Record<Section, { labelKey: NavigationSpaceProgressMessageKey; items: Array<[string, NavigationSpaceProgressMessageKey]> }>;

type SectionLocation = Pick<Location, "pathname" | "search" | "hash">;

const lifeHubTabs = new Set(["lists", "routines", "challenges", "vision", "events", "fitness", "calendar"]);
const lifeHubToolTabs = new Set(["routines", "challenges", "vision", "events", "fitness", "calendar"]);

export function isSectionItemActive(href: string, location: SectionLocation): boolean {
  const target = new URL(href, "https://mybestversion.life");
  const currentSearch = new URLSearchParams(location.search);

  if (href === "/app/more" && location.pathname === "/app/life-hub") {
    return lifeHubToolTabs.has(currentSearch.get("tab") ?? "");
  }
  if (location.pathname !== target.pathname) return false;

  if (target.pathname === "/app/planning" && !target.search && !target.hash) {
    return currentSearch.get("view") !== "week";
  }
  if (target.pathname === "/app/life-hub" && !target.search && !target.hash) {
    const currentTab = currentSearch.get("tab");
    return !currentTab || !lifeHubTabs.has(currentTab);
  }
  if (target.pathname === "/app/progress" && !target.search && !target.hash) {
    return location.hash !== "#statistics";
  }

  for (const [key, value] of target.searchParams) {
    if (currentSearch.get(key) !== value) return false;
  }
  if (target.hash && location.hash !== target.hash) return false;
  return true;
}

export function SectionNavigation({ section }: { section: Section }) {
  const location = useLocation();
  const { m } = useI18n();

  return <nav className="section-navigation" aria-label={m(sections[section].labelKey)} data-i18n-explicit="true">
    {sections[section].items.map(([href, labelKey]) => {
      const active = isSectionItemActive(href, location);
      return <Link key={href} to={href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>{m(labelKey)}</Link>;
    })}
  </nav>;
}
