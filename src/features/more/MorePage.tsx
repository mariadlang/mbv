"use client";

import { Link } from "react-router-dom";
import { BarChart3, ChevronRight, Feather, Settings, Target } from "lucide-react";
import { Card, SectionHeading } from "@/src/components/ui/Primitives";

const links = [
  ["/app/goals", "Metas", "Conecta hábitos y tareas con una dirección mayor.", Target],
  ["/app/progress", "Progreso", "Mira la evidencia que has acumulado.", BarChart3],
  ["/app/journal", "Journal", "Guarda aprendizajes y reflexiones privadas.", Feather],
  ["/app/settings", "Ajustes y respaldo", "Controla tus preferencias y protege tus datos.", Settings],
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
