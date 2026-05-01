// Runs Vite (view) and Electrobun (main process + webview) together for dev.
// Vite serves the React app at :3003 with HMR; Electrobun's BrowserWindow
// loads http://localhost:3003 when NODE_ENV=development (see src/main/index.ts).
export {};

const env = { ...process.env, NODE_ENV: "development" };

const vite = Bun.spawn(["bunx", "--bun", "vite"], {
  stdio: ["inherit", "inherit", "inherit"],
  env,
});

const electrobun = Bun.spawn(["bunx", "electrobun", "dev"], {
  stdio: ["inherit", "inherit", "inherit"],
  env,
});

const cleanup = () => {
  if (!vite.killed) vite.kill();
  if (!electrobun.killed) electrobun.kill();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

const exitCode = await Promise.race([vite.exited, electrobun.exited]);
cleanup();
process.exit(exitCode ?? 0);
