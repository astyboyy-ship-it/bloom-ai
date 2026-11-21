import { DynamicShiftTopology } from "@/components/bloom/dynamic-shift-topology";
import { ExchangeSection } from "@/components/bloom/exchange-section";
import { ScoutSection } from "@/components/bloom/scout-section";
import { Footer } from "@/components/bloom/footer";
import { Hero } from "@/components/bloom/hero";
import { Navbar } from "@/components/bloom/navbar";
import { PartnerProgram } from "@/components/bloom/partner-program";
import { ProductTopologyGallery } from "@/components/bloom/product-topology-gallery";
import { Engines } from "@/components/bloom/engines/engines";
import { Waitlist } from "@/components/bloom/waitlist";

export default function Home() {
  return (
    // `isolate` gives the page its own stacking context so negative-z painting layers paint above its background.
    <div className="bloom relative isolate min-h-dvh overflow-x-clip">
      <div className="bg-noise pointer-events-none fixed inset-0 z-[60]" />
      <Navbar />
      <main>
        <Hero />
        <Engines />
        <ProductTopologyGallery />
        <ExchangeSection />
        <ScoutSection />
        <DynamicShiftTopology />
        <PartnerProgram />
        <Waitlist />
      </main>
      <Footer />
    </div>
  );
}
