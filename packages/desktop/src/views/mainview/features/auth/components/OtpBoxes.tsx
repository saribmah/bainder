import { useRef } from "react";

export function OtpBoxes({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
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
              "flex h-14 w-12 items-center justify-center rounded-md border bg-bd-surface-raised font-display text-[28px] font-medium leading-none text-bd-fg sm:h-16 sm:w-14 sm:text-[32px]",
              active ? "border-bd-fg" : "border-transparent",
            ].join(" ")}
          >
            {digit.trim() ? digit : active ? <span className="h-7 w-px bg-bd-action" /> : null}
          </span>
        );
      })}
    </div>
  );
}
