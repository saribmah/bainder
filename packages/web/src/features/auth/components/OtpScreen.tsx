import type { FormEvent } from "react";
import { Button, Icons, Wordmark } from "@bainder/ui";
import { OtpBoxes } from "./OtpBoxes";

export function OtpScreen({
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
