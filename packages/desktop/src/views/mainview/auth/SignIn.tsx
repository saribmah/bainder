import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Button, Hairline, Input, Wordmark } from "@bainder/ui";
import { authClient } from "./auth.client";

export function SignIn() {
  const session = authClient.useSession();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session.isPending) {
    return <Shell>Loading…</Shell>;
  }
  if (session.data?.user) {
    return <Navigate to="/library" replace />;
  }

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
      <h2 className="t-display-m">Sign in</h2>

      {phase === "email" ? (
        <form onSubmit={requestOtp} className="flex w-80 flex-col gap-3">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button type="submit" variant="wine" size="lg" disabled={busy}>
            {busy ? "Sending…" : "Email me a code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="flex w-80 flex-col gap-3">
          <p className="t-body-s text-paper-600">
            Code sent to <span className="text-paper-900">{email}</span>. In dev, the code prints to
            the wrangler terminal.
          </p>
          <Input
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            className="tracking-widest"
          />
          <Button type="submit" variant="wine" size="lg" disabled={busy}>
            {busy ? "Verifying…" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setPhase("email");
              setOtp("");
              setError(null);
            }}
            className="t-body-s text-paper-500 hover:text-paper-800"
          >
            Use a different email
          </button>
        </form>
      )}

      <div className="my-2 flex w-80 items-center gap-3">
        <Hairline className="flex-1" />
        <span className="t-label-s text-paper-500">or</span>
        <Hairline className="flex-1" />
      </div>

      <div className="flex w-80 flex-col gap-2">
        <Button
          variant="secondary"
          onClick={() => authClient.signIn.social({ provider: "google" })}
        >
          Continue with Google
        </Button>
        <Button variant="secondary" onClick={() => authClient.signIn.social({ provider: "apple" })}>
          Continue with Apple
        </Button>
      </div>

      {error && <p className="t-body-s w-80 text-error">{error}</p>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-paper-50 px-6 text-paper-900">
      <Wordmark as="h1" size="md" />
      {children}
    </main>
  );
}
