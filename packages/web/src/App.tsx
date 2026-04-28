import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { User } from "@bainder/sdk";
import { authClient } from "./auth/auth.client";
import { useSdk } from "./sdk";

export function App() {
  const session = authClient.useSession();

  if (session.isPending) {
    return <Shell>Loading…</Shell>;
  }
  return session.data?.user ? <SignedIn /> : <SignedOut />;
}

function SignedIn() {
  const { client } = useSdk();
  const [me, setMe] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    client.user
      .me()
      .then((res) => {
        if (cancelled) return;
        if (res.data) setMe(res.data);
        else setError("Failed to load profile");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  return (
    <Shell>
      <h1 className="text-2xl">Signed in</h1>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {me && (
        <pre className="w-80 overflow-auto rounded bg-neutral-900 p-3 text-xs text-neutral-300">
          {JSON.stringify(me, null, 2)}
        </pre>
      )}
      <button
        type="button"
        onClick={() => authClient.signOut()}
        className="rounded bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
      >
        Sign out
      </button>
    </Shell>
  );
}

function SignedOut() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Failed to send code");
      return;
    }
    setPhase("otp");
  };

  const submitOtp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (res.error) setError(res.error.message ?? "Invalid code");
  };

  return (
    <Shell>
      <h1 className="text-2xl">Sign in</h1>

      {phase === "email" ? (
        <form onSubmit={requestOtp} className="flex w-72 flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="flex w-72 flex-col gap-3">
          <p className="text-xs text-neutral-400">
            Code sent to <span className="text-neutral-200">{email}</span>. In dev, the code prints
            to the wrangler terminal.
          </p>
          <input
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            className="rounded bg-neutral-900 px-3 py-2 text-sm tracking-widest outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase("email");
              setOtp("");
              setError(null);
            }}
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            Use a different email
          </button>
        </form>
      )}

      <div className="my-2 flex w-72 items-center gap-3 text-xs text-neutral-500">
        <div className="h-px flex-1 bg-neutral-800" />
        <span>or</span>
        <div className="h-px flex-1 bg-neutral-800" />
      </div>

      <div className="flex w-72 flex-col gap-2">
        <button
          type="button"
          onClick={() => authClient.signIn.social({ provider: "google" })}
          className="rounded bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
        >
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => authClient.signIn.social({ provider: "apple" })}
          className="rounded bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
        >
          Continue with Apple
        </button>
      </div>

      {error && <p className="w-72 text-sm text-red-400">{error}</p>}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
      <h2 className="text-xs uppercase tracking-widest text-neutral-500">bainder</h2>
      {children}
    </main>
  );
}
