import type { Metadata } from "next";
import { CinematicIntro } from "@/components/desktop/cinematic-intro";

export const metadata: Metadata = {
  title: "Bloom AI",
  description: "Bloom AI desktop launch.",
};

/** Where the desktop app opens: a three-second cinematic entrance, then the workspace at /desk. */
export default function Page() {
  return <CinematicIntro />;
}
