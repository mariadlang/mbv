"use client";

import { Link, useLocation } from "react-router-dom";
import { useI18n } from "@/src/i18n/I18nProvider";

const guideItems = [
  ["/app/guide", "preparation.guide"],
  ["/app/planning?view=annual", "homeOverview.yearNav"],
  ["/app/planning?view=month", "homeOverview.monthNav"],
  ["/app/planning/weekly", "homeOverview.weekNav"],
] as const;

export function isGuideSection(pathname: string) {
  return ["/app/guide", "/app/vision", "/app/goals", "/app/planning"].includes(pathname)
    || pathname.startsWith("/app/planning/");
}

export function GuideNavigation() {
  const { pathname, search } = useLocation();
  const { m } = useI18n();
  if (!isGuideSection(pathname)) return null;
  const view = new URLSearchParams(search).get("view");
  const activeHref = pathname === "/app/guide" ? "/app/guide"
    : pathname === "/app/planning/weekly" || (pathname === "/app/planning" && view === "week") ? "/app/planning/weekly"
    : pathname === "/app/planning" && view === "month" ? "/app/planning?view=month"
    : pathname === "/app/planning" && (!view || view === "annual" || view === "year") ? "/app/planning?view=annual"
    : undefined;

  return <nav className="guide-planning-navigation" aria-label={m("navigation.guideSections")} data-i18n-explicit="true">
    {guideItems.map(([href, label]) => <Link key={href} to={href} aria-current={href === activeHref ? "page" : undefined}>{m(label)}</Link>)}
  </nav>;
}
