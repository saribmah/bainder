#!/usr/bin/env bun
export {};

// Skip-when-unreachable wrapper for `bun test`. Lets `bun run test` from the
// repo root stay green in CI even though the @baindar/testing suite needs a
// live backend (started via `bun run --filter '*/api' dev:test`).

const baseUrl = process.env.BAINDAR_API_URL ?? "http://localhost:8787";

type Reachability = "ok" | "no-server" | "no-test-mode";

const probe = async (): Promise<Reachability> => {
  try {
    const res = await fetch(`${baseUrl}/__test__/status`, {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) return "ok";
    // The route is mounted unconditionally and only the handler returns 404
    // when TEST_MODE is off — so a 404 here means the server is up but in
    // non-test mode, not that the route is missing.
    if (res.status === 404) return "no-test-mode";
    return "no-server";
  } catch {
    return "no-server";
  }
};

const status = await probe();
if (status === "no-server") {
  console.log(
    `[@baindar/testing] backend not reachable at ${baseUrl} — skipping. ` +
      "Start it with `bun run --filter '*/api' dev:test` to run these tests.",
  );
  process.exit(0);
}
if (status === "no-test-mode") {
  console.log(
    `[@baindar/testing] backend at ${baseUrl} is up but TEST_MODE is off — skipping. ` +
      "Restart with `bun run --filter '*/api' dev:test` to run these tests.",
  );
  process.exit(0);
}

const proc = Bun.spawn({
  cmd: ["bun", "test"],
  stdio: ["inherit", "inherit", "inherit"],
  env: { ...process.env, BAINDAR_API_URL: baseUrl },
});
const code = await proc.exited;
process.exit(code);
