import { jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";
import type { AppEnv, AuthContext } from "../app/context";

type ResolvedAuth = {
  context: AuthContext;
};

const parseBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

export const createAnonymousAuth = (token: string | null = null): AuthContext => {
  return {
    isAuthenticated: false,
    token,
    userId: null,
    claims: null,
    authMethod: null,
  };
};

const resolveJwtSecret = (env: AppEnv["Bindings"]): string | null => {
  if (typeof env.JWT_SECRET === "string" && env.JWT_SECRET.length > 0) {
    return env.JWT_SECRET;
  }
  return null;
};

const resolveJwt = async (token: string, jwtSecret: string | null): Promise<ResolvedAuth> => {
  if (!jwtSecret) {
    return { context: createAnonymousAuth(token) };
  }

  try {
    const secretKey = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secretKey);

    return {
      context: {
        isAuthenticated: true,
        token,
        userId: typeof payload.sub === "string" ? payload.sub : null,
        claims: payload,
        authMethod: "jwt",
      },
    };
  } catch {
    return { context: createAnonymousAuth(token) };
  }
};

export const resolveAuthContext = async (
  authorizationHeader: string | undefined,
  env: AppEnv["Bindings"],
): Promise<ResolvedAuth> => {
  const token = parseBearerToken(authorizationHeader);

  if (!token) {
    return { context: createAnonymousAuth(token) };
  }

  return resolveJwt(token, resolveJwtSecret(env));
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("authorization");
  const resolved = await resolveAuthContext(header, c.env);
  if (!resolved.context.isAuthenticated || !resolved.context.userId) {
    return c.json({ message: "Unauthorized" }, 401);
  }
  await next();
};
