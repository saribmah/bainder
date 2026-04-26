#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = new URL("..", import.meta.url).pathname;
const pkgPath = path.join(dir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>;

const publishConfig = (pkg.publishConfig ?? {}) as Record<string, unknown>;
const {
  exports: publishExports,
  main: publishMain,
  module: publishModule,
  types: publishTypes,
  ...remainingPublishConfig
} = publishConfig;

if (!publishExports || !publishMain || !publishModule || !publishTypes) {
  throw new Error(
    "package.json is missing publishConfig.{exports,main,module,types} — refusing to rewrite",
  );
}

const published: Record<string, unknown> = {
  ...pkg,
  exports: publishExports,
  main: publishMain,
  module: publishModule,
  types: publishTypes,
  publishConfig: remainingPublishConfig,
};

delete published.scripts;
delete published.devDependencies;

writeFileSync(pkgPath, `${JSON.stringify(published, null, 2)}\n`);
console.log(`Rewrote ${pkgPath} for publishing (exports → lib/*)`);
