import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-interface",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: "My Best Version Planner",
    description: "Un planner consciente para conectar metas, hábitos, acciones y reflexión sin culpa.",
    icons: {
      icon: "/favicon.png",
      shortcut: "/favicon.png",
    },
    openGraph: {
      title: "My Best Version Planner",
      description: "Diseña la vida que quieres vivir. Progreso amable, un paso a la vez.",
      type: "website",
      images: [{ url: "/og-reference.png", width: 1200, height: 630, alt: "My Best Version Planner" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "My Best Version Planner",
      description: "Diseña la vida que quieres vivir. Progreso amable, un paso a la vez.",
      images: ["/og-reference.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${cormorant.variable} ${dmSans.variable}`}>{children}</body>
    </html>
  );
}
