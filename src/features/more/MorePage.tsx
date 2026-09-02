"use client";

import { Link } from "react-router-dom";
import { BookOpen, CalendarDays, ChevronRight, Eye, Flame, Repeat2, Settings, Sparkles } from "lucide-react";
import { Card, SectionHeading } from "@/src/components/ui/Primitives";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";

const groups = [
  { title: "ORGANIZAR Y EXPLORAR", links: [["/app/life-hub?tab=routines", "Rutinas", "Secuencias para comenzar, pausar o cerrar el día.", Repeat2], ["/app/life-hub?tab=challenges", "Retos", "Experimentos personales con un ritmo flexible.", Flame], ["/app/life-hub?tab=vision", "Mi Visión", "Frases e imágenes que quieres mantener presentes.", Eye], ["/app/life-hub?tab=events", "Eventos", "Fechas y momentos que ya tienen un lugar.", CalendarDays]] },
  { title: "APOYO", links: [["/app/help", "Desbloquearme", "Convierte el ruido en una acción pequeña.", Sparkles], ["/app/learn", "Aprende", "Ideas breves para usar mejor tu planner.", BookOpen], ["/app/settings", "Ajustes", "Preferencias, privacidad y respaldo.", Settings]] },
] as const;

export function MorePage() {
  return <div className="page-stack more-page"><SectionNavigation section="space" /><SectionHeading eyebrow="Tu espacio, a tu manera" title="Más herramientas" description="Rutinas, retos, visión y eventos viven aquí para que Brain Dump siga siendo un lugar simple de captura." />{groups.map((group) => <section className="more-group" key={group.title}><h2>{group.title}</h2><div className="more-grid">{group.links.map(([href, title, text, Icon]) => <Link to={href} key={href}><Card className="more-card"><span><Icon size={21} /></span><div><h3>{title}</h3><p>{text}</p></div><ChevronRight size={19} /></Card></Link>)}</div></section>)}</div>;
}
