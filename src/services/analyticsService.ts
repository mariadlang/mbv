import type { ProductEventName } from "@/src/domain/productAnalytics";

export type ProductEvent = ProductEventName | "landing_cta" | "signup_started" | "login_succeeded" | "upgrade_opened" | "premium_gate_viewed";

// Punto único de instrumentación. No incluye correo, nombre, journal ni contenido
// del planner. Un proveedor futuro sólo debe recibir eventos y propiedades no identificables.
export const analyticsService = {
  track(event: ProductEvent, properties: Record<string, string | number | boolean> = {}, dedupeKey?: string) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("mbv:product-event", { detail: { event, properties, dedupeKey } }));
  },
};
