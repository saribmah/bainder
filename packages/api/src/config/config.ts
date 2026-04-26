import { z } from "zod";
import { Instance } from "../instance";
import { NamedError } from "../utils/error";

// Config namespace: typed accessors for env-derived configuration.
// Feature/route modules MUST read config through here, not via direct env reads.
export namespace Config {
  export const JwtSecretNotConfiguredError = NamedError.create(
    "JwtSecretNotConfiguredError",
    z.object({ message: z.string().optional() }),
  );
  export type JwtSecretNotConfiguredError = InstanceType<typeof JwtSecretNotConfiguredError>;

  export const getJwtSecret = (): string | null => {
    const value = Instance.env.JWT_SECRET;
    if (typeof value === "string" && value.length > 0) return value;
    return null;
  };

  export const requireJwtSecret = (): string => {
    const secret = getJwtSecret();
    if (!secret) throw new JwtSecretNotConfiguredError({});
    return secret;
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
