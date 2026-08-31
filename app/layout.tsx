import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { BRAND_NAME, BRAND_SLOGAN } from "@/src/lib/brand";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-sans",
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F4EF" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1F23" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: `${BRAND_NAME} · ${BRAND_SLOGAN}`,
    description: "Organización para el desarrollo personal: convierte tu visión en planes, hábitos y acciones sostenibles.",
    icons: {
      icon: "/brand-icon.svg",
      shortcut: "/brand-icon.svg",
    },
    openGraph: {
      title: `${BRAND_NAME} · ${BRAND_SLOGAN}`,
      description: "Diseña la vida que quieres vivir con planeación en cascada, hábitos, bienestar y finanzas.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${BRAND_NAME} · ${BRAND_SLOGAN}`,
      description: "Diseña la vida que quieres vivir con planeación en cascada, hábitos, bienestar y finanzas.",
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={nunitoSans.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
