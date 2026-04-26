import type { JWTPayload } from "jose";

type RuntimeEnv = Cloudflare.DevEnv | Cloudflare.ProductionEnv;

type AuthMethod = "jwt";

type AuthContext = {
  isAuthenticated: boolean;
  token: string | null;
  userId: string | null;
  claims: JWTPayload | null;
  authMethod: AuthMethod | null;
};

type AppEnv = {
  Bindings: RuntimeEnv;
};

export type { AppEnv, AuthContext, AuthMethod, RuntimeEnv };
