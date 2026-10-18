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
/**
 * All supported snapshots have a lifeAreas collection. Only an empty collection
 * needs initialization; names, custom flags and counts are not migration markers.
 * Existing records (including legacy names or earlier duplicates) are user data.
 */
export function initializeLifeAreasIfEmpty(current: LifeArea[], createId: () => string, timestamp: string): LifeArea[] {
  if (current.length) return current;
  return defaultLifeAreaNames.map((name, order) => ({
    id: createId(), name, color: colors[order], order,
    active: true, vision: "", custom: false,
    createdAt: timestamp, updatedAt: timestamp,
  }));
}
