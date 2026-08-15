"use client";

import { BookOpen, ChevronRight, HeartHandshake, HelpCircle, MessageCircle, Phone, RotateCcw, Salad, Search, Sparkles } from "lucide-react";
import { Card, SectionHeading } from "@/src/components/ui/Primitives";

const helpCards = [
  [Sparkles, "Estoy abrumada", "Elige una sola prioridad y deja el resto en pausa por ahora."],
  [BookOpen, "No sé empezar", "Convierte la tarea en un primer paso visible de diez minutos."],
  [HelpCircle, "Tengo poca energía", "Activa el modo mínimo: una tarea breve y un hábito de cuidado."],
  [Search, "La tarea es muy grande", "Divídela hasta que el primer paso pueda hacerse hoy."],
  [Sparkles, "No tengo tiempo", "Busca el bloque más pequeño disponible y reduce el alcance."],
  [BookOpen, "No quiero hacerlo", "Aclara si puedes eliminar, delegar o cambiar la forma de hacerlo."],
  [HelpCircle, "Me frena el perfeccionismo", "Define una versión suficientemente buena antes de comenzar."],
  [Search, "Tour guiado", "Recorre cómo tu Dream Life baja por cada nivel de planeación."],
] as const;

export function HelpPage() {
  return <div className="page-stack help-page"><SectionHeading eyebrow="Aprende, explora y resuelve" title="Centro de ayuda" description="Guías del planner y canales oficiales para cuando necesites apoyo humano." /><div className="help-search"><Search size={18} /><input placeholder="Buscar en ayuda…" aria-label="Buscar en ayuda" /></div><div className="help-card-grid">{helpCards.map(([Icon,title,copy]) => <Card key={title} className="help-card"><span><Icon size={22} /></span><h2>{title}</h2><p>{copy}</p><button>Explorar <ChevronRight size={16} /></button></Card>)}</div>
    <section className="support-section"><header><div><p className="eyebrow">¿Necesitas ayuda?</p><h2>No tienes que resolverlo todo sola</h2><p>Estos canales oficiales corresponden a Colombia y Bogotá. No reemplazan atención médica ni servicios de emergencia.</p></div><HeartHandshake size={30} /></header><div className="support-grid">
      <Card className="support-card"><span><MessageCircle size={22} /></span><div><BadgeText>24/7 · Bogotá</BadgeText><h2>Apoyo psicológico · Línea 106</h2><p>Escucha, apoyo psicosocial e intervención en crisis para personas de todas las edades.</p><strong>Marca 106 · WhatsApp 300 754 8933</strong></div><div><a href="tel:106"><Phone size={15} /> Llamar</a><a href="https://wa.me/573007548933" target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a></div></Card>
      <Card className="support-card"><span><Salad size={22} /></span><div><BadgeText>Orientación nacional</BadgeText><h2>Información en salud y nutrición</h2><p>Para orientación institucional en salud nutricional. Para un plan personal, consulta a tu EPS o a nutrición clínica.</p><strong>01 8000 91 00 97 · lun–vie 8:00–17:30</strong></div><div><a href="tel:018000910097"><Phone size={15} /> Llamar</a><a href="https://www.minsalud.gov.co/salud/publica/HS/Paginas/salud-nutricional.aspx" target="_blank" rel="noreferrer">Sitio oficial <ChevronRight size={15} /></a></div></Card>
      <Card className="support-card support-card--purple"><span><HeartHandshake size={22} /></span><div><BadgeText>24/7 · Bogotá</BadgeText><h2>Línea Púrpura</h2><p>Orientación psicosocial y rutas de atención para mujeres que viven violencias o necesitan información.</p><strong>01 8000 112 137 · WhatsApp 300 755 1846</strong></div><div><a href="tel:018000112137"><Phone size={15} /> Llamar</a><a href="https://wa.me/573007551846" target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a></div></Card>
    </div><div className="emergency-note"><strong>Si hay peligro inmediato o una vida está en riesgo, llama al 123.</strong><span>My Best Version no diagnostica, trata ni sustituye ayuda profesional.</span></div></section>
    <Card className="restart-tour-card"><RotateCcw size={20} /><div><h2>Reiniciar tutorial</h2><p>Vuelve a recorrer la experiencia inicial cuando quieras.</p></div><button>Reiniciar</button></Card>
  </div>;
}

function BadgeText({ children }: { children: string }) {
  return <small className="support-badge">{children}</small>;
}
