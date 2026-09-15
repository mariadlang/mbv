import type { MetadataRoute } from "next";

const OFFICIAL_ORIGIN = "https://mybestversion.life";
const LAST_UPDATED = new Date("2026-09-15T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ["/", "weekly", 1],
    ["/trial", "weekly", 0.8],
    ["/privacy", "monthly", 0.8],
    ["/terms", "monthly", 0.7],
    ["/data-policy", "monthly", 0.7],
    ["/legal", "monthly", 0.7],
    ["/cookies", "monthly", 0.6],
    ["/data-deletion", "monthly", 0.7],
    ["/legal-notices", "monthly", 0.5],
    ["/payments", "monthly", 0.5],
    ["/retract", "monthly", 0.5],
    ["/ai-privacy", "monthly", 0.5],
    ["/provider-info", "monthly", 0.5],
    ["/security", "monthly", 0.6],
    ["/pqr", "monthly", 0.6],
  ] as const;

  return routes.map(([path, changeFrequency, priority]) => ({
    url: `${OFFICIAL_ORIGIN}${path}`,
    lastModified: LAST_UPDATED,
    changeFrequency,
    priority,
  }));
}
