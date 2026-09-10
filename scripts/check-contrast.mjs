import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const globalsPath = fileURLToPath(new URL("../app/globals.css", import.meta.url));

function readCssGraph(filePath, activeImports = new Set()) {
  const normalizedPath = path.normalize(filePath);
  if (activeImports.has(normalizedPath)) throw new Error(`Import CSS circular detectado en ${normalizedPath}`);

  const nextActiveImports = new Set(activeImports).add(normalizedPath);
  const source = readFileSync(normalizedPath, "utf8");
  return source.replace(/@import\s+["']([^"']+)["']\s*;/g, (statement, specifier) => {
    if (!specifier.startsWith(".")) return statement;
    return readCssGraph(path.resolve(path.dirname(normalizedPath), specifier), nextActiveImports);
  });
}

const css = readCssGraph(globalsPath);

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
  buttonPrimaryBackground: "--button-primary-background",
  buttonPrimaryText: "--button-primary-text",
  buttonPrimaryHoverBackground: "--button-primary-hover-background",
  buttonPrimaryHoverText: "--button-primary-hover-text",
  buttonSecondaryBackground: "--button-secondary-background",
  buttonSecondaryText: "--button-secondary-text",
  buttonDangerBackground: "--button-danger-background",
  buttonDangerHoverBackground: "--button-danger-hover-background",
  buttonDangerText: "--button-danger-text",
};

function readCustomProperties(selector) {
  const block = readBlock(selector);
  const declarations = {};
  for (const match of block.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) declarations[match[1]] = match[2].trim();
  return declarations;
}

function resolveHex(token, declarations, chain = []) {
  if (chain.includes(token)) throw new Error(`Alias CSS circular: ${[...chain, token].join(" -> ")}`);
  const value = declarations[token];
  if (!value) throw new Error(`Falta ${token}`);
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();

  const alias = value.match(/^var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*(#[0-9a-fA-F]{6}))?\s*\)$/);
  if (!alias) throw new Error(`${token} no resuelve a un color hexadecimal: ${value}`);
  if (declarations[alias[1]]) return resolveHex(alias[1], declarations, [...chain, token]);
  if (alias[2]) return alias[2].toLowerCase();
  throw new Error(`Falta ${alias[1]}, referenciado por ${token}`);
}

function readPalette(declarations) {
  return Object.fromEntries(Object.entries(tokenNames).map(([name, token]) => [
    name,
    resolveHex(token, declarations),
  ]));
}

const lightTokens = readCustomProperties(":root");
const darkTokens = { ...lightTokens, ...readCustomProperties('html[data-theme="dark"]') };
const palettes = {
  light: readPalette(lightTokens),
  dark: readPalette(darkTokens),
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
  ["button-primary", "buttonPrimaryText", "buttonPrimaryBackground", 4.5],
  ["button-primary-hover", "buttonPrimaryHoverText", "buttonPrimaryHoverBackground", 4.5],
  ["button-secondary", "buttonSecondaryText", "buttonSecondaryBackground", 4.5],
  ["button-danger", "buttonDangerText", "buttonDangerBackground", 4.5],
  ["button-danger-hover", "buttonDangerText", "buttonDangerHoverBackground", 4.5],
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
