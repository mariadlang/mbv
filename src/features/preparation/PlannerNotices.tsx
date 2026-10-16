"use client";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, ArrowLeft } from "lucide-react";
import type { PlannerSnapshot } from "@/src/domain/planner";
import { toLocalDateKey } from "@/src/lib/dates";
import { useI18n } from "@/src/i18n/I18nProvider";
import { Modal } from "@/src/components/ui/Modal";

export function PlannerNotices({ snapshot }: { snapshot?: PlannerSnapshot }) {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const date = toLocalDateKey(new Date());
  const tasks = snapshot?.tasks.filter((task) => task.date === date && !["completed", "cancelled"].includes(task.status)) || [];
  return <><button className="prep-notices-button" aria-label={m("preparation.notifications")} onClick={() => setOpen(true)}><Bell size={20} /></button><Modal open={open} onClose={() => setOpen(false)} title={m("preparation.notifications")} explicitI18n inertBackground><p>{m("preparation.localNotices")}</p>{tasks.length ? <ul>{tasks.map((task) => <li key={task.id}><Link data-no-translate="true" to={`/app/planning?view=day&date=${date}`} onClick={() => setOpen(false)}>{task.time ? `${task.time} · ` : ""}{task.title}</Link></li>)}</ul> : <p>{m("preparation.noNotifications")}</p>}</Modal></>;
}

export function GuideReturn() {
  const { search } = useLocation();
  const { m } = useI18n();
  const target = new URLSearchParams(search).get("returnTo");
  // Only the internal guide can be a return destination; never an arbitrary URL.
  if (!target || !/^\/app\/guide(?:\?week=\d{4}-\d{2}-\d{2})?$/.test(target)) return null;
  return <Link className="prep-return" to={target} data-i18n-explicit="true"><ArrowLeft size={17} />{m("preparation.backGuide")}</Link>;
}
