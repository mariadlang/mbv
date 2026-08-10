"use client";

import { useState, type FormEvent } from "react";
import { Bookmark, CalendarDays, Feather, Filter, Link2, Search, Tag } from "lucide-react";
import type { JournalEntry } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";

const prompts = [
  ["¿Qué fue lo mejor de hoy?", "❧"],
  ["¿Qué aprendí sobre mí esta semana?", "♧"],
  ["¿Qué puedo soltar para avanzar más ligera?", "⚘"],
] as const;

const typeLabels: Record<JournalEntry["type"], string> = { free: "Reflexión diaria", gratitude: "Gratitud", weekly_review: "Revisión semanal", monthly_reset: "Monthly Reset" };

export function JournalPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [tab, setTab] = useState<"entries" | "guided">("entries");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState<JournalEntry["type"]>("free");
  const [goalId, setGoalId] = useState("");
  const [query, setQuery] = useState("");
  const filtered = snapshot.journalEntries.filter((entry) => `${entry.title ?? ""} ${entry.text}`.toLowerCase().includes(query.toLowerCase()));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    await planner.saveJournal(text, { title: title || undefined, type, goalId: goalId || undefined });
    setTitle(""); setText(""); setGoalId("");
  };

  const choosePrompt = (prompt: string) => { setTab("entries"); setTitle(prompt); setText(`${prompt}\n\n`); };

  return <div className="page-stack journal-reference">
    <SectionHeading eyebrow="Un espacio privado" title="Journal" description="Guarda aprendizajes, decisiones y pensamientos que los números no pueden explicar." />
    <div className="journal-tabs" role="tablist"><button className={tab === "entries" ? "is-active" : ""} onClick={() => setTab("entries")}>Entradas</button><button className={tab === "guided" ? "is-active" : ""} onClick={() => setTab("guided")}>Reflexiones guiadas</button></div>

    {tab === "guided" ? <div className="guided-journal"><h2>Prompts para hoy</h2><p>Elige una pregunta. No necesitas tener una respuesta perfecta.</p><div>{prompts.map(([prompt,symbol]) => <button key={prompt} onClick={() => choosePrompt(prompt)}><span>{symbol}</span><strong>{prompt}</strong><small>Escribir ahora</small></button>)}</div><Card><Feather size={25}/><h2>Revisión semanal</h2><p>Reconoce avances, aprende de lo difícil y elige un foco para la próxima semana.</p><Button onClick={() => { setTab("entries"); setType("weekly_review"); setTitle("Mi revisión semanal"); setText("Lo que funcionó esta semana:\n\nLo que aprendí:\n\nMi enfoque para la próxima semana:\n"); }}>Iniciar revisión</Button></Card></div> : <>
      <div className="journal-toolbar"><div className="search-field"><Search size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar entradas…" aria-label="Buscar en el journal" /></div><Button variant="secondary"><Filter size={16}/> Filtros</Button></div>
      <div className="journal-reference-layout">
        <Card className="journal-editor-card journal-editor-reference"><div className="journal-editor-top"><label><span>Nueva entrada</span><input value={title} onChange={(event)=>setTitle(event.target.value)} placeholder="Título opcional" /></label><label><span>Vincular a meta</span><select value={goalId} onChange={(event)=>setGoalId(event.target.value)}><option value="">Sin vincular</option>{snapshot.goals.map((goal)=><option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label></div><form onSubmit={save}><div className="journal-formatbar"><strong>B</strong><em>I</em><u>U</u><span>•••</span><span>☷</span><Link2 size={15}/></div><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribe aquí tu entrada…" rows={14} aria-label="Nueva entrada de journal" /><div className="journal-editor-card__footer"><div><button type="button" aria-label="Añadir fecha"><CalendarDays size={15}/></button><button type="button" aria-label="Añadir etiqueta"><Tag size={15}/></button><button type="button" aria-label="Marcar"><Bookmark size={15}/></button><select value={type} onChange={(event)=>setType(event.target.value as JournalEntry["type"])}><option value="free">Reflexión diaria</option><option value="gratitude">Gratitud</option><option value="weekly_review">Revisión semanal</option><option value="monthly_reset">Monthly Reset</option></select></div><Button type="submit">Guardar entrada</Button></div></form></Card>
        <div className="journal-entries page-stack"><div className="journal-prompt-strip"><strong>Prompts para hoy</strong>{prompts.map(([prompt,symbol])=><button key={prompt} onClick={()=>choosePrompt(prompt)}><span>{symbol}</span><small>{prompt}</small></button>)}</div><h2>Entradas anteriores</h2>{filtered.length ? filtered.map((entry) => <Card className="journal-entry" key={entry.id}><div className="journal-entry__meta"><span><CalendarDays size={14} /> {entry.date}</span><Badge tone="neutral">{typeLabels[entry.type]}</Badge></div><h3>{entry.title || "Entrada sin título"}</h3><p>{entry.text}</p></Card>) : <EmptyState title="Aún no hay reflexiones" text="Una frase honesta es suficiente para empezar." />}</div>
      </div>
    </>}
  </div>;
}
