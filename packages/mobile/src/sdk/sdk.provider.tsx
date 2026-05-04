import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { createApiClient, type ApiClient } from "@baindar/sdk";
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

const authedFetch: typeof fetch = async (input, init) => {
  const extras = authHeaders();

  // The SDK calls _fetch(request) with a Request object and no init. Passing
  // { headers } as init to fetch() replaces the Request's header list (dropping
  // Content-Type), and on some React Native fetch builds also drops the body —
  // which makes server-side JSON parsing return an empty patch and the API
  // echoes back the unchanged record. Rebuild the request explicitly so the
  // body and original headers are preserved alongside our Cookie header.
  if (typeof Request !== "undefined" && input instanceof Request) {
    const headers = new Headers(input.headers);
    for (const [key, value] of Object.entries(extras)) headers.set(key, value);
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
  for (const [key, value] of Object.entries(extras)) headers.set(key, value);
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
