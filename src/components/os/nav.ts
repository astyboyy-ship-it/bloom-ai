import { Activity, Boxes, Compass, Database, Globe2, Home, Network, Presentation, Settings, ShieldAlert, Terminal, Workflow, type LucideIcon } from "lucide-react";

/** The Operating Desk's twelve pillars, in navigation order. */
export const OS_NAV: { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean }[] = [
  { href: "/desk", label: "Home", icon: Home, match: (p) => p === "/desk" },
  { href: "/desk/explore", label: "Explore", icon: Compass, match: (p) => p.startsWith("/desk/explore") },
  { href: "/desk/architectures", label: "Architectures", icon: Boxes, match: (p) => p.startsWith("/desk/architectures") },
  { href: "/desk/engines", label: "Engine Network", icon: Network, match: (p) => p.startsWith("/desk/engines") },
  { href: "/desk/global-pulse", label: "Global Pulse", icon: Globe2, match: (p) => p.startsWith("/desk/global-pulse") },
  { href: "/desk/builder", label: "Pipeline Builder", icon: Workflow, match: (p) => p.startsWith("/desk/builder") || p.startsWith("/desk/sandbox") },
  { href: "/desk/assistant", label: "Local Assistant", icon: Terminal, match: (p) => p.startsWith("/desk/assistant") },
  { href: "/desk/demo", label: "Demo Mode", icon: Presentation, match: (p) => p.startsWith("/desk/demo") },
  { href: "/desk/threat-matrix", label: "Threat Matrix", icon: ShieldAlert, match: (p) => p.startsWith("/desk/threat-matrix") },
  { href: "/desk/vector-memory", label: "Vector Memory", icon: Database, match: (p) => p.startsWith("/desk/vector-memory") },
  { href: "/desk/audit", label: "Audit & Compliance", icon: Activity, match: (p) => p.startsWith("/desk/audit") || p.startsWith("/desk/diagnostics") },
  { href: "/desk/settings", label: "App Settings", icon: Settings, match: (p) => p.startsWith("/desk/settings") },
];

