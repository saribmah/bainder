import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Better Auth's React client requires an absolute URL with a protocol.
const configured = (import.meta.env.VITE_AUTH_URL as string | undefined) ?? "/auth";
const baseURL = /^https?:\/\//i.test(configured)
  ? configured
  : `${window.location.origin}${configured.startsWith("/") ? configured : `/${configured}`}`;

export const authClient = createAuthClient({
  baseURL,
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
