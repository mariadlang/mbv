import type { ClientProductEventName } from "@/src/domain/productAnalytics";

type TrackedCta = {
  label: string;
  event: ClientProductEventName;
};

export const CTA = {
  acquisition: { label: "Comienza tu prueba gratis", event: "landing_primary_cta_clicked" },
  signupForm: { label: "Crear mi cuenta", event: "signup_started" },
  verification: { label: "Ir a verificar mi correo" },
  firstAccess: { label: "Crear mi primera acción", event: "onboarding_started" },
  authenticated: { label: "Ir a mi espacio" },
  login: { label: "Iniciar sesión" },
  paywall: { label: "Desbloquear Premium", event: "upgrade_opened" },
  checkout: { label: "Continuar en Mercado Pago", event: "checkout_started" },
  recovery: { label: "Volver a mi espacio" },
} as const satisfies Record<string, { label: string; event?: ClientProductEventName }>;

export type AcquisitionCta = TrackedCta & { label: typeof CTA.acquisition.label };
