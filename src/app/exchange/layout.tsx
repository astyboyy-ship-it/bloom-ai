import type { Metadata, Viewport } from "next";
import "@/styles/bloom-theme.css";

export const metadata: Metadata = {
  title: "Bloom Exchange — Autonomous Clearinghouse",
  description: "Bloom Exchange: an autonomous inter-agent clearinghouse. A2A v1.0 negotiation in double-blind enclaves, deterministic mandate enforcement, and signed BLOOM-XCH settlement certificates mapped to AP2.",
};

export const viewport: Viewport = { themeColor: "#0c0709" };

export default function ExchangeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hides the boot overlay before first paint when this session has already seen it, so refreshes are instant. */}
      <script dangerouslySetInnerHTML={{ __html: `try{if(sessionStorage.getItem("bloom-exchange-booted")==="1")document.documentElement.dataset.xchBooted="1"}catch(e){}` }} />
      {children}
    </>
  );
}
