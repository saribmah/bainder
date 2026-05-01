import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_AUTH_URL as string | undefined;
if (!baseURL) {
  throw new Error("VITE_AUTH_URL is required (see packages/desktop/.env.development).");
}

// In-memory bearer token. Captured from Better Auth's `set-auth-token`
// response header on every successful auth response, then re-injected as
// `Authorization: Bearer <token>` on subsequent requests. Cleared when the
// app exits — by design for v1; persistence comes later.
let bearerToken: string | null = null;

export const getAuthToken = (): string | null => bearerToken;

export const authClient = createAuthClient({
  baseURL,
  plugins: [emailOTPClient()],
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => bearerToken ?? "",
    },
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) {
        bearerToken = token;
      }
    },
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
