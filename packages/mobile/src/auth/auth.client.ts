import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { AUTH_URL } from "../config.ts";

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
  plugins: [
    expoClient({
      scheme: "bainder",
      storagePrefix: "bainder",
      storage: SecureStore,
      // Don't trust the SecureStore session cache as the source of truth —
      // it has stale-data races on signOut and on cold start. Always go to the
      // server. AuthGate renders an ActivityIndicator while session is pending.
      disableCache: true,
    }),
    emailOTPClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;
