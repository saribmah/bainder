import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { createApiClient, type ApiClient } from "@bainder/sdk";
import { authClient } from "../features/auth";
import { API_URL } from "../config.ts";

type SDKContextValue = {
  baseUrl: string;
  client: ApiClient;
  authedFetch: typeof fetch;
  authHeaders: () => Record<string, string>;
};

const SDKContext = createContext<SDKContextValue | null>(null);

const authHeaders = (): Record<string, string> => {
  const cookies = authClient.getCookie();
  return cookies ? { Cookie: cookies } : {};
};

const authedFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(authHeaders())) headers.set(key, value);
  return fetch(input, { ...init, headers });
};

export const SDKProvider = ({ children }: PropsWithChildren): ReactElement => {
  const value = useMemo<SDKContextValue>(() => {
    const client = createApiClient({
      baseUrl: API_URL,
      fetch: authedFetch,
    });
    return { baseUrl: API_URL, client, authedFetch, authHeaders };
  }, []);

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
};

export const useSdk = (): SDKContextValue => {
  const ctx = useContext(SDKContext);
  if (!ctx) throw new Error("useSdk must be used within an SDKProvider.");
  return ctx;
};
