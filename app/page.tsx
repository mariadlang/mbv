import type { Metadata } from "next";
import PlannerApp from "./PlannerApp";

const SITE_URL = "https://mybestversion.life";
const SITE_TITLE = "My Best Version | Hábitos, planificación y progreso";
const SITE_DESCRIPTION = "Conecta tus objetivos, hábitos y prioridades en un sistema amable para avanzar con claridad incluso cuando la vida cambia.";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: "My Best Version",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function HomePage() {
  return <PlannerApp />;
}
