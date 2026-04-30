import { beforeAll, describe, expect, test } from "bun:test";
import { resetState, signInAs } from "../lib/client";
import {
  asFile,
  buildEpub,
  buildEpubWithImage,
  buildPdf,
  buildText,
  onePxPng,
} from "../lib/fixtures";
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
      const { client } = await signInAs("epub-reader@bainder.test");

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
      expect(get.data?.title).toBe("Bainder Test Book");

      const detail = await client.document.getEpubDetail({ id: documentId });
      expect(detail.error).toBeUndefined();
      expect(detail.data?.book.documentId).toBe(documentId);
      expect(detail.data?.book.chapterCount).toBe(2);
      expect(detail.data?.chapters).toHaveLength(2);
      expect(detail.data?.toc.length).toBeGreaterThan(0);
      // Chapter titles come from the TOC's navLabel, not the chapter <h1>.
      expect(detail.data?.chapters[0]?.title).toBe("The Beginning");
      expect(detail.data?.chapters[1]?.title).toBe("The End");

      const chapter = await client.document.getEpubChapter({
        id: documentId,
        order: "0",
      });
      expect(chapter.error).toBeUndefined();
      expect(chapter.data?.html).toContain("Chapter One");
      expect(chapter.data?.text).toContain("Hello world");
      // Sanitized: <script> stripped, inline <style> stripped.
      expect(chapter.data?.html.toLowerCase()).not.toContain("<script");
      expect(chapter.data?.html.toLowerCase()).not.toContain("<style");

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
      const { client } = await signInAs("epub-image@bainder.test");

      const upload = await client.document.create({
        file: asFile(buildEpubWithImage(), "image-book.epub", "application/epub+zip"),
      });
      if (!upload.data) throw new Error("no upload data");
      const documentId = upload.data.id;

      const terminal = await waitForProcessed(client, documentId);
      expect(terminal.status).toBe("processed");

      const detail = await client.document.getEpubDetail({ id: documentId });
      expect(detail.error).toBeUndefined();
      expect(detail.data?.book.coverImage).toBe("assets/cover.jpg");

      const asset = await client.document.getAsset({ id: documentId, name: "cover.jpg" });
      expect(asset.error).toBeUndefined();
      const bytes = asset.data instanceof Blob ? await asset.data.arrayBuffer() : null;
      expect(bytes?.byteLength).toBeGreaterThan(0);
    },
    UPLOAD_TIMEOUT_MS,
  );

  test(
    "PDF upload → processed → read pages",
    async () => {
      const { client } = await signInAs("pdf-reader@bainder.test");

      const upload = await client.document.create({
        file: asFile(buildPdf(), "doc.pdf", "application/pdf"),
      });
      if (!upload.data) throw new Error("no upload data");
      expect(upload.data.kind).toBe("pdf");
      const documentId = upload.data.id;

      const terminal = await waitForProcessed(client, documentId);
      expect(terminal.status).toBe("processed");

      const detail = await client.document.getPdfDetail({ id: documentId });
      expect(detail.error).toBeUndefined();
      expect(detail.data?.pdf.pageCount).toBe(1);
      expect(detail.data?.pages).toHaveLength(1);

      const page = await client.document.getPdfPage({ id: documentId, page: "1" });
      expect(page.error).toBeUndefined();
      expect(page.data?.pageNumber).toBe(1);
      expect(typeof page.data?.text).toBe("string");
    },
    UPLOAD_TIMEOUT_MS,
  );

  test(
    "Image upload → processed → image metadata reports dimensions",
    async () => {
      const { client } = await signInAs("image-reader@bainder.test");

      const upload = await client.document.create({
        file: asFile(onePxPng(), "pixel.png", "image/png"),
      });
      if (!upload.data) throw new Error("no upload data");
      expect(upload.data.kind).toBe("image");
      const documentId = upload.data.id;

      const terminal = await waitForProcessed(client, documentId);
      expect(terminal.status).toBe("processed");

      const meta = await client.document.getImage({ id: documentId });
      expect(meta.error).toBeUndefined();
      expect(meta.data?.format).toBe("png");
      expect(meta.data?.width).toBe(1);
      expect(meta.data?.height).toBe(1);
    },
    UPLOAD_TIMEOUT_MS,
  );

  test(
    "Text upload → processed → text content readable",
    async () => {
      const { client } = await signInAs("text-reader@bainder.test");
      const content = "Hello Bainder.\nLine two.";

      const upload = await client.document.create({
        file: asFile(buildText(content), "notes.txt", "text/plain"),
      });
      if (!upload.data) throw new Error("no upload data");
      expect(upload.data.kind).toBe("text");
      const documentId = upload.data.id;

      const terminal = await waitForProcessed(client, documentId);
      expect(terminal.status).toBe("processed");

      const text = await client.document.getText({ id: documentId });
      expect(text.error).toBeUndefined();
      expect(text.data?.text).toBe(content);
      expect(text.data?.charset.toLowerCase()).toContain("utf-8");
    },
    UPLOAD_TIMEOUT_MS,
  );

  test(
    "DELETE removes document and read-back returns 404",
    async () => {
      const { client } = await signInAs("deleter@bainder.test");

      const upload = await client.document.create({
        file: asFile(buildText("dispose me"), "tmp.txt", "text/plain"),
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
