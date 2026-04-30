import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import type { AppEnv } from "../app/context";
import { Health } from "../health/health";
import { createAuth } from "../user/auth";
import documentRouter from "./routes/document";
import exampleRouter from "./routes/example";
import userRouter from "./routes/user";

const server = new Hono<AppEnv>();

// Better Auth's auto-generated routes (sign-in, sign-up, OAuth callbacks,
// email-OTP, sessions, …). basePath in createAuth() must match this prefix.
server.on(["GET", "POST"], "/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

// Mount feature routers here. Match feature path prefixes to feature names.
server.route("/example", exampleRouter);
server.route("/documents", documentRouter);
server.route("/user", userRouter);

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
