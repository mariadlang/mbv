import { launchJson } from "@/src/server/launch/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Compatibilidad segura para enlaces de una versión no publicada del flujo.
// La waitlist vigente no envía tokens ni requiere una activación de equipo.
export async function POST() {
  return launchJson({ error: "CONFIRMATION_NOT_USED" }, 410);
}
