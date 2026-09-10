"use client";

import { useEffect, useRef } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { PremiumFeature, UserAccess } from "@/src/domain/access";
import { canAccessFeature } from "@/src/domain/access";
import { Card } from "@/src/components/ui/Primitives";
import { analyticsService } from "@/src/services/analyticsService";
import { useCookieConsent } from "@/src/features/legal/CookieConsent";
import { useI18n } from "@/src/i18n/I18nProvider";

const premiumFeatureMessageKeys = {
  five_year_planning: {
    title: "premium.gate.fiveYear.title",
    description: "premium.gate.fiveYear.description",
  },
  feed_hub: {
    title: "premium.gate.feedHub.title",
    description: "premium.gate.feedHub.description",
  },
} as const;

export function PremiumFeatureGate({ access, feature, children, compact = false }: { access: UserAccess; feature: PremiumFeature; children: React.ReactNode; compact?: boolean }) {
  const allowed = canAccessFeature(access, feature);
  const { m } = useI18n();
  const copyKeys = premiumFeatureMessageKeys[feature];
  const { preferences: cookiePreferences } = useCookieConsent();
  const trackedFeatures = useRef(new Set<PremiumFeature>());
  useEffect(() => {
    if (allowed || !cookiePreferences?.analytics || trackedFeatures.current.has(feature)) return;
    trackedFeatures.current.add(feature);
    analyticsService.track("premium_gate_viewed", { source: feature, version: 2 }, `viewed:${feature}:v2`);
  }, [allowed, cookiePreferences?.analytics, feature]);
  if (allowed) return children;
  return <Card className={`premium-gate ${compact ? "premium-gate--compact" : ""}`} data-i18n-explicit="true">
    <span className="premium-gate__icon"><LockKeyhole size={20} /></span>
    <div><p className="eyebrow"><Sparkles size={14} /> {m("premium.gate.available")}</p><h2>{m(copyKeys.title)}</h2><p>{m(copyKeys.description)}</p></div>
    <Link className="button button--primary" to="/upgrade">{m("premium.gate.cta")}</Link>
  </Card>;
}
