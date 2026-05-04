import { Button } from "@baindar/ui";
import { authClient } from "../auth.client";

export function SocialButtons() {
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
