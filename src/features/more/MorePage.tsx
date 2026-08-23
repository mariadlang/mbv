"use client";

import { Link } from "react-router-dom";
import { Banknote, BarChart3, BookOpen, ChevronRight, Feather, HeartPulse, LayoutGrid, ListTodo, Settings, Sparkles, Target } from "lucide-react";
import { Card, SectionHeading } from "@/src/components/ui/Primitives";

const groups = [
  { title: "PLANIFICAR", links: [["/app/goals", "Metas", "Resultados que orientan tus decisiones.", Target], ["/app/tasks", "Tareas y proyectos", "Acciones, checklist y próximos pasos.", ListTodo]] },
  { title: "CUIDARME", links: [["/app/habits", "Hábitos y bienestar", "Hábitos, ánimo, energía, sueño y enfoque.", HeartPulse]] },
  { title: "ORGANIZAR", links: [["/app/finance", "Finanzas", "Presupuesto, movimientos y decisiones.", Banknote], ["/app/life-hub", "Mi espacio", "Listas, rutinas, Fitness Hub, retos, visión y eventos.", LayoutGrid]] },
  { title: "REFLEXIONAR", links: [["/app/progress", "Tu progreso", "Reconoce el ritmo que has construido.", BarChart3], ["/app/journal", "Mi diario", "Un lugar para volver a ti.", Feather]] },
  { title: "APOYO", links: [["/app/help", "Desbloquearme", "Convierte el ruido en una acción pequeña.", Sparkles], ["/app/learn", "Aprende", "Ideas breves para usar mejor tu planner.", BookOpen], ["/app/settings", "Ajustes", "Preferencias, privacidad y respaldo.", Settings]] },
] as const;

export function MorePage() {
  return <div className="page-stack more-page"><SectionHeading eyebrow="Tu planner completo" title="Más" description="Encuentra cada espacio según lo que quieres hacer ahora." />{groups.map((group) => <section className="more-group" key={group.title}><h2>{group.title}</h2><div className="more-grid">{group.links.map(([href, title, text, Icon]) => <Link to={href} key={href}><Card className="more-card"><span><Icon size={21} /></span><div><h3>{title}</h3><p>{text}</p></div><ChevronRight size={19} /></Card></Link>)}</div></section>)}</div>;
}
