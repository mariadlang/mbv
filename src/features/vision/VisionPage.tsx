"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, Coins, Heart, Home, Leaf, Palette, Plane, Plus, Save, Sparkles } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Badge, Button, Card, SectionHeading } from "@/src/components/ui/Primitives";
import { imageUploadSchema } from "@/src/lib/schemas";
import { Modal } from "@/src/components/ui/Modal";

const areaIcons = [Heart, BriefcaseBusiness, Coins, Heart, Home, Leaf, Palette, Plane];
const customCategories = ["Salud", "Físico", "Relaciones", "Trabajo", "Profesional", "Personal", "Espiritual", "Crecimiento", "Finanzas", "Hogar", "Experiencias", "Otro"];

export function VisionPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const [view, setView] = useState<"dream" | "wheel">("dream");
  const [selectedId, setSelectedId] = useState(snapshot.lifeAreas[0]?.id ?? "");
  const selected = snapshot.lifeAreas.find((area) => area.id === selectedId) ?? snapshot.lifeAreas[0];
  const [vision, setVision] = useState(selected?.vision ?? "");
  const [dream, setDream] = useState(selected?.dream ?? "");
  const [imageDataUrl, setImageDataUrl] = useState(selected?.imageDataUrl);
  const [currentScore, setCurrentScore] = useState(selected?.currentScore ?? 6);
  const [desiredScore, setDesiredScore] = useState(selected?.desiredScore ?? 8);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSavedId, setCustomSavedId] = useState<string | null>(null);
  const [custom, setCustom] = useState({ name: "", category: "Personal", dream: "", vision: "", currentScore: "", desiredScore: "" });
  const [customImage, setCustomImage] = useState<string>();

  const radarData = useMemo(() => snapshot.lifeAreas.filter((area) => area.active).map((area) => ({
    area: area.name.split(" ")[0],
    actual: area.currentScore ?? 6,
    deseada: area.desiredScore ?? 8,
  })), [snapshot.lifeAreas]);

  const chooseArea = (id: string) => {
    const area = snapshot.lifeAreas.find((item) => item.id === id);
    setSelectedId(id);
    setVision(area?.vision ?? "");
    setDream(area?.dream ?? "");
    setImageDataUrl(area?.imageDataUrl);
    setCurrentScore(area?.currentScore ?? 6);
    setDesiredScore(area?.desiredScore ?? 8);
  };

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Tu visión, sin límites"
        title={view === "dream" ? "Dream Life" : "Rueda de vida"}
        description={view === "dream" ? "Explora la vida que quieres construir por áreas." : "Evalúa dónde estás y visualiza hacia dónde quieres avanzar."}
        action={<div className="segmented-control"><button className={view === "dream" ? "is-active" : ""} onClick={() => setView("dream")}>Dream Life</button><button className={view === "wheel" ? "is-active" : ""} onClick={() => setView("wheel")}>Rueda de vida</button></div>}
      />

      {view === "dream" ? (
        <div className="vision-layout">
          <section className="vision-card-grid">
            {snapshot.lifeAreas.filter((area) => area.active).map((area, index) => {
              const Icon = areaIcons[index % areaIcons.length];
              return (
                <button key={area.id} className={`vision-card ${selected?.id === area.id ? "is-selected" : ""}`} onClick={() => chooseArea(area.id)}>
                  <span className={`vision-card__visual vision-card__visual--${area.color}`}>{area.imageDataUrl ? <img src={area.imageDataUrl} alt="" /> : <Icon size={30} strokeWidth={1.35} />}</span>
                  <Badge tone="neutral">{area.name}</Badge>
                  <h2>{area.vision ? area.vision.split(".")[0] : `Diseñar mi visión de ${area.name.toLowerCase()}`}</h2>
                  <p>{area.vision || "Describe cómo se siente esta área cuando está alineada contigo."}</p>
                </button>
              );
            })}
            <button className="vision-card vision-card--create" onClick={() => { setCustomSavedId(null); setCustomOpen(true); }}><span className="vision-card__visual"><Plus size={30} /></span><Badge tone="neutral">Tu propia categoría</Badge><h2>Crear una tarjeta personalizada</h2><p>Añade una visión que no encaje en las tarjetas iniciales.</p></button>
          </section>
          {selected && (
            <Card className="vision-editor">
              <p className="eyebrow">Reflexión · {selected.name}</p>
              <h2>¿Cómo se ve tu mejor versión aquí?</h2>
              <label className="form-field"><span>Mi sueño</span><input value={dream} onChange={(event) => setDream(event.target.value)} placeholder="Ej. Vivir con energía y calma" /></label>
              <label className="form-field"><span>Mi visión</span><textarea rows={6} value={vision} onChange={(event) => setVision(event.target.value)} placeholder="Escribe una imagen concreta, propia y posible…" aria-label="Visión del área" /></label>
              <label className="button button--secondary">Elegir imagen<input className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (!file || !imageUploadSchema.safeParse({ type: file.type, size: file.size }).success) return; const reader = new FileReader(); reader.onload = () => setImageDataUrl(String(reader.result)); reader.readAsDataURL(file); }} /></label>
              <div className="score-pair">
                <label><span>Ahora · {currentScore}/10</span><input type="range" min="1" max="10" value={currentScore} onChange={(event) => setCurrentScore(Number(event.target.value))} /></label>
                <label><span>Deseada · {desiredScore}/10</span><input type="range" min="1" max="10" value={desiredScore} onChange={(event) => setDesiredScore(Number(event.target.value))} /></label>
              </div>
              <div className="vision-editor-actions"><Button onClick={() => planner.updateLifeArea(selected.id, { currentScore, desiredScore, vision, dream, imageDataUrl })}><Save size={16} /> Guardar mi visión</Button>{(vision.trim() || dream.trim()) && <Link className="button button--secondary" to="/app/goals" state={{ openGoal: true, areaId: selected.id, title: dream || vision.split(".")[0], reason: vision || dream }}>Convertir esto en una meta <ArrowRight size={16} /></Link>}</div>
            </Card>
          )}
        </div>
      ) : (
        <div className="wheel-layout">
          <Card className="wheel-chart-card">
            <div className="wheel-legend"><span><i className="legend-dot legend-dot--taupe" /> Actual</span><span><i className="legend-dot legend-dot--rose" /> Deseada</span></div>
            <div className="wheel-chart" aria-label="Rueda de vida actual y deseada">
              <ResponsiveContainer width="100%" height={460}>
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="area" tick={{ fill: "var(--color-text-primary)", fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={6} tick={{ fill: "var(--color-text-secondary)", fontSize: 10 }} />
                  <Radar name="Actual" dataKey="actual" stroke="var(--color-accent-sand)" fill="var(--color-accent-sand)" fillOpacity={0.22} />
                  <Radar name="Deseada" dataKey="deseada" stroke="var(--color-brand-strong)" fill="var(--color-brand)" fillOpacity={0.24} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="wheel-side page-stack">
            <Card className="reflection-panel"><Sparkles size={24} /><p className="eyebrow">Reflexión</p><h2>¿Qué área deseas fortalecer?</h2><p>{selected?.vision || "Elige un área y escribe una visión que te dé dirección, no presión."}</p><Button variant="secondary" onClick={() => setView("dream")}>Editar mi visión</Button></Card>
            <Card className="wheel-summary"><p className="eyebrow">Resumen</p><strong>{(radarData.reduce((sum, item) => sum + item.actual, 0) / Math.max(radarData.length, 1)).toFixed(1)}/10</strong><span>Promedio actual</span><strong>{(radarData.reduce((sum, item) => sum + item.deseada, 0) / Math.max(radarData.length, 1)).toFixed(1)}/10</strong><span>Promedio deseado</span></Card>
          </div>
        </div>
      )}
      <Modal open={customOpen} title={customSavedId ? "Visión guardada" : "Crear tarjeta personalizada"} description={customSavedId ? "Esta parte de tu visión ya puede convertirse en una meta cuando quieras." : "Elige solo los campos que te ayuden. Nada aquí es obligatorio salvo el nombre."} onClose={() => setCustomOpen(false)}>
        {customSavedId ? <div className="goal-success"><span><CheckIcon /></span><h2>{custom.name}</h2><p>Tu tarjeta ya forma parte de Mi Visión.</p><Link className="button button--primary" to="/app/goals" state={{ openGoal: true, areaId: customSavedId, title: custom.dream || custom.name, reason: custom.vision || custom.dream }} onClick={() => setCustomOpen(false)}>Convertir esto en una meta <ArrowRight size={16} /></Link><Button variant="ghost" onClick={() => setCustomOpen(false)}>Ahora no</Button></div> : <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); if (!custom.name.trim()) return; const next = await planner.createLifeArea({ name: custom.name, category: custom.category, dream: custom.dream, vision: custom.vision, currentScore: custom.currentScore ? Number(custom.currentScore) : undefined, desiredScore: custom.desiredScore ? Number(custom.desiredScore) : undefined, imageDataUrl: customImage }); const created = next.lifeAreas.at(-1); if (created) { setCustomSavedId(created.id); chooseArea(created.id); } }}>
          <label className="form-field"><span>Nombre</span><input required value={custom.name} onChange={(event) => setCustom({ ...custom, name: event.target.value })} placeholder="Ej. Mi vida creativa" /></label>
          <label className="form-field"><span>Categoría</span><select value={custom.category} onChange={(event) => setCustom({ ...custom, category: event.target.value })}>{customCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="form-field form-field--full"><span>Mi sueño</span><input value={custom.dream} onChange={(event) => setCustom({ ...custom, dream: event.target.value })} placeholder="Una frase que nombre lo que deseas" /></label>
          <label className="form-field form-field--full"><span>Mi visión</span><textarea rows={5} value={custom.vision} onChange={(event) => setCustom({ ...custom, vision: event.target.value })} placeholder="¿Cómo se ve tu mejor versión aquí?" /></label>
          <label className="form-field"><span>Estado actual · opcional</span><input type="number" min="1" max="10" value={custom.currentScore} onChange={(event) => setCustom({ ...custom, currentScore: event.target.value })} /></label>
          <label className="form-field"><span>Estado deseado · opcional</span><input type="number" min="1" max="10" value={custom.desiredScore} onChange={(event) => setCustom({ ...custom, desiredScore: event.target.value })} /></label>
          <label className="button button--secondary form-field--full">Elegir imagen<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file || !imageUploadSchema.safeParse({ type: file.type, size: file.size }).success) return; const reader = new FileReader(); reader.onload = () => setCustomImage(String(reader.result)); reader.readAsDataURL(file); }} /></label>
          {customImage && <img className="vision-upload-preview form-field--full" src={customImage} alt="Vista previa de la tarjeta" />}
          <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setCustomOpen(false)}>Cancelar</Button><Button type="submit">Guardar tarjeta</Button></div>
        </form>}
      </Modal>
    </div>
  );
}

function CheckIcon() {
  return <Sparkles size={22} />;
}
