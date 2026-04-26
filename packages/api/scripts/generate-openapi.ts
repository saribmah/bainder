import { writeFile } from "node:fs/promises";
import { generateSpecs } from "hono-openapi";
import { devApp, openApiDocumentation } from "../src/app/app";

const spec = await generateSpecs(devApp, {
  documentation: openApiDocumentation,
  exclude: ["/openapi.json"],
});

const json = `${JSON.stringify(spec, null, 2)}\n`;

const outputArg = process.argv[2];
if (outputArg) {
  await writeFile(outputArg, json);
  console.error(`Generated OpenAPI spec at ${outputArg}`);
} else {
  const outputPath = new URL("../openapi.generated.json", import.meta.url);
  await writeFile(outputPath, json);
  console.error(`Generated OpenAPI spec at ${outputPath.pathname}`);
}

process.stdout.write(json);
