import { authClient } from "../../auth";

export function useProfileName() {
  const session = authClient.useSession();
  const name = session.data?.user.name?.trim();
  const email = session.data?.user.email?.trim();

  if (name) return name.split(/\s+/)[0] ?? "Reader";
  if (email) return email.split("@")[0] ?? "Reader";
  return "Reader";
}
