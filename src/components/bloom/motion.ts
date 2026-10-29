import type { Transition } from "framer-motion";

/**
 * Shared motion for drawers, modals and hover states: a stiff, well-damped spring that settles fast with no
 * overshoot, and a short fade for the dimmed backdrops behind them.
 *
 * Fade the backdrop layer itself, never a wrapper around a frosted panel: a wrapper with opacity below 1
 * becomes the panel's backdrop root, so its blur switches off mid-animation and pops back at the end.
 */
export const SNAP: Transition = { type: "spring", stiffness: 350, damping: 30 };
export const FADE: Transition = { duration: 0.2, ease: "easeOut" };
