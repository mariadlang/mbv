"use client";

import { LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { PremiumFeature, UserAccess } from "@/src/domain/access";
import { canAccessFeature } from "@/src/domain/access";
import { Card } from "@/src/components/ui/Primitives";

export function PremiumFeatureGate({ access, feature, children, compact = false }: { access: UserAccess; feature: PremiumFeature; children: React.ReactNode; compact?: boolean }) {
  if (canAccessFeature(access, feature)) return children;
  return <Card className={`premium-gate ${compact ? "premium-gate--compact" : ""}`}>
    <span className="premium-gate__icon"><LockKeyhole size={20} /></span>
    <div><p className="eyebrow"><Sparkles size={14} /> Disponible con Premium</p><h2>{feature === "feed_hub" ? "Feed Hub" : "Planificación a 5 años"}</h2><p>{feature === "feed_hub" ? "Un espacio de inspiración curada para acompañar tu proceso." : "Amplía tu horizonte cuando quieras mirar más allá de tus próximos tres años."}</p></div>
    <Link className="button button--primary" to="/upgrade">Ver Premium</Link>
  </Card>;
}
