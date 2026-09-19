import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { PrivacyPolicyContent } from "@/src/features/legal/PrivacyPolicyContent";

const OFFICIAL_ORIGIN = "https://mybestversion.life";

export const metadata: Metadata = {
  title: "Política de Privacidad | My Best Version",
  description: "Cómo My Best Version recopila, usa, protege, comparte, conserva y elimina datos, incluida la integración opcional con Google Calendar.",
  alternates: { canonical: `${OFFICIAL_ORIGIN}/privacy` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Política de Privacidad de My Best Version",
    description: "Información clara sobre privacidad, seguridad, eliminación de datos y el uso limitado de Google Calendar.",
    url: `${OFFICIAL_ORIGIN}/privacy`,
    type: "website",
    siteName: "My Best Version",
  },
};

export default function PrivacyRoute() {
  return <main className="public-frame">
    <header>
      <Link href="/" aria-label="Ir al inicio de My Best Version"><BrandMark /></Link>
      <nav aria-label="Navegación pública">
        <Link href="/trial">Beneficio Premium</Link>
        <Link href="/legal">Centro Legal</Link>
        <Link href="/privacy" aria-current="page">Privacidad</Link>
        <Link href="/terms">Términos</Link>
        <Link href="/login">Iniciar sesión</Link>
      </nav>
    </header>
    <PrivacyPolicyContent />
    <footer className="public-legal-footer">
      <span>© 2026 My Best Version</span>
      <Link href="/terms">Términos</Link>
      <Link href="/data-policy">Tratamiento de datos</Link>
      <Link href="/privacy">Privacidad</Link>
      <Link href="/cookies">Cookies</Link>
      <Link href="/pqr">PQR y privacidad</Link>
    </footer>
  </main>;
}
