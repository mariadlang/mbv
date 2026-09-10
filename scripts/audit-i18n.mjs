import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const legacyKeyBudget = 803;
const allowedLegacyCallers = new Set([
  "app/PlannerApp.tsx",
  "src/features/tutorial/GuidedTutorial.tsx",
]);
const accidentalTerms = [
  /\bWeekly Reset\b/u,
  /\bDream Life\b/u,
  /\bMejor racha\b/u,
  /\bTu primera racha empieza\b/u,
];
const failures = [];
const warnings = [];

function source(path) {
  return readFileSync(join(root, path), "utf8");
}

function catalogObjects(path, languagePrefix) {
  const text = source(path);
  const objects = [];
  const exportPattern = new RegExp(`export const (${languagePrefix}[A-Za-z0-9]*Messages)\\s*=\\s*\\{`, "gu");
  for (const match of text.matchAll(exportPattern)) {
    const start = (match.index ?? 0) + match[0].length;
    const end = text.indexOf("} as const", start);
    if (end < 0) {
      failures.push(`${path}: no se pudo cerrar el catálogo ${match[1]}.`);
      continue;
    }
    const keys = [...text.slice(start, end).matchAll(/^\s*"([^"]+)"\s*:/gmu)].map((keyMatch) => keyMatch[1]);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    if (duplicates.length) failures.push(`${path}: claves duplicadas en ${match[1]}: ${[...new Set(duplicates)].join(", ")}`);
    for (const key of keys) {
      if (!/^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/.test(key)) failures.push(`${path}: clave inestable o inválida: ${key}`);
    }
    objects.push({ exportName: match[1], keys, path });
  }
  if (!objects.length) {
    failures.push(`${path}: no se pudo localizar ningún catálogo ${languagePrefix.toUpperCase()}.`);
  }
  return objects;
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") return [];
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const featureDirectory = join(root, "src/i18n/messages/features");
const featureCatalogFiles = existsSync(featureDirectory)
  ? walk(featureDirectory)
      .filter((path) => path.endsWith(".ts"))
      .map((path) => relative(root, path).replaceAll("\\", "/"))
  : [];
const esCatalogs = ["src/i18n/messages/es.ts", ...featureCatalogFiles].flatMap((path) => catalogObjects(path, "es"));
const enCatalogs = ["src/i18n/messages/en.ts", ...featureCatalogFiles].flatMap((path) => catalogObjects(path, "en"));
const esKeys = esCatalogs.flatMap((catalog) => catalog.keys);
const enKeys = enCatalogs.flatMap((catalog) => catalog.keys);
const duplicateStableKeys = (keys) => keys.filter((key, index) => keys.indexOf(key) !== index);
const duplicateEsKeys = [...new Set(duplicateStableKeys(esKeys))];
const duplicateEnKeys = [...new Set(duplicateStableKeys(enKeys))];
if (duplicateEsKeys.length) failures.push(`Catálogos ES: claves duplicadas entre archivos: ${duplicateEsKeys.join(", ")}`);
if (duplicateEnKeys.length) failures.push(`Catálogos EN: claves duplicadas entre archivos: ${duplicateEnKeys.join(", ")}`);
const esSet = new Set(esKeys);
const enSet = new Set(enKeys);
const missingInEnglish = esKeys.filter((key) => !enSet.has(key));
const missingInSpanish = enKeys.filter((key) => !esSet.has(key));
if (missingInEnglish.length) failures.push(`Claves ausentes en inglés: ${missingInEnglish.join(", ")}`);
if (missingInSpanish.length) failures.push(`Claves ausentes en español: ${missingInSpanish.join(", ")}`);

const legacyText = source("src/i18n/translations.ts");
const legacyStart = legacyText.indexOf("const en:");
const legacyEnd = legacyText.indexOf("\n};", legacyStart);
const legacyKeys = [...legacyText.slice(legacyStart, legacyEnd).matchAll(/^\s*"([^"]+)"\s*:/gmu)].map((match) => match[1]);
const duplicateLegacyKeys = legacyKeys.filter((key, index) => legacyKeys.indexOf(key) !== index);
if (duplicateLegacyKeys.length) failures.push(`Catálogo legacy: claves exactas duplicadas: ${[...new Set(duplicateLegacyKeys)].join(", ")}`);
if (legacyKeys.length > legacyKeyBudget) failures.push(`La deuda legacy creció: ${legacyKeys.length} entradas; máximo permitido ${legacyKeyBudget}. Usa claves estables.`);
if (legacyKeys.length < legacyKeyBudget) warnings.push(`La deuda legacy bajó a ${legacyKeys.length}; actualiza legacyKeyBudget después de validar la migración.`);

const codeFiles = [join(root, "app"), join(root, "src")]
  .filter((path) => statSync(path).isDirectory())
  .flatMap(walk)
  .filter((path) => /\.(?:ts|tsx)$/.test(path) && !/\.test\.(?:ts|tsx)$/.test(path));

for (const absolute of codeFiles) {
  const path = relative(root, absolute).replaceAll("\\", "/");
  if (path === "src/i18n/translations.ts" || path.startsWith("src/i18n/messages/")) continue;
  const text = readFileSync(absolute, "utf8");
  if (/\bt\(\s*["'`]/u.test(text) && !allowedLegacyCallers.has(path)) failures.push(`${path}: nueva llamada al traductor legacy t("…"). Usa m("clave.estable").`);
  for (const match of text.matchAll(/\bm\(\s*["'`]([^"'`]+)["'`]/gu)) {
    if (!esSet.has(match[1])) failures.push(`${path}: la clave usada por m() no existe en los catálogos: ${match[1]}`);
  }
  for (const term of accidentalTerms) {
    const match = text.match(term);
    if (match) failures.push(`${path}: término no canónico en UI española: ${match[0]}`);
  }
}

const literalUsage = new Set(
  codeFiles.flatMap((absolute) => {
    const path = relative(root, absolute).replaceAll("\\", "/");
    if (path.startsWith("src/i18n/messages/")) return [];
    const text = readFileSync(absolute, "utf8");
    return [...text.matchAll(/["'`]([a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+)["'`]/gu)]
      .map((match) => match[1])
      .filter((key) => esSet.has(key));
  }),
);
const unusedStableKeys = esKeys.filter((key) => !literalUsage.has(key));
if (unusedStableKeys.length) {
  const sample = unusedStableKeys.slice(0, 20).join(", ");
  warnings.push(`${unusedStableKeys.length} claves estables no tienen un uso literal detectable${sample ? ` (muestra: ${sample})` : ""}. Revisa claves dinámicas antes de eliminarlas.`);
}

console.log(`i18n: ${esKeys.length} claves estables ES/EN; ${legacyKeys.length}/${legacyKeyBudget} entradas legacy.`);
for (const warning of warnings) console.warn(`ADVERTENCIA: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`ERROR: ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Auditoría i18n superada: paridad, duplicados y deuda nueva verificados.");
}
