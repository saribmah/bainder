import type { InputHTMLAttributes, KeyboardEvent } from "react";
import { Icons } from "../icons/index.ts";
import { cx } from "../utils/cx.ts";

export type AISheetInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  onSend?: () => void;
  sendDisabled?: boolean;
  sendLabel?: string;
  wrapClassName?: string;
};

export function AISheetInput({
  onSend,
  sendDisabled,
  sendLabel = "Send",
  className,
  wrapClassName,
  onKeyDown,
  placeholder = "Ask anything…",
  ...rest
}: AISheetInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.key === "Enter" && !event.shiftKey && !event.defaultPrevented && !sendDisabled) {
      event.preventDefault();
      onSend?.();
    }
  };

  const handleSend = () => {
    if (!sendDisabled) onSend?.();
  };

  return (
    <div className={cx("bd-ai-input", wrapClassName)}>
      <input
        type="text"
        placeholder={placeholder}
        className={className}
        onKeyDown={handleKeyDown}
        {...rest}
      />
      <button
        type="button"
        aria-label={sendLabel}
        disabled={sendDisabled}
        onClick={handleSend}
        className="bd-ai-input-send"
      >
        <Icons.Send size={12} />
      </button>
    </div>
  );
}
