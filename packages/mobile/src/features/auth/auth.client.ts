import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { AUTH_URL } from "../../config.ts";

export const authClient = createAuthClient({
  baseURL: AUTH_URL,
  plugins: [
    expoClient({
      scheme: "bainder",
      storagePrefix: "bainder",
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});

export const { signIn, signOut, useSession } = authClient;
