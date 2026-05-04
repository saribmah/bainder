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

  export const R2BucketNotConfiguredError = NamedError.create(
    "R2BucketNotConfiguredError",
    z.object({ message: z.string().optional() }),
  );
  export type R2BucketNotConfiguredError = InstanceType<typeof R2BucketNotConfiguredError>;

  export const requireR2Bucket = (): R2Bucket => {
    const bucket = Instance.env.BUCKET;
    if (!bucket) throw new R2BucketNotConfiguredError({});
    return bucket;
  };

  export const AiNotConfiguredError = NamedError.create(
    "AiNotConfiguredError",
    z.object({ message: z.string().optional() }),
  );
  export type AiNotConfiguredError = InstanceType<typeof AiNotConfiguredError>;

  export const requireAi = (): Ai => {
    const ai = Instance.env.AI;
    if (!ai) throw new AiNotConfiguredError({});
    return ai;
  };

  // Local-only flag that gates the `/__test__/*` endpoints used by the
  // `@baindar/testing` package. Both env types declare `TEST_MODE: "false"`
  // statically (so `Config.isTestMode` type-checks); the `dev:test` script
  // overrides at runtime via `wrangler --var TEST_MODE:true`. Cast through
  // `string` because the literal type narrows comparison out otherwise.
  export const isTestMode = (): boolean => (Instance.env.TEST_MODE as string) === "true";
}
