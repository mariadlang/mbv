"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, Feather, Search } from "lucide-react";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";

export function JournalPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const filtered = snapshot.journalEntries.filter((entry) =>
    `${entry.title ?? ""} ${entry.text}`.toLowerCase().includes(query.toLowerCase()),
  );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    await planner.saveJournal(text);
    setText("");
  };

  return (
    <div className="page-stack">
      <SectionHeading eyebrow="Un espacio privado" title="Journal" description="Guarda aprendizajes y pensamientos que los números no pueden explicar." />
      <div className="journal-layout">
        <Card className="journal-editor-card">
          <p className="eyebrow">Entrada libre</p>
          <h2>¿Qué ocupa espacio en tu mente?</h2>
          <form onSubmit={save}>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Escribe sin tener que llegar a una conclusión…" rows={9} aria-label="Nueva entrada de journal" />
            <div className="journal-editor-card__footer"><span><Feather size={15} /> Solo se guarda en este dispositivo</span><Button type="submit">Guardar reflexión</Button></div>
          </form>
        </Card>
        <div className="journal-entries page-stack">
          <div className="search-field"><Search size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en mis notas" aria-label="Buscar en el journal" /></div>
          {filtered.length ? filtered.map((entry) => (
            <Card className="journal-entry" key={entry.id}>
              <div className="journal-entry__meta"><Badge tone="neutral">{entry.type === "weekly_review" ? "Revisión semanal" : "Nota"}</Badge><span><CalendarDays size={14} /> {entry.date}</span></div>
              <h3>{entry.title || "Entrada sin título"}</h3>
              <p>{entry.text}</p>
            </Card>
          )) : <EmptyState title="Aún no hay reflexiones" text="Una frase honesta es suficiente para empezar." />}
        </div>
      </div>
    </div>
  );
}
