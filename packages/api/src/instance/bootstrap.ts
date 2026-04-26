import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../app/context";
import { createAnonymousAuth, resolveAuthContext } from "../middleware/auth";
import { Instance } from "./";

export const bootstrap = createMiddleware<AppEnv>(async (c, next) => {
  await Instance.provide({ auth: createAnonymousAuth(), env: c.env }, async () => {
    const resolved = await resolveAuthContext(c.req.header("authorization"), c.env);

    await Instance.provide({ auth: resolved.context, env: c.env }, async () => {
      await next();
    });
  });
});
