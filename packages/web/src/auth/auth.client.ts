import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Better Auth's React client requires an absolute URL with a protocol —
// relative paths fail URL construction. Resolve the configured path against
// the current origin so the same env value works in dev (vite proxies
// /auth → wrangler) and same-origin prod, while still allowing a fully
// qualified URL for split-domain deploys.
const configured = (import.meta.env.VITE_AUTH_URL as string | undefined) ?? "/auth";
const baseURL = /^https?:\/\//i.test(configured)
  ? configured
  : `${window.location.origin}${configured.startsWith("/") ? configured : `/${configured}`}`;

export const authClient = createAuthClient({
  baseURL,
  plugins: [emailOTPClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
