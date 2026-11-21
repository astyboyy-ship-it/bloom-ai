import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Components are compiled the way Next compiles them (no `import React` needed), so tests can render them.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${at("./src")}/` },
      { find: /^@bloom\/exchange-sdk$/, replacement: at("./packages/bloom-exchange-sdk/src/index.ts") },
      // Next's guard against importing server modules into client bundles; meaningless under Node tests.
      { find: /^server-only$/, replacement: at("./src/lib/exchange/__tests__/stubs/server-only.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
    setupFiles: ["./src/lib/exchange/__tests__/stubs/setup.ts"],
    testTimeout: 20_000,
  },
});
