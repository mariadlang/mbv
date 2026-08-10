"use client";

import { BookOpen, ChevronRight, HelpCircle, RotateCcw, Search, Sparkles } from "lucide-react";
import { Card, SectionHeading } from "@/src/components/ui/Primitives";

const helpCards = [
  [Sparkles, "Tour guiado", "Recorre paso a paso las funciones principales."],
  [BookOpen, "Conceptos clave", "Aprende cómo se conectan visión, metas, tareas y hábitos."],
  [HelpCircle, "Preguntas frecuentes", "Respuestas sobre privacidad, progreso y backups."],
  [Search, "Buscar en ayuda", "Encuentra artículos y temas rápidamente."],
] as const;

export function HelpPage() {
  return <div className="page-stack"><SectionHeading eyebrow="Aprende, explora y resuelve" title="Centro de ayuda" description="Todo lo necesario para usar tu planner con claridad." /><div className="help-search"><Search size={18} /><input placeholder="Buscar en ayuda…" aria-label="Buscar en ayuda" /></div><div className="help-card-grid">{helpCards.map(([Icon,title,text]) => <Card key={title} className="help-card"><span><Icon size={22} /></span><h2>{title}</h2><p>{text}</p><button>Explorar <ChevronRight size={16} /></button></Card>)}</div><Card className="restart-tour-card"><RotateCcw size={20} /><div><h2>Reiniciar tutorial</h2><p>Vuelve a recorrer la experiencia inicial cuando quieras.</p></div><button>Reiniciar</button></Card></div>;
}
