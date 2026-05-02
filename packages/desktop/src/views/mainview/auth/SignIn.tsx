import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Icons, Input, Wordmark } from "@bainder/ui";
import { authClient } from "./auth.client";

type AuthMode = "signin" | "signup";
type Phase = "email" | "otp";

const copy = {
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

export function SignIn() {
  return <AuthScreen mode="signin" />;
}

export function SignUp() {
  return <AuthScreen mode="signup" />;
}

function AuthScreen({ mode }: { mode: AuthMode }) {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<Phase>("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = copy[mode];

  if (session.isPending) {
    return <LoadingShell />;
  }
  if (session.data?.user) {
    return <Navigate to="/library" replace />;
  }

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
          <div className="t-label-s text-paper-500">{c.eyebrow}</div>
          <h1 className="mt-3 whitespace-pre-line font-display text-[44px] font-normal leading-[1.04] tracking-normal text-paper-900 sm:text-[56px]">
            {c.title}
          </h1>
          <p className="t-body-l mt-4 text-paper-700">{c.lead}</p>

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
                {busy ? "Sending..." : c.submit}
              </Button>
            </form>
          </div>

          <p className="t-body-m mt-6 text-paper-500">
            {c.switchLead}{" "}
            <Link
              to={c.switchTo}
              className="font-medium text-paper-900 underline underline-offset-4"
            >
              {c.switchAction}
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

function LoadingShell() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 text-paper-900">
      <span className="t-body-m text-paper-500">Loading...</span>
    </main>
  );
}

function SocialButtons() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Button
        variant="secondary"
        size="lg"
        onClick={() => authClient.signIn.social({ provider: "google" })}
        iconStart={<GoogleMark />}
      >
        Continue with Google
      </Button>
      <Button
        size="lg"
        onClick={() => authClient.signIn.social({ provider: "apple" })}
        iconStart={<AppleMark />}
      >
        Continue with Apple
      </Button>
    </div>
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

function AuthVisual() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-paper-100 px-14 py-14 lg:flex">
      <div className="m-auto max-w-[520px] opacity-50">
        <div className="text-center font-display text-[22px] font-medium leading-tight text-paper-900">
          Chapter 01
        </div>
        <div className="mt-2 text-center font-display text-[24px] font-normal leading-tight text-paper-900">
          The Psychopathology of Everyday Things
        </div>
        <p className="mt-6 font-reading text-[18px] leading-[1.7] text-paper-900">
          Signifiers are the most important addition to the chapter.{" "}
          <mark className="bd-highlight">
            Affordances define what actions are possible. Signifiers specify how people discover
            those possibilities.
          </mark>{" "}
          Signifiers are of far more importance to designers than are affordances.
        </p>
      </div>

      <figure className="absolute bottom-14 left-14 right-14 m-0 rounded-xl bg-paper-50 px-8 py-7 shadow-[var(--sh-lg)]">
        <blockquote className="m-0 font-display text-[22px] font-normal leading-[1.25] tracking-normal text-paper-900">
          "Bainder is the first reader that feels like it's read the book with me."
        </blockquote>
        <figcaption className="mt-4 flex items-center gap-3">
          <span className="h-7 w-7 rounded-full bg-paper-200" />
          <span className="t-body-s text-paper-600">Maya - early reader</span>
        </figcaption>
      </figure>
    </aside>
  );
}

function OtpScreen({
  email,
  otp,
  busy,
  error,
  onOtpChange,
  onBack,
  onSubmit,
}: {
  email: string;
  otp: string;
  busy: boolean;
  error: string | null;
  onOtpChange: (value: string) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-paper-50 px-6 py-8 text-paper-900 sm:px-16 sm:py-10">
      <button type="button" onClick={onBack} className="w-fit border-0 bg-transparent p-0">
        <Wordmark size="md" />
      </button>

      <form
        onSubmit={onSubmit}
        className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center py-12 text-center"
      >
        <div className="t-label-s text-paper-500">STEP 02 / VERIFY</div>
        <h1 className="mt-3 font-display text-[44px] font-normal leading-[1.04] tracking-normal text-paper-900 sm:text-[56px]">
          Check your inbox.
        </h1>
        <p className="t-body-l mt-4 max-w-[440px] text-paper-700">
          We sent a 6-digit code to <strong className="font-medium text-paper-900">{email}</strong>.
          It expires in 10 minutes.
        </p>

        <OtpBoxes value={otp} onChange={onOtpChange} />

        <div className="mt-8 flex w-full max-w-[360px] flex-col items-center gap-3">
          <Button type="submit" size="lg" disabled={busy || otp.length < 4} className="w-full">
            {busy ? "Verifying..." : "Verify & continue"}
          </Button>
          <button type="button" className="t-label-m border-0 bg-transparent p-0 text-paper-700">
            Resend code 0:42
          </button>
        </div>

        {error && <p className="t-body-s mt-4 text-error">{error}</p>}

        <div className="mt-9 inline-flex items-center gap-3 rounded-md bg-paper-100 px-5 py-3">
          <Icons.Sparkles size={16} color="var(--wine-700)" />
          <span className="t-body-s text-paper-700">
            Tip: paste your code anywhere in the row - we'll auto-fill.
          </span>
        </div>
      </form>
    </main>
  );
}

function OtpBoxes({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  return (
    <div className="relative mt-10 flex gap-2 sm:gap-3" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        aria-label="Verification code"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        maxLength={6}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      {digits.map((digit, index) => {
        const active = index === Math.min(value.length, 5);
        return (
          <span
            key={index}
            className={[
              "flex h-14 w-12 items-center justify-center rounded-md border bg-paper-100 font-display text-[28px] font-medium leading-none text-paper-900 sm:h-16 sm:w-14 sm:text-[32px]",
              active ? "border-paper-900" : "border-transparent",
            ].join(" ")}
          >
            {digit.trim() ? digit : active ? <span className="h-7 w-px bg-paper-900" /> : null}
          </span>
        );
      })}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.06-1.36-.18-2H12v3.78h5.4a4.62 4.62 0 0 1-2 3.04v2.52h3.24c1.9-1.74 2.96-4.32 2.96-7.34z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.52c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.06v2.6A10 10 0 0 0 12 22z"
      />
      <path fill="#FBBC05" d="M6.42 13.9a6.04 6.04 0 0 1 0-3.8V7.5H3.06a10 10 0 0 0 0 9z" />
      <path
        fill="#EA4335"
        d="M12 5.98c1.46 0 2.78.5 3.82 1.5l2.86-2.86C16.94 2.98 14.7 2 12 2A10 10 0 0 0 3.06 7.5l3.36 2.6C7.2 7.74 9.4 5.98 12 5.98z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.6-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.2 1-4.1 2.5-1.7 3-.4 7.4 1.3 9.8.8 1.2 1.8 2.5 3.1 2.5 1.2 0 1.7-.8 3.2-.8 1.5 0 2 .8 3.3.8 1.4 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-3.8zM14 5.4c.7-.8 1.1-1.9 1-3-.9 0-2.1.6-2.7 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2-.5 2.7-1.3z" />
    </svg>
  );
}
