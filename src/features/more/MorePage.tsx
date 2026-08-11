"use client";

import { Link } from "react-router-dom";
import { Banknote, BarChart3, BookOpen, ChevronRight, Feather, ListTodo, Settings, Smile, Target } from "lucide-react";
import { Card, SectionHeading } from "@/src/components/ui/Primitives";

const links = [
  ["/app/tasks", "Tareas y proyectos", "Convierte tus planes en acciones concretas.", ListTodo],
  ["/app/goals", "Metas", "Conecta hábitos y tareas con una dirección mayor.", Target],
  ["/app/finance", "Finanzas", "Presupuesta, registra movimientos y revisa tu mes.", Banknote],
  ["/app/mood", "Ánimo y energía", "Reconoce cómo llegas a cada día.", Smile],
  ["/app/progress", "Progreso", "Mira la evidencia que has acumulado.", BarChart3],
  ["/app/journal", "Journal", "Guarda aprendizajes y reflexiones privadas.", Feather],
  ["/app/settings", "Ajustes y respaldo", "Controla tus preferencias y protege tus datos.", Settings],
  ["/app/help", "Centro de ayuda", "Encuentra conceptos y recorridos de la app.", BookOpen],
] as const;

export function MorePage() {
  return (
    <div className="page-stack">
      <SectionHeading eyebrow="Tu planner completo" title="Más" description="Elige el espacio que necesitas ahora." />
      <div className="more-grid">
        {links.map(([href, title, text, Icon]) => (
          <Link to={href} key={href}>
            <Card className="more-card"><span><Icon size={21} /></span><div><h2>{title}</h2><p>{text}</p></div><ChevronRight size={19} /></Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
