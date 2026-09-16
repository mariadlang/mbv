"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Image as ImageIcon, LockKeyhole, Share2 } from "lucide-react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Primitives";
import {
  buildShareCardModel,
  DEFAULT_SHARE_CARD_METRICS,
  SHARE_CARD_FORMATS,
  SHARE_CARD_METRIC_KEYS,
  SHARE_CARD_TEMPLATES,
  type ShareCardEvidence,
  type ShareCardFormat,
  type ShareCardMetricKey,
  type ShareCardModel,
  type ShareCardTemplate,
} from "@/src/domain/shareCards";
import { useI18n } from "@/src/i18n/I18nProvider";
import type { SharingMessageKey } from "@/src/i18n/messages/features/sharing";
import { analyticsService } from "@/src/services/analyticsService";

const FORMAT_KEYS: Record<ShareCardFormat, SharingMessageKey> = {
  story: "sharing.format.story",
  feed: "sharing.format.feed",
  square: "sharing.format.square",
};

const METRIC_KEYS: Record<ShareCardMetricKey, SharingMessageKey> = {
  completed_tasks: "sharing.metrics.completedTasks",
  habit_checkins: "sharing.metrics.habitCheckins",
  habit_consistency: "sharing.metrics.habitConsistency",
  intentional_days: "sharing.metrics.intentionalDays",
  goal_progress: "sharing.metrics.goalProgress",
};

const TEMPLATE_KEYS: Record<ShareCardTemplate, { label: SharingMessageKey; help: SharingMessageKey; kicker: SharingMessageKey }> = {
  weekly: { label: "sharing.template.weekly", help: "sharing.template.weeklyHelp", kicker: "sharing.preview.weeklyKicker" },
  habits: { label: "sharing.template.habits", help: "sharing.template.habitsHelp", kicker: "sharing.preview.habitsKicker" },
  progress: { label: "sharing.template.progress", help: "sharing.template.progressHelp", kicker: "sharing.preview.progressKicker" },
};

const TEMPLATE_METRICS: Record<ShareCardTemplate, ShareCardMetricKey[]> = {
  weekly: ["completed_tasks", "habit_checkins", "intentional_days"],
  habits: ["habit_checkins", "habit_consistency", "intentional_days"],
  progress: ["completed_tasks", "goal_progress", "intentional_days"],
};

const STATUS_KEYS = {
  downloaded: "sharing.downloaded",
  shared: "sharing.shared",
  fallback: "sharing.shareFallback",
  error: "sharing.imageError",
} as const satisfies Record<string, SharingMessageKey>;

type ShareCardStatus = keyof typeof STATUS_KEYS | null;

interface CanvasCopy {
  kicker: string;
  footer: string;
  metricLabels: Record<ShareCardMetricKey, string>;
}

interface CanvasPalette {
  roseSoft: string;
  rose: string;
  roseDeep: string;
  lavender: string;
  ivory: string;
  white: string;
  charcoal: string;
  taupe: string;
}

const FONT_FAMILY = '"Nunito Sans", "Segoe UI", Arial, sans-serif';

function getCanvasPalette(): CanvasPalette {
  const styles = getComputedStyle(document.documentElement);
  const color = (token: string) => {
    const value = styles.getPropertyValue(token).trim();
    if (!value) throw new Error(`CANVAS_TOKEN_UNAVAILABLE:${token}`);
    return value;
  };
  return {
    roseSoft: color("--brand-rose-soft"),
    rose: color("--brand-rose"),
    roseDeep: color("--brand-rose-deep"),
    lavender: color("--brand-lavender"),
    ivory: color("--brand-ivory"),
    white: color("--brand-white"),
    charcoal: color("--brand-charcoal"),
    taupe: color("--brand-taupe"),
  };
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function wrappedLines(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  const consumed = lines.join(" ").length;
  if (consumed < text.length && lines.length) {
    let last = lines.at(-1) ?? "";
    while (last.length > 1 && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function drawShareCard(canvas: HTMLCanvasElement, model: ShareCardModel, copy: CanvasCopy, brandIcon: HTMLImageElement | null) {
  canvas.width = model.width;
  canvas.height = model.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("CANVAS_UNAVAILABLE");

  const { width, height } = model;
  const palette = getCanvasPalette();
  const scale = width / 1080;
  const padding = 84 * scale;
  const isStory = height >= 1800;
  const isFeed = height > 1100 && !isStory;
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, palette.roseSoft);
  background.addColorStop(0.54, palette.ivory);
  background.addColorStop(1, palette.white);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.34;
  context.fillStyle = palette.rose;
  context.beginPath();
  context.arc(width - 70 * scale, 120 * scale, 260 * scale, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.lavender;
  context.beginPath();
  context.arc(20 * scale, height - 150 * scale, 230 * scale, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  if (brandIcon) context.drawImage(brandIcon, padding, 54 * scale, 44 * scale, 48 * scale);
  context.fillStyle = palette.roseDeep;
  context.font = `700 ${24 * scale}px ${FONT_FAMILY}`;
  context.fillText("MY BEST VERSION", padding + (brandIcon ? 60 * scale : 0), 92 * scale);
  context.fillStyle = palette.taupe;
  context.font = `700 ${20 * scale}px ${FONT_FAMILY}`;
  context.fillText(copy.kicker, padding, isStory ? 270 * scale : 205 * scale);

  let metricsTop = isStory ? 590 * scale : isFeed ? 430 * scale : 340 * scale;
  if (model.headline) {
    context.fillStyle = palette.charcoal;
    context.font = `750 ${isStory ? 86 * scale : 76 * scale}px ${FONT_FAMILY}`;
    const headlineLines = wrappedLines(context, model.headline, width - padding * 2, 3);
    const headlineTop = isStory ? 350 * scale : 270 * scale;
    const lineHeight = isStory ? 94 * scale : 84 * scale;
    headlineLines.forEach((line, index) => context.fillText(line, padding, headlineTop + index * lineHeight));
    metricsTop = Math.max(metricsTop, headlineTop + headlineLines.length * lineHeight + 85 * scale);
  }

  const gap = 28 * scale;
  const columns = model.metrics.length === 1 ? 1 : 2;
  const cardWidth = columns === 1 ? width - padding * 2 : (width - padding * 2 - gap) / 2;
  const cardHeight = (isStory ? 250 : isFeed ? 210 : 180) * scale;

  model.metrics.forEach((metric, index) => {
    const column = columns === 1 ? 0 : index % 2;
    const row = columns === 1 ? index : Math.floor(index / 2);
    const x = padding + column * (cardWidth + gap);
    const y = metricsTop + row * (cardHeight + gap);
    context.save();
    context.globalAlpha = 0.82;
    context.fillStyle = palette.white;
    roundedRect(context, x, y, cardWidth, cardHeight, 28 * scale);
    context.fill();
    context.restore();
    context.save();
    context.globalAlpha = 0.16;
    context.strokeStyle = palette.roseDeep;
    context.lineWidth = 2 * scale;
    context.stroke();
    context.restore();

    context.fillStyle = palette.roseDeep;
    context.font = `750 ${isStory ? 70 * scale : 60 * scale}px ${FONT_FAMILY}`;
    context.fillText(`${metric.value}${metric.suffix}`, x + 34 * scale, y + (isStory ? 102 : 85) * scale);
    context.fillStyle = palette.taupe;
    context.font = `650 ${isStory ? 25 * scale : 22 * scale}px ${FONT_FAMILY}`;
    const labelLines = wrappedLines(context, copy.metricLabels[metric.key], cardWidth - 68 * scale, 2);
    labelLines.forEach((line, labelIndex) => context.fillText(line, x + 34 * scale, y + (isStory ? 165 : 140) * scale + labelIndex * 30 * scale));
  });

  context.fillStyle = palette.charcoal;
  context.font = `650 ${22 * scale}px ${FONT_FAMILY}`;
  context.fillText(copy.footer, padding, height - 72 * scale);
  context.fillStyle = palette.roseDeep;
  context.beginPath();
  context.arc(width - padding, height - 80 * scale, 13 * scale, 0, Math.PI * 2);
  context.fill();
}

let brandIconPromise: Promise<HTMLImageElement | null> | null = null;

function loadBrandIcon() {
  if (!brandIconPromise) brandIconPromise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = "/brand-icon.svg";
  });
  return brandIconPromise;
}

async function renderPng(model: ShareCardModel, copy: CanvasCopy) {
  if (typeof document !== "undefined" && "fonts" in document) await document.fonts.ready;
  const brandIcon = await loadBrandIcon();
  const canvas = document.createElement("canvas");
  drawShareCard(canvas, model, copy, brandIcon);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG_UNAVAILABLE")), "image/png");
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function ShareCardStudio({ open, onClose, evidence, dateKeys }: { open: boolean; onClose: () => void; evidence: ShareCardEvidence; dateKeys: readonly string[] }) {
  const { m } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackedOpen = useRef(false);
  const trackedCustomization = useRef(false);
  const [template, setTemplate] = useState<ShareCardTemplate>("weekly");
  const [format, setFormat] = useState<ShareCardFormat>("story");
  const [includeHeadline, setIncludeHeadline] = useState(true);
  const [headline, setHeadline] = useState(() => m("sharing.headline.default"));
  const [selectedMetrics, setSelectedMetrics] = useState<ShareCardMetricKey[]>([...DEFAULT_SHARE_CARD_METRICS]);
  const [status, setStatus] = useState<ShareCardStatus>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [fieldWarning, setFieldWarning] = useState(false);

  const model = useMemo(() => buildShareCardModel(evidence, {
    template,
    format,
    headline: includeHeadline ? headline : null,
    metricKeys: selectedMetrics,
    dateKeys,
  }), [dateKeys, evidence, format, headline, includeHeadline, selectedMetrics, template]);

  const copy = useMemo<CanvasCopy>(() => ({
    kicker: m(TEMPLATE_KEYS[template].kicker),
    footer: m("brand.slogan"),
    metricLabels: {
      completed_tasks: m(METRIC_KEYS.completed_tasks),
      habit_checkins: m(METRIC_KEYS.habit_checkins),
      habit_consistency: m(METRIC_KEYS.habit_consistency),
      intentional_days: m(METRIC_KEYS.intentional_days),
      goal_progress: m(METRIC_KEYS.goal_progress),
    },
  }), [m, template]);

  useEffect(() => {
    if (trackedOpen.current) return;
    trackedOpen.current = true;
    analyticsService.track("share_card_opened", { surface: "progress", view: template, version: 2 });
  }, [template]);

  useEffect(() => {
    let active = true;
    const render = async () => {
      try {
        if ("fonts" in document) await document.fonts.ready;
        const brandIcon = await loadBrandIcon();
        if (active && canvasRef.current) drawShareCard(canvasRef.current, model, copy, brandIcon);
      } catch { /* Export actions surface a generation error if Canvas is unavailable. */ }
    };
    void render();
    return () => { active = false; };
  }, [copy, model]);

  const trackCustomization = (section: "template" | "format" | "metrics" | "headline") => {
    if (trackedCustomization.current) return;
    trackedCustomization.current = true;
    analyticsService.track("share_card_customized", { surface: "progress", view: template, section, version: 2 });
  };

  const chooseTemplate = (nextTemplate: ShareCardTemplate) => {
    trackCustomization("template");
    setTemplate(nextTemplate);
    setSelectedMetrics(TEMPLATE_METRICS[nextTemplate]);
    setFieldWarning(false);
    setStatus(null);
  };

  const toggleMetric = (metric: ShareCardMetricKey) => {
    trackCustomization("metrics");
    setStatus(null);
    if (!selectedMetrics.includes(metric)) {
      setFieldWarning(false);
      setSelectedMetrics((current) => [...current, metric]);
      return;
    }
    if (selectedMetrics.length === 1) {
      setFieldWarning(true);
      return;
    }
    setFieldWarning(false);
    setSelectedMetrics((current) => current.filter((item) => item !== metric));
  };

  const createPng = async () => {
    const blob = await renderPng(model, copy);
    analyticsService.track("share_card_generated", { surface: "progress", view: model.template, channel: model.format, version: 2 });
    analyticsService.track("share_card_created", { surface: "progress", view: model.format, version: 2 });
    return blob;
  };

  const download = async () => {
    setBusy("download");
    setStatus(null);
    try {
      const blob = await createPng();
      downloadBlob(blob, `my-best-version-progreso-${model.format}.png`);
      analyticsService.track("share_exported", { surface: "progress", view: model.template, channel: "download", version: 2 });
      analyticsService.track("share_card_shared", { surface: "progress", channel: "download", view: model.format, version: 2 });
      setStatus("downloaded");
    } catch {
      setStatus("error");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    setStatus(null);
    try {
      const blob = await createPng();
      if (navigator.share && typeof File !== "undefined") {
        const file = new File([blob], `my-best-version-progreso-${model.format}.png`, { type: "image/png" });
        const shareData: ShareData = { title: "My Best Version", text: m("sharing.webShareText"), files: [file] };
        let canShareFiles = !navigator.canShare;
        try {
          if (navigator.canShare) canShareFiles = navigator.canShare(shareData);
        } catch { /* File sharing is optional; the PNG download remains available. */ }
        if (canShareFiles) {
          try {
            analyticsService.track("share_native_started", { surface: "progress", view: model.template, channel: "web_share", version: 2 });
            await navigator.share(shareData);
            analyticsService.track("share_card_shared", { surface: "progress", channel: "web_share", view: model.format, version: 2 });
            setStatus("shared");
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
          }
        }
      }
      downloadBlob(blob, `my-best-version-progreso-${model.format}.png`);
      analyticsService.track("share_exported", { surface: "progress", view: model.template, channel: "fallback_download", version: 2 });
      analyticsService.track("share_card_shared", { surface: "progress", channel: "fallback_download", view: model.format, version: 2 });
      setStatus("fallback");
    } catch {
      setStatus("error");
    } finally {
      setBusy(null);
    }
  };

  return <Modal explicitI18n open={open} title={m("sharing.studio.title")} description={m("sharing.studio.description")} onClose={onClose}>
    <div className="share-card-studio">
      <div className="share-card-controls">
        <fieldset className="share-card-options">
          <legend>{m("sharing.template.legend")}</legend>
          <div className="share-card-template-grid">
            {SHARE_CARD_TEMPLATES.map((item) => <label key={item} className={template === item ? "is-selected" : ""}>
              <input type="radio" name="share-card-template" value={item} aria-label={m(TEMPLATE_KEYS[item].label)} checked={template === item} onChange={() => chooseTemplate(item)} />
              <span><strong>{m(TEMPLATE_KEYS[item].label)}</strong><small>{m(TEMPLATE_KEYS[item].help)}</small></span>
            </label>)}
          </div>
        </fieldset>

        <fieldset className="share-card-options">
          <legend>{m("sharing.format.legend")}</legend>
          <div className="share-card-format-grid">
            {(Object.keys(SHARE_CARD_FORMATS) as ShareCardFormat[]).map((item) => <label key={item} className={format === item ? "is-selected" : ""}>
              <input type="radio" name="share-card-format" value={item} aria-label={m(FORMAT_KEYS[item])} checked={format === item} onChange={() => { trackCustomization("format"); setFormat(item); setStatus(null); }} />
              <span><strong>{m(FORMAT_KEYS[item])}</strong><small>{m("sharing.format.dimensions", SHARE_CARD_FORMATS[item])}</small></span>
            </label>)}
          </div>
        </fieldset>

        <fieldset className="share-card-options">
          <legend>{m("sharing.metrics.legend")}</legend>
          <div className="share-card-metric-grid">
            {SHARE_CARD_METRIC_KEYS.map((metric) => <label key={metric}>
              <input type="checkbox" checked={selectedMetrics.includes(metric)} onChange={() => toggleMetric(metric)} />
              <span>{m(METRIC_KEYS[metric])}</span>
            </label>)}
          </div>
          {fieldWarning ? <small className="form-error" role="alert">{m("sharing.metrics.minimum")}</small> : null}
        </fieldset>

        <div className="share-card-headline-control">
          <label className="share-card-toggle"><input type="checkbox" checked={includeHeadline} onChange={(event) => { trackCustomization("headline"); setIncludeHeadline(event.target.checked); setStatus(null); }} /><span>{m("sharing.headline.include")}</span></label>
          {includeHeadline ? <label className="form-field"><span>{m("sharing.headline.label")}</span><input maxLength={72} value={headline} onChange={(event) => { trackCustomization("headline"); setHeadline(event.target.value); setStatus(null); }} /></label> : null}
          <small>{m("sharing.headline.help")}</small>
        </div>

        <p className="share-card-privacy-note"><LockKeyhole size={18} aria-hidden="true" /> {m("sharing.privacy.note")}</p>
      </div>

      <div className="share-card-preview-panel">
        <div className={`share-card-preview share-card-preview--${format}`}>
          <canvas ref={canvasRef} role="img" aria-label={m("sharing.preview.label", { format: m(FORMAT_KEYS[format]) })}><span>{m("sharing.imageError")}</span></canvas>
        </div>
        <p className="sr-only" aria-live="polite">{m("sharing.preview.summary", { metrics: model.metrics.map((metric) => `${m(METRIC_KEYS[metric.key])}: ${metric.value}${metric.suffix}`).join(", ") })}</p>
        <div className="share-card-actions">
          <Button variant="secondary" onClick={() => void download()} loading={busy === "download"} disabled={Boolean(busy)}><Download size={17} aria-hidden="true" /> {m("sharing.download")}</Button>
          <Button onClick={() => void share()} loading={busy === "share"} disabled={Boolean(busy)}><Share2 size={17} aria-hidden="true" /> {m("sharing.share")}</Button>
        </div>
        {status ? <p className={`share-card-status${status === "error" ? " is-error" : ""}`} role={status === "error" ? "alert" : "status"}><ImageIcon size={17} aria-hidden="true" /> {m(STATUS_KEYS[status])}</p> : null}
      </div>
    </div>
  </Modal>;
}
