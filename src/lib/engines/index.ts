import type { EngineKey } from "@/components/bloom/command/engines";
import { sovereign } from "./01-sovereign";
import { apex } from "./02-apex";
import { coreops } from "./03-coreops";
import { intentpulse } from "./04-intentpulse";
import { vanguard } from "./05-vanguard";
import { cortex } from "./06-cortex";
import { shield } from "./07-shield";
import { aether } from "./08-aether";
import type { EngineAgent } from "./types";

/** The eight engine agents the orchestrator can run, keyed like the rest of the Bloom UI. */
export const AGENTS: Record<EngineKey, EngineAgent> = { sovereign, apex, coreops, intentpulse, vanguard, cortex, shield, aether };

export type { EngineAgent } from "./types";
