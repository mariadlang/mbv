import {
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  Dumbbell,
  Eye,
  House,
  Leaf,
  NotebookPen,
  Repeat2,
  Sparkles,
  Target,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { LandingIconName } from "@/src/features/landing/landingContent";

const iconByName: Record<LandingIconName, LucideIcon> = {
  leaf: Leaf,
  home: House,
  target: Target,
  chart: ChartNoAxesCombined,
  eye: Eye,
  calendar: CalendarDays,
  repeat: Repeat2,
  check: Check,
  journal: NotebookPen,
  wallet: WalletCards,
  fitness: Dumbbell,
  sparkles: Sparkles,
  brain: BrainCircuit,
};

export function LandingIcon({ name, size = 24 }: { name: LandingIconName; size?: number }) {
  const Icon = iconByName[name];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.8} />;
}
