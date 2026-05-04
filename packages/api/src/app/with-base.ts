import type { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bootstrap } from "../instance/bootstrap";
import { errorHandler } from "../middleware/error";
import type { AppEnv } from "./context";

const originFromPublicHost = (value: string | undefined): string | null => {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return `https://${value}`;
  }
};

const configuredOrigins = (raw: string | undefined): Set<string> =>
  new Set(
    (raw ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

export const withBase = (app: Hono<AppEnv>): Hono<AppEnv> => {
  app.use("*", logger());
  app.use(
    "*",
    cors({
      origin: (origin, c) => {
        const allowed = configuredOrigins(c.env.TRUSTED_ORIGINS);
        const webOrigin = originFromPublicHost(c.env.WEB_PUBLIC_HOST);
        const apiOrigin = originFromPublicHost(c.env.API_PUBLIC_HOST);

        if (webOrigin) allowed.add(webOrigin);
        if (apiOrigin) allowed.add(apiOrigin);

        return allowed.has(origin) ? origin : null;
      },
      credentials: true,
    }),
  );
  app.use("*", errorHandler);
  app.use("*", bootstrap);
  return app;
};
