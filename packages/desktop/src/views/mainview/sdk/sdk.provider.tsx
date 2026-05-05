import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { createApiClient, type ApiClient } from "@baindar/sdk";
import { getAuthToken } from "../features/auth/auth.client";

type SDKContextValue = {
  baseUrl: string;
  client: ApiClient;
  authedFetch: typeof fetch;
};

const SDKContext = createContext<SDKContextValue | null>(null);

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
if (!baseUrl) {
  throw new Error("VITE_API_URL is required (see packages/desktop/.env.development).");
}

// The bearer token is captured by the Better Auth client (auth.client.ts,
// fetchOptions.onSuccess). The SDK speaks straight to the API and only
// needs to forward it as `Authorization: Bearer <token>` — no cookies.
//
// The SDK calls _fetch(request) with a Request object and no init. Passing
// { headers } as init to fetch() replaces the Request's header list (dropping
// Content-Type) — which makes server-side JSON parsing return an empty patch
// and the API echoes back the unchanged record. Rebuild the request explicitly
// so the body and original headers are preserved alongside our Authorization.
const authedFetch: typeof fetch = async (input, init) => {
  const token = getAuthToken();

  if (typeof Request !== "undefined" && input instanceof Request) {
    const headers = new Headers(input.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const hasBody = input.method !== "GET" && input.method !== "HEAD";
    const body = hasBody ? await input.clone().arrayBuffer() : undefined;
    return fetch(input.url, {
      method: input.method,
      headers,
      body,
      redirect: input.redirect,
      signal: input.signal,
      ...init,
    });
  }

  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

export const SDKProvider = ({ children }: PropsWithChildren): ReactElement => {
  const value = useMemo<SDKContextValue>(() => {
    const client = createApiClient({
      baseUrl,
      fetch: authedFetch,
    });
    return { baseUrl, client, authedFetch };
  }, []);

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
};

export const useSdk = (): SDKContextValue => {
  const ctx = useContext(SDKContext);
  if (!ctx) throw new Error("useSdk must be used within an SDKProvider.");
  return ctx;
};
