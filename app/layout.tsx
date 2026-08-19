import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

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
    title: "My Best Version · Life, but more you.",
    description: "Organización para el desarrollo personal: convierte tu visión en planes, hábitos y acciones sostenibles.",
    icons: {
      icon: "/favicon.png",
      shortcut: "/favicon.png",
    },
    openGraph: {
      title: "My Best Version · Life, but more you.",
      description: "Diseña la vida que quieres vivir con planeación en cascada, hábitos, bienestar y finanzas.",
      type: "website",
      images: [{ url: "/og-v2.jpg", width: 1728, height: 910, alt: "My Best Version · Life, but more you." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "My Best Version · Life, but more you.",
      description: "Diseña la vida que quieres vivir con planeación en cascada, hábitos, bienestar y finanzas.",
      images: ["/og-v2.jpg"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
