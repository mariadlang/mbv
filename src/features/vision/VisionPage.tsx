"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Coins, Heart, Home, Leaf, Palette, Plane, Plus, Save, Sparkles } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { PlannerController } from "@/src/hooks/usePlanner";
import { Badge, Button, Card, SectionHeading, SegmentedControl } from "@/src/components/ui/Primitives";
import { imageUploadSchema } from "@/src/lib/schemas";
import { Modal } from "@/src/components/ui/Modal";
import { SectionNavigation } from "@/src/components/layout/SectionNavigation";
import { averageConfirmedScore, getConfirmedLifeAreaScores, getLifeAreaScoreState } from "@/src/domain/lifeAreaScores";
import { useI18n } from "@/src/i18n/I18nProvider";

const areaIcons = [Heart, BriefcaseBusiness, Coins, Heart, Home, Leaf, Palette, Plane];

export function VisionPage({ planner }: { planner: PlannerController }) {
  const { snapshot } = planner;
  const { m } = useI18n();
  const [searchParams] = useSearchParams();
  const guided = searchParams.get("guided") === "1";
  const [view, setView] = useState<"dream" | "wheel">("dream");
  const [selectedId, setSelectedId] = useState(snapshot.lifeAreas[0]?.id ?? "");
  const selected = snapshot.lifeAreas.find((area) => area.id === selectedId) ?? snapshot.lifeAreas[0];
  const [vision, setVision] = useState(selected?.vision ?? "");
  const [dream, setDream] = useState(selected?.dream ?? "");
  const [imageDataUrl, setImageDataUrl] = useState(selected?.imageDataUrl);
  const [currentScore, setCurrentScore] = useState(selected?.currentScore ?? 6);
  const [desiredScore, setDesiredScore] = useState(selected?.desiredScore ?? 8);
  const [selectedCategory, setSelectedCategory] = useState(selected?.category ?? selected?.name ?? "");
  const [customOpen, setCustomOpen] = useState(false);
  const [customSavedId, setCustomSavedId] = useState<string | null>(null);
  const [custom, setCustom] = useState({ name: "", category: "", dream: "", vision: "", currentScore: "", desiredScore: "" });
  const [customImage, setCustomImage] = useState<string>();
  const [imageError, setImageError] = useState("");

  const lifeAreaOptions = useMemo(() => snapshot.lifeAreas.filter((area) => area.active && !area.custom), [snapshot.lifeAreas]);
  const confirmedAreas = useMemo(() => getConfirmedLifeAreaScores(lifeAreaOptions), [lifeAreaOptions]);
  const radarData = useMemo(() => confirmedAreas.map((area) => ({
    area: area.name.split(" ")[0],
    actual: area.currentScore,
    deseada: area.desiredScore,
  })), [confirmedAreas]);
  const currentAverage = averageConfirmedScore(lifeAreaOptions, "currentScore");
  const desiredAverage = averageConfirmedScore(lifeAreaOptions, "desiredScore");
  const selectedScoreState = selected ? getLifeAreaScoreState(selected) : "unrated";

  const chooseArea = (id: string) => {
    const area = snapshot.lifeAreas.find((item) => item.id === id);
    setSelectedId(id);
    setVision(area?.vision ?? "");
    setDream(area?.dream ?? "");
    setImageDataUrl(area?.imageDataUrl);
    setImageError("");
    setCurrentScore(area?.currentScore ?? 6);
    setDesiredScore(area?.desiredScore ?? 8);
    setSelectedCategory(area?.category ?? area?.name ?? "");
  };

  const readImage = (file: File | undefined, onReady: (value: string) => void) => {
    if (!file) return;
    const parsed = imageUploadSchema.safeParse({ type: file.type, size: file.size });
    if (!parsed.success) {
      setImageError("Usa una imagen JPG, PNG o WebP de hasta 1.5 MB.");
      return;
    }
    setImageError("");
    const reader = new FileReader();
    reader.onerror = () => setImageError("No pudimos leer esta imagen. Prueba con otro archivo.");
    reader.onload = () => onReady(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="page-stack">
      <SectionNavigation section="plan" />
      <SectionHeading
        eyebrow="Tu visión, sin límites"
        title={view === "dream" ? "Vida soñada" : "Rueda de vida"}
        description={view === "dream" ? "Explora la vida que quieres construir por áreas." : "Evalúa dónde estás y visualiza hacia dónde quieres avanzar."}
        action={<SegmentedControl ariaLabel="Vista de visión" items={[{ id: "dream", label: "Vida soñada" }, { id: "wheel", label: "Rueda de vida" }]} value={view} onChange={setView} />}
      />

      {guided && <Card className="vision-guided-start"><Sparkles size={22} /><div><p className="eyebrow">Tu punto de partida</p><h2>Diseña primero una imagen de la vida que quieres</h2><p>Elige un área, escribe una visión breve y después observa la Rueda de vida. Desde aquí podrás convertir lo importante en una meta.</p></div><Button variant="secondary" onClick={() => setView("wheel")}>Ver mi Rueda de vida <ArrowRight size={16} /></Button></Card>}

      {view === "dream" ? (
        <div className="vision-layout">
          <section className="vision-card-grid">
            {snapshot.lifeAreas.filter((area) => area.active).map((area, index) => {
              const Icon = areaIcons[index % areaIcons.length];
              return (
                <button key={area.id} className={`vision-card ${selected?.id === area.id ? "is-selected" : ""}`} onClick={() => chooseArea(area.id)}>
                  <span className={`vision-card__visual vision-card__visual--${area.color}`}>{area.imageDataUrl ? <img src={area.imageDataUrl} alt="" /> : <Icon size={30} strokeWidth={1.35} />}</span>
                  <Badge tone="neutral"><span data-no-translate="true" translate="no">{area.custom ? area.category : area.name}</span></Badge>
                  <h2>{area.vision ? <span data-no-translate="true" translate="no">{area.vision.split(".")[0]}</span> : <>Diseñar mi visión de <span data-no-translate="true" translate="no">{area.name.toLowerCase()}</span></>}</h2>
                  {area.vision ? <p data-no-translate="true" translate="no">{area.vision}</p> : <p>Describe cómo se siente esta área cuando está alineada contigo.</p>}
                </button>
              );
            })}
            <button className="vision-card vision-card--create" onClick={() => { setCustomSavedId(null); setCustom({ name: "", category: "", dream: "", vision: "", currentScore: "", desiredScore: "" }); setCustomImage(undefined); setImageError(""); setCustomOpen(true); }}><span className="vision-card__visual"><Plus size={30} /></span><Badge tone="neutral">Tarjeta personalizada</Badge><h2>Crear una tarjeta personalizada</h2><p>Añade una visión y conéctala con una de tus áreas de vida.</p></button>
          </section>
          {selected && (
            <Card className="vision-editor">
              <p className="eyebrow">Reflexión · <span data-no-translate="true" translate="no">{selected.name}</span></p>
              <h2>¿Cómo se ve tu mejor versión aquí?</h2>
              {selected.custom && <label className="form-field"><span>Área de vida</span><select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>{lifeAreaOptions.map((area) => <option value={area.name} key={area.id} data-no-translate="true" translate="no">{area.name}</option>)}</select><small>Las opciones son las mismas de tu Rueda de vida.</small></label>}
              <label className="form-field"><span>Mi sueño</span><input value={dream} onChange={(event) => setDream(event.target.value)} placeholder="Ej. Vivir con energía y calma" /></label>
              <label className="form-field"><span>Mi visión</span><textarea rows={6} value={vision} onChange={(event) => setVision(event.target.value)} placeholder="Escribe una imagen concreta, propia y posible…" aria-label="Visión del área" /></label>
              <label className="button button--secondary">Elegir imagen<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => readImage(event.target.files?.[0], setImageDataUrl)} /></label>
              {imageDataUrl && <figure className="vision-upload-preview"><img src={imageDataUrl} alt="Vista previa del área elegida" /><figcaption>Esta imagen aparecerá en tu tarjeta de Vida soñada.</figcaption></figure>}
              {imageError && <p className="form-error" role="alert">{imageError}</p>}
              <p className={`vision-score-state vision-score-state--${selectedScoreState}`} role="status">{m(selectedScoreState === "confirmed" ? "vision.scores.confirmed" : selectedScoreState === "pending_confirmation" ? "vision.scores.pending" : "vision.scores.unrated")}</p>
              <div className="score-pair">
                <label><span>Ahora · {currentScore}/10</span><input type="range" min="1" max="10" value={currentScore} onChange={(event) => setCurrentScore(Number(event.target.value))} /></label>
                <label><span>Deseada · {desiredScore}/10</span><input type="range" min="1" max="10" value={desiredScore} onChange={(event) => setDesiredScore(Number(event.target.value))} /></label>
              </div>
              <div className="vision-editor-actions"><Button onClick={() => planner.updateLifeArea(selected.id, { vision, dream, imageDataUrl, ...(selected.custom ? { category: selectedCategory || selected.category } : {}) })}><Save size={16} /> {m("vision.scores.saveReflection")}</Button><Button variant="secondary" onClick={() => planner.updateLifeArea(selected.id, { currentScore, desiredScore, confirmScores: true, vision, dream, imageDataUrl, ...(selected.custom ? { category: selectedCategory || selected.category } : {}) })}><CheckCircle2 size={16} /> {m("vision.scores.confirm")}</Button>{(vision.trim() || dream.trim()) && <Link className="button button--secondary" to="/app/goals" state={{ openGoal: true, areaId: selected.id, title: dream || vision.split(".")[0], reason: vision || dream }}>Convertir esto en una meta <ArrowRight size={16} /></Link>}</div>
            </Card>
          )}
        </div>
      ) : (
        <div className="wheel-layout">
          <Card className="wheel-chart-card">
            <div className="wheel-legend"><span><i className="legend-dot legend-dot--taupe" /> Actual</span><span><i className="legend-dot legend-dot--rose" /> Deseada</span></div>
            {radarData.length ? <div className="wheel-chart" role="img" aria-label={m("vision.scores.chartAria", { count: radarData.length })}>
              <ResponsiveContainer width="100%" height={460}>
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="area" tick={{ fill: "var(--color-text-primary)", fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={6} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
                  <Radar name="Actual" dataKey="actual" stroke="var(--color-accent-sand)" fill="var(--color-accent-sand)" fillOpacity={0.22} />
                  <Radar name="Deseada" dataKey="deseada" stroke="var(--color-brand-strong)" fill="var(--color-brand)" fillOpacity={0.24} />
                </RadarChart>
              </ResponsiveContainer>
            </div> : <div className="wheel-empty"><Sparkles size={28} /><h2>{m("vision.scores.emptyTitle")}</h2><p>{m("vision.scores.emptyDescription")}</p><Button variant="secondary" onClick={() => setView("dream")}>{m("vision.scores.emptyAction")}</Button></div>}
            <p className="wheel-rated-count">{m("vision.scores.count", { count: confirmedAreas.length, total: lifeAreaOptions.length })}</p>
            <ul className="wheel-score-status-list">{lifeAreaOptions.map((area) => { const state = getLifeAreaScoreState(area); return <li key={area.id}><span data-no-translate="true">{area.name}</span><strong>{state === "confirmed" ? `${area.currentScore}/10` : m(state === "pending_confirmation" ? "vision.scores.pending" : "vision.scores.unrated")}</strong></li>; })}</ul>
          </Card>
          <div className="wheel-side page-stack">
            <Card className="reflection-panel"><Sparkles size={24} /><p className="eyebrow">Reflexión</p><h2>¿Qué área deseas fortalecer?</h2>{selected?.vision ? <p data-no-translate="true" translate="no">{selected.vision}</p> : <p>Elige un área y escribe una visión que te dé dirección, no presión.</p>}<Button variant="secondary" onClick={() => setView("dream")}>Editar mi visión</Button></Card>
            <Card className="wheel-summary"><p className="eyebrow">Resumen</p><strong>{currentAverage === null ? "—" : `${currentAverage.toFixed(1)}/10`}</strong><span>{currentAverage === null ? m("vision.scores.unrated") : m("vision.scores.averageCurrent")}</span><strong>{desiredAverage === null ? "—" : `${desiredAverage.toFixed(1)}/10`}</strong><span>{desiredAverage === null ? m("vision.scores.unrated") : m("vision.scores.averageDesired")}</span></Card>
          </div>
        </div>
      )}
      <Modal open={customOpen} title={customSavedId ? "Visión guardada" : "Crear tarjeta personalizada"} description={customSavedId ? "Esta parte de tu visión ya puede convertirse en una meta cuando quieras." : "Elige solo los campos que te ayuden. Nada aquí es obligatorio salvo el nombre."} onClose={() => setCustomOpen(false)}>
        {customSavedId ? <div className="vision-success"><CheckCircle2 size={28} aria-hidden="true" /><h2 data-no-translate="true" translate="no">{custom.name}</h2><p>Tu tarjeta ya forma parte de Tablero visual y está conectada con <span data-no-translate="true" translate="no">{custom.category}</span>.</p><Link className="button button--primary" to="/app/goals" state={{ openGoal: true, areaId: customSavedId, title: custom.dream || custom.name, reason: custom.vision || custom.dream }} onClick={() => setCustomOpen(false)}>Convertir esto en una meta <ArrowRight size={16} /></Link><Button variant="ghost" onClick={() => setCustomOpen(false)}>Ahora no</Button></div> : <form className="form-grid" onSubmit={async (event) => { event.preventDefault(); if (!custom.name.trim() || !custom.category) return; const next = await planner.createLifeArea({ name: custom.name, category: custom.category, dream: custom.dream, vision: custom.vision, currentScore: custom.currentScore ? Number(custom.currentScore) : undefined, desiredScore: custom.desiredScore ? Number(custom.desiredScore) : undefined, imageDataUrl: customImage }); const created = next.lifeAreas.at(-1); if (created) { setCustomSavedId(created.id); chooseArea(created.id); } }}>
          <label className="form-field"><span>Nombre</span><input required value={custom.name} onChange={(event) => setCustom({ ...custom, name: event.target.value })} placeholder="Ej. Mi vida creativa" /></label>
          <label className="form-field"><span>Área de vida</span><select required value={custom.category} onChange={(event) => setCustom({ ...custom, category: event.target.value })}><option value="">Elige un área</option>{lifeAreaOptions.map((area) => <option value={area.name} key={area.id} data-no-translate="true" translate="no">{area.name}</option>)}</select><small>Usamos las mismas áreas de tu Rueda de vida para mantener todo conectado.</small></label>
          <label className="form-field form-field--full"><span>Mi sueño</span><input value={custom.dream} onChange={(event) => setCustom({ ...custom, dream: event.target.value })} placeholder="Una frase que nombre lo que deseas" /></label>
          <label className="form-field form-field--full"><span>Mi visión</span><textarea rows={5} value={custom.vision} onChange={(event) => setCustom({ ...custom, vision: event.target.value })} placeholder="¿Cómo se ve tu mejor versión aquí?" /></label>
          <label className="form-field"><span>Estado actual · opcional</span><input type="number" min="1" max="10" value={custom.currentScore} onChange={(event) => setCustom({ ...custom, currentScore: event.target.value })} /></label>
          <label className="form-field"><span>Estado deseado · opcional</span><input type="number" min="1" max="10" value={custom.desiredScore} onChange={(event) => setCustom({ ...custom, desiredScore: event.target.value })} /></label>
          <label className="button button--secondary form-field--full">Elegir imagen<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => readImage(event.target.files?.[0], setCustomImage)} /></label>
          {customImage && <img className="vision-upload-preview form-field--full" src={customImage} alt="Vista previa de la tarjeta" />}
          {imageError && <p className="form-error form-field--full" role="alert">{imageError}</p>}
          <div className="modal__actions form-field--full"><Button type="button" variant="ghost" onClick={() => setCustomOpen(false)}>Cancelar</Button><Button type="submit">Guardar tarjeta</Button></div>
        </form>}
      </Modal>
    </div>
  );
}
