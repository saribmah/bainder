import { type ApiClient, type ApiClientConfig, createApiClient } from "@bainder/sdk";

// Common base URL for every helper. Override with BAINDER_API_URL when
// pointing at a non-default host (e.g. a deployed preview).
export const apiBaseUrl = (): string => process.env["BAINDER_API_URL"] ?? "http://localhost:8787";

// Build an SDK client. When a session token is provided, every call carries
// `Authorization: Bearer <token>` — the bearer plugin in createAuth maps it
// to the same session resolution path the cookie path uses.
export const createTestClient = (sessionToken?: string): ApiClient => {
  const config: ApiClientConfig = { baseUrl: apiBaseUrl() };
  if (sessionToken) {
    config.headers = { Authorization: `Bearer ${sessionToken}` };
  }
  return createApiClient(config);
};

export type SignInResult = {
  userId: string;
  sessionToken: string;
  client: ApiClient;
};

// Test-mode sign-in. Hits POST /__test__/sign-in (gated by TEST_MODE=true on
// the backend) and returns a ready-to-use authenticated client. The endpoint
// upserts the user and mints a fresh session every call.
export const signInAs = async (email: string, name?: string): Promise<SignInResult> => {
  const res = await fetch(`${apiBaseUrl()}/__test__/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(name ? { email, name } : { email }),
  });
  if (!res.ok) {
    throw new Error(
      `Test-mode sign-in failed: ${res.status} ${res.statusText} — ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { userId: string; sessionToken: string };
  return {
    userId: body.userId,
    sessionToken: body.sessionToken,
    client: createTestClient(body.sessionToken),
  };
};

// Wipe all D1 user data + R2 objects. Hits POST /__test__/reset. Run before
// each test file so suites don't leak state into each other.
export const resetState = async (): Promise<void> => {
  const res = await fetch(`${apiBaseUrl()}/__test__/reset`, { method: "POST" });
  if (!res.ok) {
    throw new Error(
      `Test-mode reset failed: ${res.status} ${res.statusText} — ${await res.text()}`,
    );
  }
};
