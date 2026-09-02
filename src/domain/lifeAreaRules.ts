import type { LifeArea } from "./planner";

export const defaultLifeAreaNames = [
  "Salud y bienestar",
  "Finanzas",
  "Carrera profesional o trabajo",
  "Desarrollo personal / Crecimiento",
  "Familia y amigos",
  "Amor / Pareja",
  "Diversión y ocio",
  "Ambiente físico / Entorno",
] as const;

const colors = ["sage", "taupe", "rose", "sage", "blush", "rose", "taupe", "charcoal"] as const;
const normalize = (value: string) => value.trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
const aliases = new Map<string, (typeof defaultLifeAreaNames)[number]>([
  ["carrera", "Carrera profesional o trabajo"], ["carrera / profesional", "Carrera profesional o trabajo"],
  ["crecimiento", "Desarrollo personal / Crecimiento"], ["crecimiento personal", "Desarrollo personal / Crecimiento"],
  ["relaciones", "Familia y amigos"], ["hogar", "Ambiente físico / Entorno"],
  ["experiencias", "Diversión y ocio"],
]);

export function mergeDefaultLifeAreas(current: LifeArea[], createId: () => string, timestamp: string): LifeArea[] {
  const canonical = current.map((area) => {
    const canonicalName = aliases.get(normalize(area.name));
    return canonicalName ? { ...area, name: canonicalName, updatedAt: timestamp } : area;
  });
  const names = new Set(canonical.map((area) => normalize(area.name)));
  const missing = defaultLifeAreaNames.filter((name) => !names.has(normalize(name)));
  if (!missing.length && canonical.every((area, index) => area === current[index])) return current;

  const merged = [...canonical, ...missing.map((name) => {
    const defaultIndex = defaultLifeAreaNames.indexOf(name);
    return {
      id: createId(), name, color: colors[defaultIndex], order: canonical.length + defaultIndex,
      active: true, currentScore: 6, desiredScore: 8, vision: "", custom: false,
      createdAt: timestamp, updatedAt: timestamp,
    } satisfies LifeArea;
  })];
  return merged.toSorted((left, right) => {
    const leftIndex = defaultLifeAreaNames.findIndex((name) => normalize(name) === normalize(left.name));
    const rightIndex = defaultLifeAreaNames.findIndex((name) => normalize(name) === normalize(right.name));
    if (leftIndex < 0 && rightIndex < 0) return left.order - right.order;
    if (leftIndex < 0) return 1;
    if (rightIndex < 0) return -1;
    return leftIndex - rightIndex;
  }).map((area, order) => ({ ...area, order }));
}
