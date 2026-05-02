import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { createApiClient, type ApiClient } from "@bainder/sdk";
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
const authedFetch: typeof fetch = (input, init) => {
  const token = getAuthToken();
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
