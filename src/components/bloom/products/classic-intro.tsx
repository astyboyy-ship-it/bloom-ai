"use client";

import { motion } from "framer-motion";
import { HOLD_MS, StudioIntro, type StudioMeta } from "../studio/frame";
import { useIntro } from "./use-intro";

/**
 * The original engine intro (StudioIntro: the painting under the 3D WebGL rose cascade), exactly as in
 * deployment 97eZwEztkMe6166kWhwP9t4nfR57, played over the product on its own route. It holds and lifts
 * on its own timing; a click or any skip key fades it out in 0.3s instead.
 */
export function ClassicIntro({ meta }: { meta: StudioMeta }) {
  const intro = useIntro(HOLD_MS);
  if (!intro.show) return null;
  return (
    <motion.div initial={false} animate={{ opacity: intro.fast ? 0 : 1 }} transition={{ duration: 0.3 }} onAnimationComplete={() => intro.fast && intro.exited()}>
      <StudioIntro meta={meta} leaving={intro.leaving && !intro.fast} onSkip={intro.skip} onExited={intro.exited} />
    </motion.div>
  );
}

// Each engine's intro settings, verbatim from that deployment's studios.
export const MARKETING_INTRO: StudioMeta = {
  index: "01",
  name: "Aware Marketing · Deal Synthesizer",
  kicker: "Aware Marketing",
  tagline: "brand deals negotiated while you sleep",
  painting: "temeraire",
  palette: "solar",
  accent: "#ffc36b",
};

export const INFRA_INTRO: StudioMeta = {
  index: "02",
  name: "Aware Infrastructure Architect · Shift Operator",
  kicker: "Infrastructure Architect",
  tagline: "zero-waste routing and overnight operations",
  painting: "wanderer",
  palette: "frost",
  accent: "#c9d6e6",
};

export const FOUNDRY_INTRO: StudioMeta = {
  index: "03",
  name: "Aware Shadow Workforce · Solution Foundry",
  kicker: "Shadow Workforce",
  tagline: "build the fix instead of sending the pitch",
  painting: "consummation",
  palette: "emerald",
  accent: "#3fd29a",
};
