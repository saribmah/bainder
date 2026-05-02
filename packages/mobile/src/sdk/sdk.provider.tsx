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
};

const SDKContext = createContext<SDKContextValue | null>(null);

const authedFetch: typeof fetch = (input, init) => {
  const cookies = authClient.getCookie();
  const headers = new Headers(init?.headers);
  if (cookies) headers.set("Cookie", cookies);
  return fetch(input, { ...init, headers });
};

export const SDKProvider = ({ children }: PropsWithChildren): ReactElement => {
  const value = useMemo<SDKContextValue>(() => {
    const client = createApiClient({
      baseUrl: API_URL,
      fetch: authedFetch,
    });
    return { baseUrl: API_URL, client, authedFetch };
  }, []);

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
};

export const useSdk = (): SDKContextValue => {
  const ctx = useContext(SDKContext);
  if (!ctx) throw new Error("useSdk must be used within an SDKProvider.");
  return ctx;
};
