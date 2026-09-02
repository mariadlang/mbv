"use client";

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, HeartHandshake, HelpCircle, MessageCircle, Phone, RotateCcw, Salad, Search, Sparkles } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { toLocalDateKey } from "@/src/lib/dates";
import { Button, Card, SectionHeading } from "@/src/components/ui/Primitives";

const tools = [
  { id: "overwhelmed", title: "Estoy abrumada", copy: "Saca lo que tienes en la cabeza y decide: hoy, después o soltar.", prompt: "Escribe una cosa que está ocupando espacio mental." },
  { id: "start", title: "No sé por dónde empezar", copy: "Convierte una tarea en un paso visible de menos de 15 minutos.", prompt: "¿Cuál es el primer verbo y qué quedará visible al terminar?" },
  { id: "procrastinating", title: "Estoy procrastinando", copy: "Reduce el alcance y crea una cita breve con la tarea.", prompt: "Escribe la versión de 10 minutos de esa tarea." },
  { id: "perfect", title: "Quiero hacerlo perfecto", copy: "Define cómo se ve una primera versión suficientemente buena.", prompt: "¿Qué puedes entregar en una versión 1, sin pulir?" },
  { id: "too_much", title: "Tengo demasiadas cosas", copy: "Protege una sola acción y devuelve el resto al plan.", prompt: "¿Cuál sería la única acción imprescindible de hoy?" },
  { id: "lost", title: "Perdí el ritmo", copy: "Vuelve con una versión mínima que puedas repetir durante siete días.", prompt: "Escribe la versión mínima del hábito que quieres retomar." },
  { id: "thinking", title: "Estoy pensando demasiado", copy: "Transforma una decisión en un pequeño experimento.", prompt: "¿Qué prueba segura podrías hacer hoy para obtener información?" },
  { id: "energy", title: "Tengo poca energía", copy: "Elige una acción breve y deja margen para cuidarte.", prompt: "¿Qué acción de menos de 10 minutos sí cabe hoy?" },
] as const;

type ToolId = typeof tools[number]["id"];

export function HelpPage({ planner }: { planner: PlannerController }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ToolId | null>(null);
  const [action, setAction] = useState("");
  const [destination, setDestination] = useState<"today" | "later" | "release">("today");
  const [message, setMessage] = useState("");
  const activeTool = tools.find((tool) => tool.id === selected);
  const filtered = tools.filter((tool) => `${tool.title} ${tool.copy}`.toLowerCase().includes(query.toLowerCase()));

  const applyTool = async (event: FormEvent) => {
    event.preventDefault();
    if (!action.trim() || !activeTool) return;
    if (destination === "today") {
      await planner.createTask(action.trim(), toLocalDateKey(new Date()), activeTool.id === "start" ? 1 : undefined);
      setMessage("La acción quedó añadida a Mi día.");
    } else if (destination === "later") {
      await planner.createBrainDumpItem({ title: action.trim(), type: "want_to_do", priority: "medium" });
      setMessage("La idea quedó guardada en Mi espacio para decidirla después.");
    } else {
      setMessage("La soltaste por ahora. No se creó ninguna tarea.");
    }
    setAction("");
  };

  return <div className="page-stack help-page">
    <SectionHeading eyebrow="Una salida concreta" title="Desbloquearme" description="Herramientas breves para convertir el ruido en una decisión. No son terapia ni sustituyen apoyo profesional." />
    <div className="help-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar una herramienta…" aria-label="Buscar herramienta" /></div>
    {message && <p className="inline-message" role="status">{message} <Link to={destination === "today" ? "/app/today" : "/app/life-hub"}>Ver ahora</Link></p>}
      <div className="help-card-grid">{filtered.map((tool, index) => { const Icon = index % 3 === 0 ? Sparkles : index % 3 === 1 ? BookOpen : HelpCircle; return <Card key={tool.id} className={`help-card ${selected === tool.id ? "is-active" : ""}`}><span><Icon size={22} /></span><h2>{tool.title}</h2><p>{tool.copy}</p><button aria-expanded={selected === tool.id} onClick={() => { setSelected(selected === tool.id ? null : tool.id); setMessage(""); }}>Aplicar <ChevronRight size={16} /></button>{selected === tool.id && <form className="toolkit-form" onSubmit={applyTool}><label><span>{tool.prompt}</span><textarea required rows={3} value={action} onChange={(event) => setAction(event.target.value)} /></label><label><span>¿Dónde quieres dejarlo?</span><select value={destination} onChange={(event) => setDestination(event.target.value as typeof destination)}><option value="today">Añadir a Mi día</option><option value="later">Guardar para después</option><option value="release">Soltar por ahora</option></select></label><Button type="submit">Aplicar al planner</Button></form>}</Card>; })}</div>

    <section className="support-section"><header><div><p className="eyebrow">Apoyo humano</p><h2>No tienes que resolverlo todo sola</h2><p>Canales oficiales para Colombia y Bogotá. Verifica disponibilidad local; si hay peligro inmediato, llama al 123.</p></div><HeartHandshake size={30} /></header><div className="support-grid">
      <Card className="support-card"><span><MessageCircle size={22} /></span><div><BadgeText>24/7 · Bogotá</BadgeText><h2>Apoyo psicológico · Línea 106</h2><p>Escucha y orientación psicosocial para personas de todas las edades.</p><strong>106 · WhatsApp 300 754 8933</strong></div><div><a href="tel:106"><Phone size={15} /> Llamar</a><a href="https://wa.me/573007548933" target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a></div></Card>
      <Card className="support-card"><span><Salad size={22} /></span><div><BadgeText>Centro de Contacto · MinSalud</BadgeText><h2>Orientación institucional de salud</h2><p>Puede orientarte sobre rutas y servicios. Para un plan nutricional personal, consulta a tu EPS o nutrición clínica.</p><strong>Bogotá 601 330 5043 · resto del país 01 8000 960020</strong></div><div><a href="tel:018000960020"><Phone size={15} /> Llamar</a><a href="https://www.minsalud.gov.co/salud/publica/HS/Paginas/salud-nutricional.aspx" target="_blank" rel="noreferrer">Salud nutricional <ChevronRight size={15} /></a></div></Card>
      <Card className="support-card support-card--purple"><span><HeartHandshake size={22} /></span><div><BadgeText>24/7 · Bogotá</BadgeText><h2>Línea Púrpura</h2><p>Orientación psicosocial y rutas de atención para mujeres.</p><strong>01 8000 112 137 · WhatsApp 300 755 1846</strong></div><div><a href="tel:018000112137"><Phone size={15} /> Llamar</a><a href="https://wa.me/573007551846" target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a></div></Card>
    </div><div className="emergency-note"><strong>Si hay peligro inmediato o una vida está en riesgo, llama al 123.</strong><span>My Best Version no diagnostica, trata ni sustituye ayuda profesional.</span></div></section>
    <Card className="restart-tour-card"><MessageCircle size={20} /><div><h2>Peticiones, privacidad y reclamos</h2><p>Radica una solicitud con número de referencia y consulta su estado.</p></div><Link className="button button--secondary" to="/app/privacy-center">Abrir canal PQR</Link></Card>
    <Card className="restart-tour-card"><RotateCcw size={20} /><div><h2>Reiniciar activación</h2><p>Vuelve a conectar visión, meta, mes, semana y primer paso.</p></div><Link className="button button--secondary" to="/app/dashboard" onClick={() => planner.updateProfileSettings({ activationCompleted: false })}>Reiniciar</Link></Card>
  </div>;
}

function BadgeText({ children }: { children: string }) { return <small className="support-badge">{children}</small>; }
