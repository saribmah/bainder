import { useEffect, useState } from "react";
import type { BillingStatus } from "@baindar/sdk";
import { useSdk } from "../../../sdk/sdk.provider";

// Mirrors the web/desktop useBillingStatus. Vanilla useState + useEffect +
// cancellation flag — matches every other data hook in this package. No
// React Query / SWR in the mobile codebase.
export function useBillingStatus() {
  const { client } = useSdk();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.billing
      .me()
      .then((res) => {
        if (cancelled) return;
        if (res.data) {
          setBilling(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  return { billing, error, loading };
}
