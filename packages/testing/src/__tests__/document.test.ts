import { beforeAll, describe, expect, test } from "bun:test";
import { resetState, signInAs } from "../lib/client";
import { asFile, buildEpub, buildEpubWithImage } from "../lib/fixtures";
import { waitForProcessed } from "../lib/polling";

// Per-test budget for upload + workflow processing. The polling helper itself
// caps at 30s; we add a little headroom for sign-in + the final read-back.
const UPLOAD_TIMEOUT_MS = 45000;

describe("document", () => {
  beforeAll(async () => {
    await resetState();
  });

  test(
    "EPUB upload → processed → read back chapters + raw",
    async () => {
      const { client } = await signInAs("epub-reader@baindar.test");

      const upload = await client.document.create({
        file: asFile(buildEpub(), "book.epub", "application/epub+zip"),
        sensitive: "false",
      });
      expect(upload.error).toBeUndefined();
      expect(upload.data).toBeDefined();
      if (!upload.data) throw new Error("no upload data");

      expect(upload.data.kind).toBe("epub");
      expect(upload.data.status).toBe("processing");
      expect(upload.data.originalFilename).toBe("book.epub");
      expect(upload.data.sizeBytes).toBeGreaterThan(0);
      expect(upload.data.sha256).toMatch(/^[0-9a-f]{64}$/);

      const documentId = upload.data.id;
      const terminal = await waitForProcessed(client, documentId);
      expect(terminal.status).toBe("processed");
      expect(terminal.errorReason).toBeNull();

      const get = await client.document.get({ id: documentId });
      expect(get.error).toBeUndefined();
      expect(get.data?.status).toBe("processed");
      expect(get.data?.title).toBe("Baindar Test Book");

      const manifest = await client.document.getManifest({ id: documentId });
      expect(manifest.error).toBeUndefined();
      expect(manifest.data?.kind).toBe("epub");
      expect(manifest.data?.chapterCount).toBe(2);
      expect(manifest.data?.sections).toHaveLength(2);
      // Section titles come from the TOC's navLabel, not the section <h1>.
      expect(manifest.data?.sections[0]?.title).toBe("The Beginning");
      expect(manifest.data?.sections[1]?.title).toBe("The End");
      if (manifest.data?.kind === "epub") {
        expect(manifest.data.toc.length).toBeGreaterThan(0);
      }

      const sectionHtml = await client.document.getSectionHtml({
        id: documentId,
        order: "0",
      });
      expect(sectionHtml.error).toBeUndefined();
      const html = typeof sectionHtml.data === "string" ? sectionHtml.data : "";
      expect(html).toContain("Chapter One");
      // Sanitized: <script> stripped, inline <style> stripped.
      expect(html.toLowerCase()).not.toContain("<script");
      expect(html.toLowerCase()).not.toContain("<style");

      const sectionText = await client.document.getSectionText({
        id: documentId,
        order: "0",
      });
      expect(sectionText.error).toBeUndefined();
      const text = typeof sectionText.data === "string" ? sectionText.data : "";
      expect(text).toContain("Hello world");

      const raw = await client.document.getRaw({ id: documentId });
      expect(raw.error).toBeUndefined();
      // Raw responder yields a Blob; we just want a non-empty body.
      const rawBytes = raw.data instanceof Blob ? await raw.data.arrayBuffer() : null;
      expect(rawBytes).not.toBeNull();
      expect(rawBytes?.byteLength).toBeGreaterThan(0);

      const list = await client.document.list();
      expect(list.error).toBeUndefined();
      expect(list.data?.items.find((d) => d.id === documentId)).toBeDefined();
    },
    UPLOAD_TIMEOUT_MS,
  );

  test(
    "EPUB with image stores asset reachable via getAsset",
    async () => {
      const { client } = await signInAs("epub-image@baindar.test");

      const upload = await client.document.create({
        file: asFile(buildEpubWithImage(), "image-book.epub", "application/epub+zip"),
      });
      if (!upload.data) throw new Error("no upload data");
      const documentId = upload.data.id;

      const terminal = await waitForProcessed(client, documentId);
      expect(terminal.status).toBe("processed");

      const fetched = await client.document.get({ id: documentId });
      expect(fetched.error).toBeUndefined();
      expect(fetched.data?.coverImage).toBe("assets/cover.jpg");

      const manifest = await client.document.getManifest({ id: documentId });
      expect(manifest.error).toBeUndefined();
      expect(manifest.data?.coverImage).toBe("assets/cover.jpg");

      const asset = await client.document.getAsset({ id: documentId, name: "cover.jpg" });
      expect(asset.error).toBeUndefined();
      const bytes = asset.data instanceof Blob ? await asset.data.arrayBuffer() : null;
      expect(bytes?.byteLength).toBeGreaterThan(0);
    },
    UPLOAD_TIMEOUT_MS,
  );

  test(
    "DELETE removes document and read-back returns 404",
    async () => {
      const { client } = await signInAs("deleter@baindar.test");

      const upload = await client.document.create({
        file: asFile(buildEpub(), "tmp.epub", "application/epub+zip"),
      });
      if (!upload.data) throw new Error("no upload data");
      const documentId = upload.data.id;
      await waitForProcessed(client, documentId);

      const del = await client.document.delete({ id: documentId });
      expect(del.error).toBeUndefined();

      const after = await client.document.get({ id: documentId });
      expect(after.error).toBeDefined();
      expect(after.response.status).toBe(404);
    },
    UPLOAD_TIMEOUT_MS,
  );
});
