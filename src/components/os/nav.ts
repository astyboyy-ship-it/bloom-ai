import { Activity, Boxes, Gavel, Compass, Database, Globe2, Handshake, Home, Network, Presentation, Settings, ShieldAlert, Terminal, Workflow, type LucideIcon } from "lucide-react";

import type { NavGroupKey, NavHref } from "./os-copy";

export type NavItem = { href: NavHref; icon: LucideIcon; match: (path: string) => boolean };

/** The Operating Desk's fourteen pillars, in navigation order. Labels live in os-copy.ts, per language. */
export const OS_NAV: NavItem[] = [
  { href: "/desk", icon: Home, match: (p) => p === "/desk" },
  { href: "/desk/shadow-board", icon: Gavel, match: (p) => p.startsWith("/desk/shadow-board") },
  { href: "/desk/assistant", icon: Terminal, match: (p) => p.startsWith("/desk/assistant") },
  { href: "/desk/demo", icon: Presentation, match: (p) => p.startsWith("/desk/demo") },
  { href: "/desk/architectures", icon: Boxes, match: (p) => p.startsWith("/desk/architectures") },
  { href: "/desk/engines", icon: Network, match: (p) => p.startsWith("/desk/engines") },
  { href: "/desk/builder", icon: Workflow, match: (p) => p.startsWith("/desk/builder") || p.startsWith("/desk/sandbox") },
  { href: "/desk/exchange-scout", icon: Handshake, match: (p) => p.startsWith("/desk/exchange-scout") },
  { href: "/desk/global-pulse", icon: Globe2, match: (p) => p.startsWith("/desk/global-pulse") },
  { href: "/desk/threat-matrix", icon: ShieldAlert, match: (p) => p.startsWith("/desk/threat-matrix") },
  { href: "/desk/vector-memory", icon: Database, match: (p) => p.startsWith("/desk/vector-memory") },
  { href: "/desk/explore", icon: Compass, match: (p) => p.startsWith("/desk/explore") },
  { href: "/desk/audit", icon: Activity, match: (p) => p.startsWith("/desk/audit") || p.startsWith("/desk/diagnostics") },
  { href: "/desk/settings", icon: Settings, match: (p) => p.startsWith("/desk/settings") },
];

const byHref = (h: NavHref) => OS_NAV.find((n) => n.href === h)!;

/** The header groups the pillars into four menus so the nav never overflows. */
export const NAV_GROUPS: { label: NavGroupKey; items: NavItem[] }[] = [
  { label: "Command", items: (["/desk", "/desk/shadow-board", "/desk/assistant", "/desk/demo"] as const).map(byHref) },
  { label: "Products", items: (["/desk/architectures", "/desk/engines", "/desk/builder", "/desk/exchange-scout"] as const).map(byHref) },
  { label: "Pulse & Threats", items: (["/desk/global-pulse", "/desk/threat-matrix", "/desk/vector-memory"] as const).map(byHref) },
  { label: "System", items: (["/desk/explore", "/desk/audit", "/desk/settings"] as const).map(byHref) },
];
