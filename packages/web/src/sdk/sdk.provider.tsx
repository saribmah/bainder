import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import { createApiClient, type ApiClient } from "@bainder/sdk";

type SDKContextValue = {
  baseUrl: string;
  client: ApiClient;
};

const SDKContext = createContext<SDKContextValue | null>(null);

// In dev: vite proxies /api/* → http://localhost:8787 (see vite.config.ts).
// In prod (same-origin): leave VITE_API_URL unset and the SDK hits the same origin.
// In prod (subdomain): set VITE_API_URL=https://api.your-domain.com.
const fallbackBaseUrl = "/api";

export const SDKProvider = ({ children }: PropsWithChildren): ReactElement => {
  const baseUrl = import.meta.env.VITE_API_URL ?? fallbackBaseUrl;

  const value = useMemo<SDKContextValue>(() => {
    const client = createApiClient({
      baseUrl,
      // Add auth here once you have a token store, for example:
      // auth: () => localStorage.getItem("accessToken") ?? undefined,
      // security: [{ type: "http", scheme: "bearer" }],
    });

    return { baseUrl, client };
  }, [baseUrl]);

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>;
};

export const useSdk = (): SDKContextValue => {
  const ctx = useContext(SDKContext);
  if (!ctx) throw new Error("useSdk must be used within an SDKProvider.");
  return ctx;
};
