import { authClient } from "../../auth/auth.client";

export function useProfileName() {
  const session = authClient.useSession();
  const user = session.data?.user;
  const name = user?.name?.trim();
  const email = user?.email?.trim();

  if (name) return name.split(/\s+/)[0] ?? "Reader";
  if (email) return email.split("@")[0] ?? "Reader";
  return "Reader";
}
