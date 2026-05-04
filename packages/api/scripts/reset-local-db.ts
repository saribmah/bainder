import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Wipes local Wrangler/Miniflare state and re-applies D1 migrations so the
// next `wrangler dev` starts on an empty DB. Only touches `--local` state —
// remote D1 (dev/prod) is never reachable from this script.
//
// Flags:
//   --keep-r2          leave the local R2 bucket state in place
//   --keep-workflows   leave in-flight Workflow state in place
//   --yes              skip the "are you sure" hint (no-op; here for clarity)
//
// Run via `bun run db:reset:local` from `packages/api/` or via the root-level
// alias `bun run db:reset` from the repo root.

const scriptUrl = fileURLToPath(import.meta.url);
const apiRoot = path.resolve(scriptUrl, "../..");
const stateRoot = path.join(apiRoot, ".wrangler/state/v3");

const wipe = (sub: string): Promise<void> =>
  rm(path.join(stateRoot, sub), { recursive: true, force: true });

const args = new Set(process.argv.slice(2));
const includeR2 = !args.has("--keep-r2");
const includeWorkflows = !args.has("--keep-workflows");

console.error("Wiping local D1 state...");
await wipe("d1");

if (includeR2) {
  console.error("Wiping local R2 state...");
  await wipe("r2");
}

if (includeWorkflows) {
  // Stale Workflow runs reference document IDs that no longer exist after the
  // D1 wipe. Clearing this avoids retries firing against a clean DB.
  console.error("Wiping local Workflow state...");
  await wipe("workflows");
}

console.error("Re-applying D1 migrations...");
const migrate = spawnSync(
  "bunx",
  ["--bun", "wrangler", "d1", "migrations", "apply", "baindar-dev", "--local", "--env", "dev"],
  { stdio: "inherit", cwd: apiRoot },
);

if (migrate.status !== 0) {
  console.error(
    "Migration step failed. If `wrangler dev` is running in another terminal, stop it and re-run.",
  );
  process.exit(migrate.status ?? 1);
}

console.error("Local DB reset complete.");
