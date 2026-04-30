#!/usr/bin/env bun
export {};

// Skip-when-unreachable wrapper for `bun test`. Lets `bun run test` from the
// repo root stay green in CI even though the @bainder/testing suite needs a
// live backend (started via `bun run --filter '*/api' dev:test`).

const baseUrl = process.env.BAINDER_API_URL ?? "http://localhost:8787";

const isReachable = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
};

if (!(await isReachable())) {
  console.log(
    `[@bainder/testing] backend not reachable at ${baseUrl} — skipping. ` +
      "Start it with `bun run --filter '*/api' dev:test` to run these tests.",
  );
  process.exit(0);
}

const proc = Bun.spawn({
  cmd: ["bun", "test"],
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, BAINDER_API_URL: baseUrl },
});
const code = await proc.exited;
process.exit(code);
