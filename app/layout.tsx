import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-interface",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF6F2" },
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
    title: "My Best Version · Planea, acciona, logra",
    description: "Un planner consciente para convertir tu visión en planes, hábitos y acciones sostenibles.",
    icons: {
      icon: "/favicon.png",
      shortcut: "/favicon.png",
    },
    openGraph: {
      title: "My Best Version · Planea, acciona, logra",
      description: "Diseña la vida que quieres vivir con planeación en cascada, hábitos, bienestar y finanzas.",
      type: "website",
      images: [{ url: "/og-v2.jpg", width: 1728, height: 910, alt: "My Best Version · Planea, acciona, logra" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "My Best Version · Planea, acciona, logra",
      description: "Diseña la vida que quieres vivir con planeación en cascada, hábitos, bienestar y finanzas.",
      images: ["/og-v2.jpg"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${playfair.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
