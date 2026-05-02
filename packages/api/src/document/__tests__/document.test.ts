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

// Synthesizes an EPUB with `chapterCount` spine entries — used to cover
// many-chapter ingest paths and confirm the pipeline scales beyond a
// trivial book.
const buildLargeEpub = (chapterCount: number): Uint8Array => {
  const ids = Array.from({ length: chapterCount }, (_, i) => `ch${i + 1}`);
  const manifestItems = ids
    .map((id) => `<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join("");
  const spineItems = ids.map((id) => `<itemref idref="${id}"/>`).join("");
  const largeOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:large-test</dc:identifier>
    <dc:title>Large Book</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Test Author</dc:creator>
  </metadata>
  <manifest>${manifestItems}</manifest>
  <spine>${spineItems}</spine>
</package>`;
  const files: Record<string, Uint8Array> = {
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(largeOpf),
  };
  for (let i = 0; i < chapterCount; i++) {
    files[`OEBPS/${ids[i]}.xhtml`] = strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter ${i + 1}</h1><p>Body of chapter ${i + 1}.</p></body></html>`);
  }
  return zipSync(files);
};

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

// Drain a ReadableStream<Uint8Array> into a string for assertions on
// section HTML/text endpoints (which now stream R2 objects directly).
const streamToText = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder().decode(out);
};

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
      expect(after.coverImage).toBeNull();
      expect(after.sourceUrl).toBeNull();

      const manifest = await Document.getManifest(userA, created.id);
      expect(manifest.kind).toBe("epub");
      expect(manifest.schemaVersion).toBe(1);
      expect(manifest.title).toBe("Test Book");
      expect(manifest.language).toBe("en");
      expect(manifest.chapterCount).toBe(2);
      if (manifest.kind !== "epub") throw new Error("expected epub manifest");
      expect(manifest.metadata.authors).toEqual(["Ada Lovelace", "Charles Babbage"]);
      expect(manifest.metadata.publisher).toBe("Test House");
      expect(manifest.metadata.publishedDate).toBe("2026-01-01");
      expect(manifest.metadata.identifiers).toContain("urn:uuid:test-1");
      expect(manifest.metadata.subjects).toContain("fiction");
      expect(manifest.sections).toHaveLength(2);
      expect(manifest.sections[0].title).toBe("The Beginning");
      expect(manifest.sections[1].title).toBe("The End");
      expect(manifest.sections[0].sectionKey).toBe("epub:section:0");
      expect(manifest.sections[1].sectionKey).toBe("epub:section:1");
      expect(manifest.sections[0].files.html).toMatch(/^content\/0000-the-beginning\.html$/);
      expect(manifest.sections[0].files.text).toMatch(/^content\/0000-the-beginning\.txt$/);
      expect(manifest.toc[0].fileHref).toBe("ch1.xhtml");
    });
  });

  it("returns section content with cleaned HTML and AI-ready text", async () => {
    await runtime.runAs(userA, async () => {
      const created = await uploadEpub(userA);

      const html = await Document.getSectionHtml(userA, created.id, 0);
      const htmlBody = await streamToText(html.body);
      expect(html.contentType).toMatch(/^text\/html/);
      expect(htmlBody).not.toContain("<script");
      expect(htmlBody).not.toContain("<style");
      expect(htmlBody).toContain("Chapter One");

      const text = await Document.getSectionText(userA, created.id, 0);
      const textBody = await streamToText(text.body);
      expect(text.contentType).toMatch(/^text\/plain/);
      expect(textBody).toContain("Hello world & welcome.");
      expect(textBody).not.toContain("<");
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

  it("rejects a PDF — only EPUB is supported for now", async () => {
    await runtime.runAs(userA, async () => {
      // "%PDF-1.4" header — the previous detector would have classified this
      // as `pdf`; the EPUB-only gate must reject it.
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
      await expect(
        Document.create(
          {
            userId: userA,
            bytes: pdfBytes,
            filename: "doc.pdf",
            declaredMimeType: "application/pdf",
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
      await expect(Document.getManifest(userB, created.id)).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
      await expect(Document.getSectionHtml(userB, created.id, 0)).rejects.toMatchObject({
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

  it("renames a document and rejects renaming someone else's", async () => {
    const created = await runtime.runAs(userA, () => uploadEpub(userA));

    await runtime.runAs(userA, async () => {
      const renamed = await Document.update(userA, created.id, { title: "My New Title" });
      expect(renamed.title).toBe("My New Title");
      const fetched = await Document.get(userA, created.id);
      expect(fetched.title).toBe("My New Title");
    });

    await runtime.runAs(userB, async () => {
      await expect(Document.update(userB, created.id, { title: "Hacked" })).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
    });
  });

  it("extracts EPUB images to R2, rewrites section HTML to assets/{name}, and stores cover on document", async () => {
    await runtime.runAs(userA, async () => {
      const created = await uploadEpub(userA, buildImageEpub(), "with-pics.epub");
      const fetched = await Document.get(userA, created.id);
      expect(fetched.coverImage).toBe("assets/cover.jpg");

      const manifest = await Document.getManifest(userA, created.id);
      expect(manifest.coverImage).toBe("assets/cover.jpg");

      const html = await Document.getSectionHtml(userA, created.id, 0);
      const htmlBody = await streamToText(html.body);
      expect(htmlBody).toContain('src="assets/cover.jpg"');

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

  it("ingests an EPUB with many chapters", async () => {
    await runtime.runAs(userA, async () => {
      const created = await uploadEpub(userA, buildLargeEpub(60), "large.epub");
      const after = await Document.get(userA, created.id);
      expect(after.status).toBe("processed");

      const manifest = await Document.getManifest(userA, created.id);
      expect(manifest.chapterCount).toBe(60);
      expect(manifest.sections).toHaveLength(60);

      const last = await Document.getSectionText(userA, created.id, 59);
      const lastText = await streamToText(last.body);
      expect(lastText).toContain("Body of chapter 60");
    });
  });

  it("re-running the pipeline on the same document is idempotent", async () => {
    await runtime.runAs(userA, async () => {
      const created = await uploadEpub(userA);
      // Re-invoking processDocument simulates a Workflow retry. The
      // pipeline purges + rewrites manifest + content, so a second run
      // ends in the same state.
      await processDocument(created.id);
      const manifest = await Document.getManifest(userA, created.id);
      expect(manifest.chapterCount).toBe(2);
      expect(manifest.sections).toHaveLength(2);
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
