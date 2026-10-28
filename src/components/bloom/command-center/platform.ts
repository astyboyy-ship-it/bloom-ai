import { AtSign, Briefcase, Mail, MessageCircle, MessagesSquare, Music2, Webhook, type LucideIcon } from "lucide-react";
import type { IntentTier } from "@/lib/intentpulse/types";
import type { Platform, Route } from "@/lib/intentpulse/signal";

export const PLATFORM_ICON: Record<Platform, LucideIcon> = {
  instagram: MessageCircle,
  x: AtSign,
  tiktok: Music2,
  reddit: MessagesSquare,
  linkedin: Briefcase,
  email: Mail,
  webhook: Webhook,
};

export const TIER_PILL: Record<IntentTier, string> = {
  VIP: "border-[#f3d48f]/60 bg-[#f3d48f]/10 text-[#f7e2a8]",
  QUALIFIED: "border-sun/50 bg-sun/10 text-sun",
  NURTURE: "border-dusk/40 bg-dusk/10 text-dusk",
};

export const TIER_COLOR: Record<IntentTier, string> = { VIP: "#f3d48f", QUALIFIED: "#ffbd6e", NURTURE: "#b49bff" };
export const QUARANTINE_COLOR = "#ff9b78";

export const ROUTE_LABEL: Record<Route, string> = {
  vip: "VIP calendar booking",
  outreach: "Custom outreach",
  nurture: "Nurture sync",
  quarantine: "Quarantined",
};

const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const compact = (n: number) => compactFmt.format(n);
export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
export const clock = (d = new Date()) => d.toTimeString().slice(0, 8);

export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
