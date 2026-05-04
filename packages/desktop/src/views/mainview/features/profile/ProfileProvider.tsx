import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Profile, ProfileUpdateData } from "@baindar/sdk";
import { useSdk } from "../../sdk";

type ProfilePatch = NonNullable<ProfileUpdateData["body"]>;

type ProfileContextValue = {
  profile: Profile | null;
  error: string | null;
  saving: boolean;
  update: (patch: ProfilePatch) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { client } = useSdk();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    client.profile
      .me()
      .then((res) => {
        if (cancelled) return;
        if (res.data) setProfile(res.data);
        else setError("Failed to load profile");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const update = useCallback(
    async (patch: ProfilePatch) => {
      const previous = profile;
      if (previous) setProfile({ ...previous, ...patch });
      setSaving(true);
      try {
        const res = await client.profile.update(patch);
        if (res.data) {
          setProfile(res.data);
          setError(null);
        } else {
          if (previous) setProfile(previous);
          setError("Failed to save");
        }
      } catch (err) {
        if (previous) setProfile(previous);
        setError(String(err));
      } finally {
        setSaving(false);
      }
    },
    [client, profile],
  );

  const value = useMemo(
    () => ({ profile, error, saving, update }),
    [profile, error, saving, update],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used inside <ProfileProvider>");
  }
  return ctx;
}
