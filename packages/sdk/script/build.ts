#!/usr/bin/env bun

const dir = new URL("..", import.meta.url).pathname;
process.chdir(dir);

import { $ } from "bun";
import path from "path";

import { createClient } from "@hey-api/openapi-ts";

const apiDir = path.resolve(dir, "../api");
const sdkOpenApiPath = path.join(dir, "openapi.json");

await $`bun run openapi:generate ${sdkOpenApiPath}`.cwd(apiDir);

await createClient({
  input: "./openapi.json",
  output: {
    path: "./src/v1/gen",
    tsConfigPath: path.join(dir, "tsconfig.json"),
    clean: true,
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      exportFromIndex: false,
      enums: {
        case: "PascalCase",
        mode: "typescript",
      },
    },
    {
      name: "@hey-api/sdk",
      exportFromIndex: false,
      auth: false,
      operations: {
        strategy: "single",
        containerName: "apiClient",
      },
      paramsStructure: "flat",
    },
  ],
});

await $`bun run lint:fix`;
await $`bun run format:fix`;
await $`bun run ts-check`;
