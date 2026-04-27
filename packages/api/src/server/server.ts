import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import type { AppEnv } from "../app/context";
import { Health } from "../health/health";
import epubRouter from "./routes/epub";
import exampleRouter from "./routes/example";

const server = new Hono<AppEnv>();

// Mount feature routers here. Match feature path prefixes to feature names.
server.route("/example", exampleRouter);
server.route("/epubs", epubRouter);

server.get(
  "/health",
  describeRoute({
    summary: "Health check",
    description: "Check if the service is healthy.",
    operationId: "health.get",
    responses: {
      200: {
        description: "Service health status",
        content: {
          "application/json": {
            schema: resolver(Health.Response),
          },
        },
      },
    },
  }),
  (c) => {
    return c.json({
      status: "healthy",
    });
  },
);

export default server;
