import type { Metadata, Viewport } from "next";
import "@/styles/bloom-theme.css";

export const metadata: Metadata = {
  title: "Bloom Exchange — Autonomous Clearinghouse",
  description: "Bloom Exchange: an autonomous inter-agent clearinghouse. A2A v1.0 negotiation in double-blind enclaves, deterministic mandate enforcement, and signed BLOOM-XCH settlement certificates mapped to AP2.",
};

export const viewport: Viewport = { themeColor: "#fdfcfa" };

export default function ExchangeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Lifts the gate's blank veil before first paint when this session has already passed the gate, so refreshes are instant. */}
      <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("bloom-exchange-session"))document.documentElement.dataset.xchSession="1"}catch(e){}` }} />
      {children}
    </>
  );
}
