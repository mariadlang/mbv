"use client";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import type { PlannerSnapshot } from "@/src/domain/planner";
import { useI18n } from "@/src/i18n/I18nProvider";
export function PlannerSearch({ snapshot }: { snapshot?: PlannerSnapshot }) {
  const { m } = useI18n();
  const [query, setQuery] = useState("");
  const items = snapshot ? [
    ...snapshot.tasks.filter((item) => item.status !== "cancelled").map((item) => ({ id: item.id, title: item.title, href: item.date ? `/app/planning?view=day&date=${item.date}` : "/app/tasks" })),
    ...snapshot.goals.map((item) => ({ id: item.id, title: item.title, href: "/app/goals" })),
    ...snapshot.habits.map((item) => ({ id: item.id, title: item.name, href: "/app/habits" })),
  ].filter((item) => item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0, 12) : [];
  return <div className="prep-search"><label><Search size={19} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setQuery(""); }} placeholder={m("preparation.search")} aria-label={m("preparation.search")} /></label>{query.trim() && <div className="prep-search-results" aria-live="polite">{items.length ? items.map((item) => <Link key={item.id} to={item.href} data-no-translate="true" onClick={() => setQuery("")}>{item.title}</Link>) : <p>{m("preparation.searchEmpty")}</p>}</div>}</div>;
}
