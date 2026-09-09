import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function readBlock(selector) {
  const selectorIndex = css.indexOf(selector);
  if (selectorIndex < 0) throw new Error(`No se encontró ${selector} en app/globals.css`);
  const start = css.indexOf("{", selectorIndex);
  let depth = 0;
  for (let index = start; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(start + 1, index);
  }
  throw new Error(`El bloque ${selector} no está cerrado`);
}

const tokenNames = {
  background: "--color-background",
  surface: "--color-surface",
  secondary: "--color-text-secondary-on-background",
  brandSoft: "--color-brand-soft",
  brandText: "--color-brand-text-on-soft",
  successSoft: "--color-success-soft",
  successText: "--color-success-text",
  warningSoft: "--color-warning-soft",
  warningText: "--color-warning-text",
  dangerSoft: "--color-danger-soft",
  dangerText: "--color-danger-text",
  focus: "--color-focus",
};

function readPalette(selector) {
  const block = readBlock(selector);
  return Object.fromEntries(Object.entries(tokenNames).map(([name, token]) => {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = block.match(new RegExp(`${escaped}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`));
    if (!match) throw new Error(`Falta ${token} con color hexadecimal en ${selector}`);
    return [name, match[1].toLowerCase()];
  }));
}

const palettes = {
  light: readPalette(":root"),
  dark: readPalette('html[data-theme="dark"]'),
};

const channel = (value) => {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex) => {
  const values = hex.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16));
  return 0.2126 * channel(values[0]) + 0.7152 * channel(values[1]) + 0.0722 * channel(values[2]);
};

const contrast = (foreground, background) => {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};

const textPairs = [
  ["secondary/background", "secondary", "background", 4.5],
  ["brand/brand-soft", "brandText", "brandSoft", 4.5],
  ["success/success-soft", "successText", "successSoft", 4.5],
  ["warning/warning-soft", "warningText", "warningSoft", 4.5],
  ["danger/danger-soft", "dangerText", "dangerSoft", 4.5],
  ["focus/surface", "focus", "surface", 3],
];

const failures = [];
for (const [mode, palette] of Object.entries(palettes)) {
  for (const [label, foreground, background, minimum] of textPairs) {
    const ratio = contrast(palette[foreground], palette[background]);
    const result = ratio >= minimum ? "PASS" : "FAIL";
    console.log(`${result} ${mode} ${label}: ${ratio.toFixed(2)}:1 (mínimo ${minimum}:1)`);
    if (ratio < minimum) failures.push(`${mode} ${label}`);
  }
}

if (failures.length) {
  console.error(`Contrastes insuficientes: ${failures.join(", ")}`);
  process.exitCode = 1;
}
