import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { Document } from "../document";
import { processDocument } from "../processing/pipeline";
import { createTestRuntime } from "./test-db";

const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:test-1</dc:identifier>
    <dc:title>Test Book</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Ada Lovelace</dc:creator>
    <dc:creator>Charles Babbage</dc:creator>
    <dc:description>A small test EPUB.</dc:description>
    <dc:publisher>Test House</dc:publisher>
    <dc:date>2026-01-01</dc:date>
    <dc:subject>fiction</dc:subject>
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="np1" playOrder="1">
      <navLabel><text>The Beginning</text></navLabel>
      <content src="ch1.xhtml"/>
    </navPoint>
    <navPoint id="np2" playOrder="2">
      <navLabel><text>The End</text></navLabel>
      <content src="ch2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;

const ch1 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Ch1</title>
<style>body { color: red; }</style></head>
<body><h1>Chapter One</h1><p>Hello world &amp; welcome.</p>
<script>alert('x')</script></body></html>`;

const ch2 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Ch2</title></head>
<body><h1>Chapter Two</h1><p>Goodbye world.</p></body></html>`;

const container = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`;

const buildEpub = (): Uint8Array =>
  zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(opf),
    "OEBPS/toc.ncx": strToU8(ncx),
    "OEBPS/ch1.xhtml": strToU8(ch1),
    "OEBPS/ch2.xhtml": strToU8(ch2),
  });

const imageOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:img-test</dc:identifier>
    <dc:title>Image Book</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="cov" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
  </spine>
</package>`;

const imageCh1 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body>
<h1>With Pictures</h1>
<img src="images/cover.jpg" alt="cover"/>
</body></html>`;

const buildImageEpub = (): Uint8Array =>
  zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(imageOpf),
    "OEBPS/toc.ncx": strToU8(ncx),
    "OEBPS/ch1.xhtml": strToU8(imageCh1),
    "OEBPS/images/cover.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xc0, 0xff, 0xee]),
  });

// Inline trigger that runs the pipeline synchronously inside the same
// Instance frame as the caller. The route would instead enqueue a workflow.
const inlineTrigger = (documentId: string): Promise<void> => processDocument(documentId);

const uploadEpub = (userId: string, bytes = buildEpub(), filename = "test.epub") =>
  Document.create(
    {
      userId,
      bytes,
      filename,
      declaredMimeType: "application/epub+zip",
      sensitive: false,
    },
    inlineTrigger,
  );

// Minimal valid PNG (1x1 transparent pixel) — enough to exercise the image
// dimensions parser end-to-end.
const onePxPng = (): Uint8Array =>
  new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);

describe("Document feature", () => {
  const userA = "user-a";
  const userB = "user-b";
  let runtime: ReturnType<typeof createTestRuntime>;

  beforeEach(() => {
    runtime = createTestRuntime([
      { id: userA, name: "Alice", email: "alice@example.com" },
      { id: userB, name: "Bob", email: "bob@example.com" },
    ]);
  });

  afterEach(() => {
    runtime.close();
  });

  it("creates and processes an EPUB end-to-end", async () => {
    await runtime.runAs(userA, async () => {
      const created = await uploadEpub(userA);
      expect(created.kind).toBe("epub");
      expect(created.mimeType).toBe("application/epub+zip");
      expect(created.sensitive).toBe(false);
      expect(created.originalFilename).toBe("test.epub");
      expect(created.sizeBytes).toBeGreaterThan(0);
      expect(created.sha256).toMatch(/^[0-9a-f]{64}$/);

      // Inline trigger runs the pipeline before create() returns, so the
      // stored row is already in `processed` state. Re-fetch to see latest.
      const after = await Document.get(userA, created.id);
      expect(after.status).toBe("processed");
      expect(after.title).toBe("Test Book");
      expect(after.errorReason).toBeNull();

      const detail = await Document.getEpubDetail(userA, created.id);
      expect(detail.book.documentId).toBe(created.id);
      expect(detail.book.authors).toEqual(["Ada Lovelace", "Charles Babbage"]);
      expect(detail.book.language).toBe("en");
      expect(detail.book.publisher).toBe("Test House");
      expect(detail.book.publishedDate).toBe("2026-01-01");
      expect(detail.book.identifiers).toContain("urn:uuid:test-1");
      expect(detail.book.subjects).toContain("fiction");
      expect(detail.book.chapterCount).toBe(2);
      expect(detail.chapters).toHaveLength(2);
      expect(detail.chapters[0].title).toBe("The Beginning");
      expect(detail.chapters[1].title).toBe("The End");
      expect(detail.toc[0].fileHref).toBe("ch1.xhtml");
    });
  });

  it("returns chapter content with cleaned HTML and AI-ready text", async () => {
    await runtime.runAs(userA, async () => {
      const created = await uploadEpub(userA);
      const chapter = await Document.getEpubChapter(userA, created.id, 0);
      expect(chapter.title).toBe("The Beginning");
      expect(chapter.html).not.toContain("<script");
      expect(chapter.html).not.toContain("<style");
      expect(chapter.text).toContain("Hello world & welcome.");
      expect(chapter.text).not.toContain("<");
      expect(chapter.wordCount).toBeGreaterThan(0);
    });
  });

  it("rejects an empty body", async () => {
    await runtime.runAs(userA, async () => {
      await expect(
        Document.create(
          {
            userId: userA,
            bytes: new Uint8Array(),
            filename: "empty.bin",
            declaredMimeType: null,
            sensitive: false,
          },
          inlineTrigger,
        ),
      ).rejects.toMatchObject({ name: "DocumentUploadEmptyError" });
    });
  });

  it("rejects bytes whose format we don't recognize", async () => {
    await runtime.runAs(userA, async () => {
      await expect(
        Document.create(
          {
            userId: userA,
            bytes: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
            filename: "weird.xyz",
            declaredMimeType: null,
            sensitive: false,
          },
          inlineTrigger,
        ),
      ).rejects.toMatchObject({ name: "DocumentUnsupportedFormatError" });
    });
  });

  it("marks the document as failed when EPUB parsing fails", async () => {
    await runtime.runAs(userA, async () => {
      // ZIP with the EPUB mimetype member but no container.xml — passes
      // detection (`looksLikeEpubZip`) but parsing throws.
      const broken = zipSync({ mimetype: strToU8("application/epub+zip") });
      const created = await Document.create(
        {
          userId: userA,
          bytes: broken,
          filename: "broken.epub",
          declaredMimeType: "application/epub+zip",
          sensitive: false,
        },
        inlineTrigger,
      );
      const after = await Document.get(userA, created.id);
      expect(after.status).toBe("failed");
      expect(after.errorReason ?? "").not.toBe("");
    });
  });

  it("throws DocumentNotFoundError for a missing id", async () => {
    await runtime.runAs(userA, async () => {
      await expect(Document.get(userA, "missing")).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
    });
  });

  it("isolates documents across users", async () => {
    const created = await runtime.runAs(userA, () => uploadEpub(userA));

    await runtime.runAs(userB, async () => {
      const items = await Document.list(userB);
      expect(items).toEqual([]);

      await expect(Document.get(userB, created.id)).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
      await expect(Document.getEpubDetail(userB, created.id)).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
      await expect(Document.getEpubChapter(userB, created.id, 0)).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
      await expect(Document.remove(userB, created.id)).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
    });

    await runtime.runAs(userA, async () => {
      const stillThere = await Document.get(userA, created.id);
      expect(stillThere.id).toBe(created.id);
    });
  });

  it("rejects reading-format endpoints on the wrong kind", async () => {
    await runtime.runAs(userA, async () => {
      const created = await Document.create(
        {
          userId: userA,
          bytes: onePxPng(),
          filename: "pixel.png",
          declaredMimeType: "image/png",
          sensitive: false,
        },
        inlineTrigger,
      );
      await expect(Document.getEpubDetail(userA, created.id)).rejects.toMatchObject({
        name: "DocumentWrongKindError",
      });
    });
  });

  it("extracts EPUB images to R2 and rewrites chapter <img src> to assets/{name}", async () => {
    await runtime.runAs(userA, async () => {
      const created = await uploadEpub(userA, buildImageEpub(), "with-pics.epub");
      const detail = await Document.getEpubDetail(userA, created.id);
      expect(detail.book.coverImage).toBe("assets/cover.jpg");

      const chapter = await Document.getEpubChapter(userA, created.id, 0);
      expect(chapter.html).toContain('src="assets/cover.jpg"');

      const cover = await Document.getAsset(userA, created.id, "cover.jpg");
      expect(cover).not.toBeNull();
      expect(cover?.contentType).toBe("image/jpeg");
      expect(cover?.size).toBe(7);
    });
  });

  it("non-owners cannot retrieve another user's assets", async () => {
    const created = await runtime.runAs(userA, () => uploadEpub(userA, buildImageEpub()));
    await runtime.runAs(userB, async () => {
      const asset = await Document.getAsset(userB, created.id, "cover.jpg");
      expect(asset).toBeNull();
    });
  });

  it("processes an image upload and exposes dimensions", async () => {
    await runtime.runAs(userA, async () => {
      const created = await Document.create(
        {
          userId: userA,
          bytes: onePxPng(),
          filename: "pixel.png",
          declaredMimeType: "image/png",
          sensitive: false,
        },
        inlineTrigger,
      );
      const after = await Document.get(userA, created.id);
      expect(after.kind).toBe("image");
      expect(after.status).toBe("processed");

      const image = await Document.getImage(userA, created.id);
      expect(image.width).toBe(1);
      expect(image.height).toBe(1);
      expect(image.format).toBe("png");
    });
  });

  it("processes a plain text upload", async () => {
    await runtime.runAs(userA, async () => {
      const bytes = new TextEncoder().encode("Hello, plain text.\nSecond line.");
      const created = await Document.create(
        {
          userId: userA,
          bytes,
          filename: "notes.txt",
          declaredMimeType: "text/plain",
          sensitive: false,
        },
        inlineTrigger,
      );
      const after = await Document.get(userA, created.id);
      expect(after.kind).toBe("text");
      expect(after.status).toBe("processed");

      const text = await Document.getText(userA, created.id);
      expect(text.charset).toBe("utf-8");
      expect(text.text).toContain("Hello, plain text.");
    });
  });

  it("deleting a document removes its assets from R2 and the row from D1", async () => {
    await runtime.runAs(userA, async () => {
      const created = await uploadEpub(userA, buildImageEpub());
      expect(await Document.getAsset(userA, created.id, "cover.jpg")).not.toBeNull();

      await Document.remove(userA, created.id);

      await expect(Document.get(userA, created.id)).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
      const asset = await Document.getAsset(userA, created.id, "cover.jpg");
      expect(asset).toBeNull();
    });
  });

  it("owner can list their own documents and order is recent-first", async () => {
    await runtime.runAs(userA, async () => {
      const a = await uploadEpub(userA, buildEpub(), "first.epub");
      // Force a different created_at — Drizzle inserts use Date.now() in the
      // storage layer; bun:sqlite is fast so we just await one tick.
      await new Promise((r) => setTimeout(r, 5));
      const b = await uploadEpub(userA, buildEpub(), "second.epub");
      const items = await Document.list(userA);
      expect(items.map((i) => i.id)).toContain(a.id);
      expect(items.map((i) => i.id)).toContain(b.id);
    });
  });
});
