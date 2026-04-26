import type { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bootstrap } from "../instance/bootstrap";
import { errorHandler } from "../middleware/error";
import type { AppEnv } from "./context";

export const withBase = (app: Hono<AppEnv>): Hono<AppEnv> => {
  app.use("*", logger());
  app.use("*", cors({ origin: "*", credentials: true }));
  app.use("*", errorHandler);
  app.use("*", bootstrap);
  return app;
};
