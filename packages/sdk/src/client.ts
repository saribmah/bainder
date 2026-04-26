export * from "./v1/gen/types.gen.js";

import { createClient, type Auth, type Client, type Config } from "./v1/gen/client";
import { ApiClient } from "./v1/gen/sdk.gen.js";
export { createClient, ApiClient };
export type { Client };

export type ApiClientConfig = Config & {
  security?: ReadonlyArray<Auth>;
};

export function createApiClient(config?: ApiClientConfig) {
  const client = createClient(config as Config);
  return new ApiClient({ client });
}
