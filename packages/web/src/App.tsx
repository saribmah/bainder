import { useEffect, useState } from "react";
import { useSdk } from "./sdk";

export function App() {
  const { client } = useSdk();
  const [status, setStatus] = useState<string>("loading...");
  const [examples, setExamples] = useState<string[]>([]);

  useEffect(() => {
    client.health
      .get()
      .then((res) => setStatus(res.data?.status ?? "unknown"))
      .catch((err: unknown) => setStatus(`error: ${String(err)}`));

    client.example
      .list()
      .then((res) => setExamples((res.data?.items ?? []).map((i) => i.name)))
      .catch(() => setExamples([]));
  }, [client]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-neutral-100">
      <h1 className="text-3xl">{"{{APP_NAME}}"}</h1>
      <p className="text-sm text-neutral-400">API health: {status}</p>
      <p className="text-sm text-neutral-400">
        Examples: {examples.length === 0 ? "(none)" : examples.join(", ")}
      </p>
    </main>
  );
}
