import { beforeAll, describe, expect, test } from "bun:test";
import { createTestClient, resetState, signInAs } from "../lib/client";
import { asFile, buildBrokenEpub, buildText } from "../lib/fixtures";
import { waitForProcessed } from "../lib/polling";

const UPLOAD_TIMEOUT_MS = 45000;

describe("document errors", () => {
  beforeAll(async () => {
    await resetState();
  });

  test("401 when not authenticated", async () => {
    const anon = createTestClient();
    const list = await anon.document.list();
    expect(list.error).toBeDefined();
    expect(list.response.status).toBe(401);
  });

  test("400 when uploading an empty file", async () => {
    const { client } = await signInAs("empty@bainder.test");
    const empty = new File([new Uint8Array(0)], "empty.txt", { type: "text/plain" });
    const upload = await client.document.create({ file: empty });
    expect(upload.error).toBeDefined();
    expect(upload.response.status).toBe(400);
  });

  test("415 when uploading an unsupported format", async () => {
    const { client } = await signInAs("unsupported@bainder.test");
    // Random bytes, .bin extension, octet-stream — nothing matches.
    const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xab, 0xcd, 0xef]);
    const upload = await client.document.create({
      file: asFile(bytes, "blob.bin", "application/octet-stream"),
    });
    expect(upload.error).toBeDefined();
    expect(upload.response.status).toBe(415);
  });

  test("404 when fetching an unknown document id", async () => {
    const { client } = await signInAs("notfound@bainder.test");
    const get = await client.document.get({ id: crypto.randomUUID() });
    expect(get.error).toBeDefined();
    expect(get.response.status).toBe(404);
  });

  test("404 when deleting an unknown document id", async () => {
    const { client } = await signInAs("delete-missing@bainder.test");
    const del = await client.document.delete({ id: crypto.randomUUID() });
    expect(del.error).toBeDefined();
    expect(del.response.status).toBe(404);
  });

  test(
    "404 when calling a format route with the wrong kind",
    async () => {
      const { client } = await signInAs("wrongkind@bainder.test");
      const upload = await client.document.create({
        file: asFile(buildText("text doc"), "doc.txt", "text/plain"),
      });
      if (!upload.data) throw new Error("no upload data");
      const documentId = upload.data.id;
      await waitForProcessed(client, documentId);

      // Text doc isn't an EPUB → WrongKindError → 404.
      const detail = await client.document.getEpubDetail({ id: documentId });
      expect(detail.error).toBeDefined();
      expect(detail.response.status).toBe(404);

      // Same for PDF/image format routes.
      const pdf = await client.document.getPdfDetail({ id: documentId });
      expect(pdf.response.status).toBe(404);
      const image = await client.document.getImage({ id: documentId });
      expect(image.response.status).toBe(404);
    },
    UPLOAD_TIMEOUT_MS,
  );

  test("409 when reading a format route on a failed document", async () => {
    const { client } = await signInAs("failed@bainder.test");
    // Broken EPUB: passes signature detection, but parse step throws → workflow
    // marks the row as `failed` with errorReason set. The workflow retries 3
    // times with exponential 5s backoff before giving up (≈35s), so we wait
    // longer than the happy-path tests here.
    const upload = await client.document.create({
      file: asFile(buildBrokenEpub(), "broken.epub", "application/epub+zip"),
    });
    if (!upload.data) throw new Error("no upload data");
    expect(upload.data.kind).toBe("epub");
    const documentId = upload.data.id;

    const terminal = await waitForProcessed(client, documentId, 75000);
    expect(terminal.status).toBe("failed");
    expect(terminal.errorReason).not.toBeNull();

    // status !== "processed" → NotProcessedError → 409.
    const detail = await client.document.getEpubDetail({ id: documentId });
    expect(detail.error).toBeDefined();
    expect(detail.response.status).toBe(409);
  }, 90000);

  test("400 when EPUB chapter order is invalid", async () => {
    const { client } = await signInAs("badorder@bainder.test");
    // Route validates the order param before hitting the feature, so it 400s
    // even on a non-existent document — a real document isn't required.
    const chapter = await client.document.getEpubChapter({
      id: crypto.randomUUID(),
      order: "-1",
    });
    expect(chapter.error).toBeDefined();
    expect(chapter.response.status).toBe(400);
  });

  test("400 when PDF page number is invalid", async () => {
    const { client } = await signInAs("badpage@bainder.test");
    const page = await client.document.getPdfPage({
      id: crypto.randomUUID(),
      page: "0",
    });
    expect(page.error).toBeDefined();
    expect(page.response.status).toBe(400);
  });

  test(
    "ownership isolation: user B cannot see user A's document",
    async () => {
      const a = await signInAs("alice@bainder.test");
      const b = await signInAs("bob@bainder.test");

      const upload = await a.client.document.create({
        file: asFile(buildText("alice's data"), "alice.txt", "text/plain"),
      });
      if (!upload.data) throw new Error("no upload data");
      const documentId = upload.data.id;
      await waitForProcessed(a.client, documentId);

      // Bob's list never sees the row.
      const bobList = await b.client.document.list();
      expect(bobList.data?.items.find((d) => d.id === documentId)).toBeUndefined();

      // Bob's direct fetch returns 404 (not 403; we don't disclose existence).
      const bobGet = await b.client.document.get({ id: documentId });
      expect(bobGet.response.status).toBe(404);

      const bobStatus = await b.client.document.getStatus({ id: documentId });
      expect(bobStatus.response.status).toBe(404);

      const bobText = await b.client.document.getText({ id: documentId });
      expect(bobText.response.status).toBe(404);

      const bobDelete = await b.client.document.delete({ id: documentId });
      expect(bobDelete.response.status).toBe(404);

      // Alice still owns her doc after Bob's failed delete.
      const stillThere = await a.client.document.get({ id: documentId });
      expect(stillThere.error).toBeUndefined();
      expect(stillThere.data?.id).toBe(documentId);
    },
    UPLOAD_TIMEOUT_MS,
  );
});
