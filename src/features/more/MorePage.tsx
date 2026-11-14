"use client";

import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, ChevronRight, Eye, Flame, ListTodo, Repeat2, Settings, Sparkles } from "lucide-react";
import { Card, SectionHeading } from "@/src/components/ui/Primitives";
import { useI18n } from "@/src/i18n/I18nProvider";

const groups = [
  { title: "more.organize", links: [
    ["/app/life-hub?tab=routines", "space.tab.routines", "more.routines.description", Repeat2],
    ["/app/life-hub?tab=challenges", "space.tab.challenges", "more.challenges.description", Flame],
    ["/app/life-hub?tab=vision", "space.tab.vision", "more.vision.description", Eye],
    ["/app/life-hub?tab=events", "space.tab.calendar", "more.calendar.description", CalendarDays],
  ] },
  { title: "more.support", links: [
    ["/app/help", "more.help.title", "more.help.description", Sparkles],
    ["/app/learn", "more.learn.title", "more.learn.description", BookOpen],
    ["/app/settings", "navigation.item.settings", "more.settings.description", Settings],
  ] },
  { title: "more.lists", links: [
    ["/app/life-hub?tab=lists", "space.inbox.capture.title", "space.destination.inbox.description", ListTodo],
  ] },
] as const;

export function MorePage() {
  const { m } = useI18n();
  return <div className="page-stack more-page" data-i18n-explicit="true">
    <SectionHeading eyebrow={m("more.eyebrow")} title={m("more.title")} description={m("more.description")} />
    {groups.map((group) => <section className="more-group" key={group.title}>
      <h2>{m(group.title)}</h2><div className="more-grid">
        {group.links.map(([href, title, text, Icon]) => <Link to={href} key={href}>
          <Card className="more-card"><span><Icon size={21} aria-hidden="true" /></span><div><h3>{m(title)}</h3><p>{m(text)}</p></div><ChevronRight size={19} aria-hidden="true" /></Card>
        </Link>)}
      </div>
    </section>)}
  </div>;
}
