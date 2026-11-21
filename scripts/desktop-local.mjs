// Serves the CURRENT checkout (whatever branch is checked out, including uncommitted edits) as a production build for
// the local desktop app:
//
//   npm run desktop:local      (Tauri runs this first, then opens its window on http://localhost:3210)
//
// 1. Rebuilds (`npm run build`: prisma generate + next build) only when the code changed since the last local
//    desktop build: the stamp is HEAD plus a hash of `git status` and of the uncommitted diff.
// 2. Starts `next start` on port 3210 (BLOOM_DESKTOP_PORT to change it).
//
// Bloom Scout live runs are forced off here (BLOOM_SCOUT_LIVE=0 overrides any .env file), so the desktop app can
// show the feed and illustrative entries but never writes to the public relay.
// The installed release app is unaffected: it still loads the production web deploy (src-tauri/tauri.conf.json).
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PORT = Number(process.env.BLOOM_DESKTOP_PORT || 3210);
const STAMP = join(ROOT, ".next", "desktop-local.stamp");
const env = { ...process.env, BLOOM_SCOUT_LIVE: "0", NODE_ENV: "production" };
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
function stamp() {
  const h = createHash("sha256");
  h.update(git("rev-parse", "HEAD"));
  h.update(git("status", "--porcelain", "--untracked-files=all"));
  h.update(git("diff", "HEAD"));
  return h.digest("hex");
}

function portFree(port) {
  return new Promise((resolve) => {
    const s = createServer().once("error", () => resolve(false)).once("listening", () => s.close(() => resolve(true)));
    s.listen(port, "127.0.0.1");
  });
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD").trim();
if (!(await portFree(PORT))) {
  console.error(`[desktop-local] Port ${PORT} is in use. Stop whatever is running there, or set BLOOM_DESKTOP_PORT.`);
  process.exit(1);
}

const want = stamp();
const have = existsSync(STAMP) ? readFileSync(STAMP, "utf8").trim() : "";
if (have === want && existsSync(join(ROOT, ".next", "BUILD_ID"))) {
  console.log(`[desktop-local] ${branch}: the production build is current; skipping the rebuild.`);
} else {
  console.log(`[desktop-local] ${branch}: building the current checkout (npm run build)…`);
  execFileSync(npm, ["run", "build"], { cwd: ROOT, env, stdio: "inherit", shell: process.platform === "win32" });
  writeFileSync(STAMP, want);
}

console.log(`[desktop-local] ${branch}: serving on http://localhost:${PORT} (Bloom Scout live runs off)`);
const server = spawn(npm, ["run", "start", "--", "-p", String(PORT)], { cwd: ROOT, env, stdio: "inherit", shell: process.platform === "win32" });
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
