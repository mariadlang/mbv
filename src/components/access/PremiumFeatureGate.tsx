"use client";

import { useEffect, useRef } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { PremiumFeature, UserAccess } from "@/src/domain/access";
import { canAccessFeature, PREMIUM_FEATURE_COPY } from "@/src/domain/access";
import { Card } from "@/src/components/ui/Primitives";
import { analyticsService } from "@/src/services/analyticsService";
import { CTA } from "@/src/lib/cta";
import { useCookieConsent } from "@/src/features/legal/CookieConsent";

export function PremiumFeatureGate({ access, feature, children, compact = false }: { access: UserAccess; feature: PremiumFeature; children: React.ReactNode; compact?: boolean }) {
  const allowed = canAccessFeature(access, feature);
  const copy = PREMIUM_FEATURE_COPY[feature];
  const { preferences: cookiePreferences } = useCookieConsent();
  const trackedFeatures = useRef(new Set<PremiumFeature>());
  useEffect(() => {
    if (allowed || !cookiePreferences?.analytics || trackedFeatures.current.has(feature)) return;
    trackedFeatures.current.add(feature);
    analyticsService.track("premium_gate_viewed", { source: feature, version: 2 }, `viewed:${feature}:v2`);
  }, [allowed, cookiePreferences?.analytics, feature]);
  if (allowed) return children;
  return <Card className={`premium-gate ${compact ? "premium-gate--compact" : ""}`}>
    <span className="premium-gate__icon"><LockKeyhole size={20} /></span>
    <div><p className="eyebrow"><Sparkles size={14} /> Disponible con Premium</p><h2>{copy.title}</h2><p>{copy.description}</p></div>
    <Link className="button button--primary" to="/upgrade">{CTA.paywall.label}</Link>
  </Card>;
}
