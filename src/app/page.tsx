import { Footer } from "@/components/bloom/footer";
import { Hero } from "@/components/bloom/hero";
import { MorningBrief } from "@/components/bloom/morning-brief";
import { Navbar } from "@/components/bloom/navbar";
import { NightShift } from "@/components/bloom/night-shift";
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
        <PartnerProgram />
        <MorningBrief />
        <NightShift />
        <Waitlist />
      </main>
      <Footer />
    </div>
  );
}
