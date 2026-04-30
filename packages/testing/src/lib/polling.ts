import type { ApiClient, DocumentStatus } from "@bainder/sdk";

// Poll the status endpoint until the workflow reports a terminal state.
// Returns the terminal DocumentStatus (caller decides whether `failed` is
// acceptable). Throws on timeout or transport failure.
export const waitForProcessed = async (
  client: ApiClient,
  documentId: string,
  timeoutMs = 30000,
): Promise<DocumentStatus> => {
  const intervalMs = 200;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await client.document.getStatus({ id: documentId });
    if (res.error) {
      throw new Error(`getStatus failed for ${documentId}: ${JSON.stringify(res.error)}`);
    }
    if (!res.data) {
      throw new Error(`getStatus returned no data for ${documentId}`);
    }
    if (res.data.status === "processed" || res.data.status === "failed") {
      return res.data;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for document ${documentId} to reach a terminal status`,
  );
};
