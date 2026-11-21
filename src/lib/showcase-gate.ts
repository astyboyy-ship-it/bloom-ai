/**
 * The private showcase (real company names and logos in the pulse feed, company pages and Bloom Scout's illustrative
 * entries) is decided when the app is BUILT, and only one kind of build may include it: a local desktop build.
 *
 *   - NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE=true    the operator asked for it (e.g. in .env.local)
 *   - BLOOM_DESKTOP_SHOWCASE=1                   set only by scripts/desktop-local.mjs (npm run desktop:local)
 *   - no VERCEL / VERCEL_ENV                     never on Vercel, whatever the project's variables say
 *
 * next.config.ts turns this into BLOOM_SHOWCASE_BUILD, which companies.ts reads. Every other build folds the
 * real-brand table to null, so the bundler drops the names and logos: they are not in the public site's JavaScript at
 * all, not merely hidden. Inside a showcase build, useShowcase() additionally requires the desktop window at runtime.
 */
export function showcaseBuildAllowed(env: Record<string, string | undefined>): boolean {
  return env.NEXT_PUBLIC_BLOOM_PRIVATE_SHOWCASE === "true" && env.BLOOM_DESKTOP_SHOWCASE === "1" && !env.VERCEL && !env.VERCEL_ENV;
}
