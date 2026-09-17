import type { Metadata, Viewport } from "next";
import { Inter, Nunito_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { BRAND_NAME, BRAND_PROMISE, BRAND_SLOGAN } from "@/src/lib/brand";

const SITE_URL = "https://mybestversion.life";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-sans",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: false,
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  preload: false,
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F4EF" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1F23" },
  ],
};

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: `${BRAND_NAME} · ${BRAND_SLOGAN}`,
    description: BRAND_PROMISE,
    icons: {
      icon: "/brand-icon.svg",
      shortcut: "/brand-icon.svg",
    },
    openGraph: {
      title: `${BRAND_NAME} · ${BRAND_SLOGAN}`,
      description: BRAND_PROMISE,
      type: "website",
      siteName: BRAND_NAME,
    },
    twitter: {
      card: "summary_large_image",
      title: `${BRAND_NAME} · ${BRAND_SLOGAN}`,
      description: BRAND_PROMISE,
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${nunitoSans.variable} ${inter.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
