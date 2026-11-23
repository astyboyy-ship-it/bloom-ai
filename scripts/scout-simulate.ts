// npm run scout:simulate — a full Bloom Scout → Bloom Exchange negotiation, locally, in a few seconds.
// Runs both scenarios against the in-process simulated relay (no network, no API keys); see src/lib/scout/simulate.ts.
// vite-node runs it with vitest.config.ts so the app's "@/" imports resolve.
import { simulate } from "../src/lib/scout/simulate";

const { ok } = await simulate();
process.exit(ok ? 0 : 1);
