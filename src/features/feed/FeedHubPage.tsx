"use client";

import { BookHeart, Compass, Lightbulb, Sparkles } from "lucide-react";
import type { UserAccess } from "@/src/domain/access";
import { PremiumFeatureGate } from "@/src/components/access/PremiumFeatureGate";
import { Card, SectionHeading } from "@/src/components/ui/Primitives";

export function FeedHubPage({ access }: { access: UserAccess }) {
  return <div className="page-stack"><SectionHeading eyebrow="PREMIUM" title="Feed Hub" description="Ideas breves y elegidas con intención para acompañar el momento que estás viviendo." /><PremiumFeatureGate access={access} feature="feed_hub"><div className="feed-grid">{[[Compass,"Dirección","Una pregunta para volver a lo que importa."],[Lightbulb,"Pequeño experimento","Prueba una acción durante siete días y observa cómo te sientes."],[BookHeart,"Para guardar","Una lectura breve para tu próxima reflexión."],[Sparkles,"Recordatorio amable","No necesitas avanzar en todo para estar avanzando."]].map(([Icon,title,text]) => <Card key={String(title)}><span><Icon size={21} /></span><p className="eyebrow">INSPIRACIÓN CURADA</p><h2>{String(title)}</h2><p>{String(text)}</p></Card>)}</div></PremiumFeatureGate></div>;
}
