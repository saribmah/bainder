import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import server from "../server/server";
import type { AppEnv } from "./context";
import { withBase } from "./with-base";

export const openApiDocumentation = {
  info: {
    title: "bainder API",
    version: "0.0.0",
    description: "bainder API OpenAPI schema",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer" as const,
        bearerFormat: "JWT",
      },
    },
  },
};

// API app, reached on `api.*` in production. Mounts the server router at root
// and exposes the OpenAPI document.
export const apiApp = withBase(new Hono<AppEnv>());
apiApp.route("/", server);
apiApp.get("/openapi.json", openAPIRouteHandler(apiApp, { documentation: openApiDocumentation }));

// Dev / fallback composite. Used by `wrangler dev` and by the default
// `*.workers.dev` hostname when custom-domain subdomains aren't attached yet.
export const devApp = withBase(new Hono<AppEnv>());
devApp.route("/", server);
devApp.get("/openapi.json", openAPIRouteHandler(devApp, { documentation: openApiDocumentation }));
