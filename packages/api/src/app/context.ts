type RuntimeEnv = Cloudflare.DevEnv | Cloudflare.ProductionEnv;

type AuthMethod = "session";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image: string | null;
};

type AuthContext = {
  isAuthenticated: boolean;
  userId: string | null;
  user: SessionUser | null;
  authMethod: AuthMethod | null;
};

type AppEnv = {
  Bindings: RuntimeEnv;
};

export type { AppEnv, AuthContext, AuthMethod, RuntimeEnv, SessionUser };
