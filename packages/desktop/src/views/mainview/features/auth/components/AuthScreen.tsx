import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Input, Wordmark } from "@bainder/ui";
import { authClient } from "../auth.client";
import { AuthVisual } from "./AuthVisual";
import { LoadingShell } from "./LoadingShell";
import { OtpScreen } from "./OtpScreen";
import { SocialButtons } from "./SocialButtons";

export type AuthMode = "signin" | "signup";
type Phase = "email" | "otp";

const authCopy = {
  signin: {
    eyebrow: "SIGN IN",
    title: "Welcome back,\nreader.",
    lead: "We'll send a one-time code to your inbox. No passwords to remember.",
    submit: "Send sign-in code",
    switchLead: "New to Bainder?",
    switchAction: "Create an account",
    switchTo: "/signup",
  },
  signup: {
    eyebrow: "CREATE ACCOUNT",
    title: "Begin a quieter way\nto read.",
    lead: "Create your shelf in seconds. Upload any book, highlight passages, ask questions - all grounded in your text.",
    submit: "Send sign-up code",
    switchLead: "Already a reader?",
    switchAction: "Sign in",
    switchTo: "/signin",
  },
} as const;

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<Phase>("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = authCopy[mode];

  if (session.isPending) return <LoadingShell />;
  if (session.data?.user) return <Navigate to="/dashboard" replace />;

  const requestOtp = async (event: FormEvent) => {
    event.preventDefault();
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

  const submitOtp = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (res.error) setError(res.error.message ?? "Invalid code");
  };

  if (phase === "otp") {
    return (
      <OtpScreen
        email={email}
        otp={otp}
        busy={busy}
        error={error}
        onOtpChange={setOtp}
        onBack={() => {
          setPhase("email");
          setOtp("");
          setError(null);
        }}
        onSubmit={submitOtp}
      />
    );
  }

  return (
    <main className="grid min-h-screen bg-paper-50 text-paper-900 lg:grid-cols-2">
      <section className="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16 lg:py-10">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-fit border-0 bg-transparent p-0 text-paper-900"
        >
          <Wordmark size="md" />
        </button>

        <div className="my-auto w-full max-w-[440px] py-12">
          <div className="t-label-s text-paper-500">{copy.eyebrow}</div>
          <h1 className="mt-3 whitespace-pre-line font-display text-[44px] font-normal leading-[1.04] tracking-normal text-paper-900 sm:text-[56px]">
            {copy.title}
          </h1>
          <p className="t-body-l mt-4 text-paper-700">{copy.lead}</p>

          <div className="mt-9 flex flex-col gap-4">
            <SocialButtons />
            <OrDivider />

            <form onSubmit={requestOtp} className="flex flex-col gap-3">
              <label htmlFor="auth-email" className="t-label-s text-paper-600">
                EMAIL
              </label>
              <Input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="reader@bainder.app"
                className="border-paper-300 bg-paper-50"
              />
              <Button type="submit" size="lg" disabled={busy || !email.includes("@")}>
                {busy ? "Sending..." : copy.submit}
              </Button>
            </form>
          </div>

          <p className="t-body-m mt-6 text-paper-500">
            {copy.switchLead}{" "}
            <Link
              to={copy.switchTo}
              className="font-medium text-paper-900 underline underline-offset-4"
            >
              {copy.switchAction}
            </Link>
          </p>

          {error && <p className="t-body-s mt-4 text-error">{error}</p>}
        </div>

        <p className="t-body-s m-0 text-paper-500">
          By continuing, you agree to our{" "}
          <span className="underline underline-offset-4">Terms</span> and{" "}
          <span className="underline underline-offset-4">Privacy Policy</span>.
        </p>
      </section>

      <AuthVisual />
    </main>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-paper-200" />
      <span className="t-label-s text-paper-500">OR</span>
      <div className="h-px flex-1 bg-paper-200" />
    </div>
  );
}
