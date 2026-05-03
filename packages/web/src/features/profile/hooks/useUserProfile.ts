import { useCallback, useEffect, useState } from "react";
import type { User, UserUpdateData } from "@bainder/sdk";
import { useSdk } from "../../../sdk";

type UserPatch = NonNullable<UserUpdateData["body"]>;

export function useUserProfile() {
  const { client } = useSdk();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client.user
      .me()
      .then((res) => {
        if (cancelled) return;
        if (res.data) setUser(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const update = useCallback(
    async (patch: UserPatch) => {
      setSaving(true);
      try {
        const res = await client.user.update(patch);
        if (res.data) {
          setUser(res.data);
          setError(null);
          return res.data;
        }
        setError("Failed to save");
        return null;
      } catch (err) {
        setError(String(err));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [client],
  );

  return { user, error, saving, update };
}
