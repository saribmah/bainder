import { createMiddleware } from "hono/factory";
import type { AppEnv, AuthContext } from "../app/context";
import { createDb } from "../db/db";
import { createAnonymousAuth } from "../middleware/auth";
import { createAuth } from "../user/auth";
import { Instance } from "./";

export const bootstrap = createMiddleware<AppEnv>(async (c, next) => {
  const db = createDb(c.env);
  const auth = await resolveAuthContext(c.req.raw.headers, c.env);
  await Instance.provide({ auth, env: c.env, db }, async () => {
    await next();
  });
});

const resolveAuthContext = async (
  headers: Headers,
  env: AppEnv["Bindings"],
): Promise<AuthContext> => {
  if (!env.BETTER_AUTH_SECRET) {
    return createAnonymousAuth();
  }
  try {
    const auth = createAuth(env);
    const session = await auth.api.getSession({ headers });
    if (!session?.user) return createAnonymousAuth();
    return {
      isAuthenticated: true,
      userId: session.user.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
      },
      authMethod: "session",
    };
  } catch {
    return createAnonymousAuth();
  }
};
