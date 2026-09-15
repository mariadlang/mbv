import type { MetadataRoute } from "next";

const OFFICIAL_ORIGIN = "https://mybestversion.life";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/app/", "/admin", "/platform"],
    },
    host: OFFICIAL_ORIGIN,
    sitemap: `${OFFICIAL_ORIGIN}/sitemap.xml`,
  };
}
