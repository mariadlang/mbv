"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Camera, Feather, Search, Sparkles } from "lucide-react";
import type { JournalEntry } from "@/src/domain/planner";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { imageUploadSchema } from "@/src/lib/schemas";
import { toLocalDateKey } from "@/src/lib/dates";
import { Badge, Button, Card, EmptyState, SectionHeading } from "@/src/components/ui/Primitives";

const prompts = ["¿Qué fue lo mejor de hoy?", "¿Qué aprendí sobre mí esta semana?", "¿Qué puedo soltar para avanzar más ligera?"];
const typeLabels: Record<JournalEntry["type"], string> = { free: "Reflexión", gratitude: "Gratitud", weekly_review: "Semanal", monthly_reset: "Mensual" };

export function JournalPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const fileInput = useRef<HTMLInputElement>(null);
  const [showReflections, setShowReflections] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState<JournalEntry["type"]>("free");
  const [goalId, setGoalId] = useState("");
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string>();
  const [message, setMessage] = useState("");
  const entries = snapshot.journalEntries
    .filter((entry) => `${entry.title ?? ""} ${entry.text}`.toLowerCase().includes(query.toLowerCase()))
    .filter((entry) => !month || entry.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    await planner.saveJournal(text, { title: title || undefined, type, goalId: goalId || undefined, imageDataUrl });
    setTitle(""); setText(""); setGoalId(""); setImageDataUrl(undefined); setMessage("Tu página quedó guardada en este dispositivo.");
  };

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed = imageUploadSchema.safeParse({ type: file.type, size: file.size });
    if (!parsed.success) return setMessage(parsed.error.issues[0]?.message ?? "Revisa la imagen.");
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  return <div className="page-stack journal-page-new">
    <SectionHeading eyebrow="MI ESPACIO" title="Mi diario" description="Un lugar para volver a ti." action={<Button variant="secondary" onClick={() => setShowReflections(!showReflections)}>{showReflections ? "Volver a mis páginas" : "Ver reflexiones"}</Button>} />
    {message && <p className="inline-message" role="status">{message}</p>}

    {showReflections ? <div className="journal-reflection-view">
      <Card className="weekly-review-cta"><Sparkles size={25} /><p className="eyebrow">Una sola revisión semanal</p><h2>Weekly Reset</h2><p>Celebra, observa, suelta, ajusta y prepara tus tres prioridades desde el mismo flujo.</p><Link className="button button--primary" to="/app/planning/weekly?reset=1">Iniciar Weekly Reset</Link></Card>
      <Card className="weekly-review-cta"><Feather size={25} /><p className="eyebrow">Cierre del ciclo</p><h2>Monthly Reset</h2><p>Conecta lo aprendido con el próximo mes y su primera semana.</p><Link className="button button--secondary" to="/app/planning?view=reset">Abrir Monthly Reset</Link></Card>
      <div className="review-history"><h2>Revisiones guardadas</h2>{snapshot.reviews.length ? snapshot.reviews.map((review) => <Card key={review.id}><div><Badge tone="neutral">{review.type}</Badge><small>{review.periodKey}</small></div><h3>{review.summary}</h3>{review.decisions.length > 0 && <ul>{review.decisions.map((decision) => <li key={decision}>{decision}</li>)}</ul>}</Card>) : <EmptyState title="Aún no hay revisiones" text="Cuando completes un reset, su síntesis aparecerá aquí." />}</div>
    </div> : <>
      <Card className="journal-quick-entry"><div className="journal-date"><span>Hoy</span><strong>{new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long" })}</strong></div><form onSubmit={save}><input className="journal-title-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título opcional" aria-label="Título de la página" /><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="¿Qué quieres recordar de hoy?" rows={7} aria-label="Nueva página del diario" />{imageDataUrl && <img className="journal-photo-preview" src={imageDataUrl} alt="Foto que acompañará esta página" />}<div className="journal-entry-actions"><input ref={fileInput} className="sr-only" type="file" accept="image/*" onChange={choosePhoto} /><Button type="button" variant="ghost" onClick={() => fileInput.current?.click()}><Camera size={16} /> Añadir foto</Button><label><span>Vincular a una meta</span><select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">Sin vincular</option>{snapshot.goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label><label><span>Tipo</span><select value={type} onChange={(event) => setType(event.target.value as JournalEntry["type"])}><option value="free">Reflexión</option><option value="gratitude">Gratitud</option><option value="weekly_review">Semanal</option><option value="monthly_reset">Mensual</option></select></label><Button type="submit">Guardar</Button></div></form></Card>

      <Card className="journal-prompts"><p className="eyebrow">Una pregunta para empezar</p><div>{prompts.map((prompt) => <button key={prompt} onClick={() => { setTitle(prompt); setText(`${prompt}\n\n`); }}>{prompt}</button>)}</div></Card>

      <section className="journal-pages"><header><div><p className="eyebrow">Tus páginas</p><h2>Lo que has querido recordar</h2></div><div className="journal-page-filters"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar…" aria-label="Buscar en Mi diario" /></label><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Filtrar páginas por mes" /></div></header><div className="journal-timeline">{entries.map((entry) => <article key={entry.id}><time><strong>{new Date(`${entry.date}T12:00:00`).getDate()}</strong><span>{new Date(`${entry.date}T12:00:00`).toLocaleDateString("es-CO", { month: "short" }).replace(".", "").toUpperCase()}</span></time><Card className="journal-entry"><div className="journal-entry__meta"><span><CalendarDays size={14} /> {entry.date}</span><Badge tone="neutral">{typeLabels[entry.type]}</Badge></div><h3>{entry.title || "Algo que quise recordar"}</h3><p>{entry.text}</p>{entry.imageDataUrl && <img src={entry.imageDataUrl} alt="Recuerdo visual de esta página" />}</Card></article>)}{!entries.length && <EmptyState title="Aún no hay páginas" text="Una frase honesta es suficiente para empezar." />}</div></section>
    </>}
    <p className="privacy-note">Tus entradas se guardan localmente en este dispositivo, no se usan para publicidad personalizada y permanecen bajo tu control · {toLocalDateKey(new Date())}</p>
  </div>;
}
