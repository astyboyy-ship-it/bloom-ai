import { Activity, Boxes, Gavel, Compass, Database, Globe2, Home, Network, Presentation, Settings, ShieldAlert, Terminal, Workflow, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; name: string; icon: LucideIcon; match: (path: string) => boolean };

/** The Operating Desk's thirteen pillars, in navigation order. `name` is the short form the assistant matches on. */
export const OS_NAV: NavItem[] = [
  { href: "/desk", label: "Home", name: "Home", icon: Home, match: (p) => p === "/desk" },
  { href: "/desk/shadow-board", label: "Shadow Board", name: "Shadow Board", icon: Gavel, match: (p) => p.startsWith("/desk/shadow-board") },
  { href: "/desk/assistant", label: "Local Assistant", name: "Local Assistant", icon: Terminal, match: (p) => p.startsWith("/desk/assistant") },
  { href: "/desk/demo", label: "Demo Deck", name: "Demo Deck", icon: Presentation, match: (p) => p.startsWith("/desk/demo") },
  { href: "/desk/architectures", label: "Architectures (10 Stacks)", name: "Architectures", icon: Boxes, match: (p) => p.startsWith("/desk/architectures") },
  { href: "/desk/engines", label: "Engine Network (8 Engines)", name: "Engine Network", icon: Network, match: (p) => p.startsWith("/desk/engines") },
  { href: "/desk/builder", label: "Pipeline Builder", name: "Pipeline Builder", icon: Workflow, match: (p) => p.startsWith("/desk/builder") || p.startsWith("/desk/sandbox") },
  { href: "/desk/global-pulse", label: "Global Pulse", name: "Global Pulse", icon: Globe2, match: (p) => p.startsWith("/desk/global-pulse") },
  { href: "/desk/threat-matrix", label: "Threat Matrix", name: "Threat Matrix", icon: ShieldAlert, match: (p) => p.startsWith("/desk/threat-matrix") },
  { href: "/desk/vector-memory", label: "Vector Memory Time-Travel", name: "Vector Memory", icon: Database, match: (p) => p.startsWith("/desk/vector-memory") },
  { href: "/desk/explore", label: "Explore", name: "Explore", icon: Compass, match: (p) => p.startsWith("/desk/explore") },
  { href: "/desk/audit", label: "Audit & Certificates", name: "Audit", icon: Activity, match: (p) => p.startsWith("/desk/audit") || p.startsWith("/desk/diagnostics") },
  { href: "/desk/settings", label: "App Settings", name: "App Settings", icon: Settings, match: (p) => p.startsWith("/desk/settings") },
];

const byHref = (h: string) => OS_NAV.find((n) => n.href === h)!;

/** The header groups the pillars into four menus so the nav never overflows. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Command", items: ["/desk", "/desk/shadow-board", "/desk/assistant", "/desk/demo"].map(byHref) },
  { label: "Products", items: ["/desk/architectures", "/desk/engines", "/desk/builder"].map(byHref) },
  { label: "Pulse & Threats", items: ["/desk/global-pulse", "/desk/threat-matrix", "/desk/vector-memory"].map(byHref) },
  { label: "System", items: ["/desk/explore", "/desk/audit", "/desk/settings"].map(byHref) },
];
