import { z } from "zod";
import { Instance } from "../instance";
import { NamedError } from "../utils/error";

// Config namespace: typed accessors for env-derived configuration.
// Feature/route modules MUST read config through here, not via direct env reads.
export namespace Config {
  export const BetterAuthSecretNotConfiguredError = NamedError.create(
    "BetterAuthSecretNotConfiguredError",
    z.object({ message: z.string().optional() }),
  );
  export type BetterAuthSecretNotConfiguredError = InstanceType<
    typeof BetterAuthSecretNotConfiguredError
  >;

  export const getBetterAuthSecret = (): string | null => {
    const value = Instance.env.BETTER_AUTH_SECRET;
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  export const requireBetterAuthSecret = (): string => {
    const secret = getBetterAuthSecret();
    if (!secret) throw new BetterAuthSecretNotConfiguredError({});
    return secret;
  };

  export const getBetterAuthUrl = (): string | null => {
    const value = Instance.env.BETTER_AUTH_URL;
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  export const getApiPublicHost = (): string | null => {
    const value = Instance.env.API_PUBLIC_HOST;
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  export const getWebPublicHost = (): string | null => {
    const value = Instance.env.WEB_PUBLIC_HOST;
    return typeof value === "string" && value.length > 0 ? value : null;
  };
}
