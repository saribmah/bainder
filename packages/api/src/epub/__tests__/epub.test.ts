import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { Epub } from "../epub";
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

describe("Epub feature", () => {
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

  it("ingests a valid EPUB and exposes metadata + chapters + TOC", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildEpub());
      expect(entity.title).toBe("Test Book");
      expect(entity.authors).toEqual(["Ada Lovelace", "Charles Babbage"]);
      expect(entity.language).toBe("en");
      expect(entity.publisher).toBe("Test House");
      expect(entity.publishedDate).toBe("2026-01-01");
      expect(entity.identifiers).toContain("urn:uuid:test-1");
      expect(entity.subjects).toContain("fiction");
      expect(entity.chapterCount).toBe(2);
      expect(entity.wordCount).toBeGreaterThan(0);

      const detail = await Epub.getDetail(userA, entity.id);
      expect(detail.chapters).toHaveLength(2);
      expect(detail.chapters[0].title).toBe("The Beginning");
      expect(detail.chapters[1].title).toBe("The End");
      expect(detail.toc[0].title).toBe("The Beginning");
      expect(detail.toc[0].fileHref).toBe("ch1.xhtml");
      expect(detail.toc[0].depth).toBe(0);
      expect(detail.toc[0].parent).toBeNull();
    });
  });

  it("returns chapter content with cleaned HTML and AI-ready text", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildEpub());
      const chapter = await Epub.getChapter(userA, entity.id, 0);
      expect(chapter.title).toBe("The Beginning");
      expect(chapter.html).not.toContain("<script");
      expect(chapter.html).not.toContain("<style");
      expect(chapter.text).toContain("Hello world & welcome.");
      expect(chapter.text).not.toContain("<");
      expect(chapter.wordCount).toBeGreaterThan(0);
    });
  });

  it("assembles AI context across chapters in default range", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildEpub());
      const ctx = await Epub.getContext(userA, entity.id, {});
      expect(ctx.bookId).toBe(entity.id);
      expect(ctx.from).toBe(0);
      expect(ctx.to).toBe(1);
      expect(ctx.chapterCount).toBe(2);
      expect(ctx.format).toBe("text");
      expect(ctx.context).toContain("Title: Test Book");
      expect(ctx.context).toContain("The Beginning");
      expect(ctx.context).toContain("The End");
      expect(ctx.context).toContain("Hello world & welcome.");
    });
  });

  it("supports a chapter range and markdown format", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildEpub());
      const ctx = await Epub.getContext(userA, entity.id, { from: 1, to: 1, format: "markdown" });
      expect(ctx.from).toBe(1);
      expect(ctx.to).toBe(1);
      expect(ctx.chapterCount).toBe(1);
      expect(ctx.context).toContain("# Test Book");
      expect(ctx.context).toContain("## The End");
      expect(ctx.context).not.toContain("The Beginning");
    });
  });

  it("rejects bytes that aren't a valid ZIP", async () => {
    await runtime.runAs(userA, async () => {
      const garbage = new TextEncoder().encode("not an epub");
      await expect(Epub.ingest(userA, garbage)).rejects.toMatchObject({
        name: "EpubInvalidFormatError",
      });
    });
  });

  it("rejects ZIPs missing META-INF/container.xml", async () => {
    await runtime.runAs(userA, async () => {
      const empty = zipSync({ mimetype: strToU8("application/epub+zip") });
      await expect(Epub.ingest(userA, empty)).rejects.toMatchObject({
        name: "EpubInvalidFormatError",
      });
    });
  });

  it("throws EpubNotFoundError for missing book id", async () => {
    await runtime.runAs(userA, async () => {
      await expect(Epub.get(userA, "missing")).rejects.toMatchObject({
        name: "EpubNotFoundError",
      });
    });
  });

  it("throws EpubChapterNotFoundError for out-of-range chapter", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildEpub());
      await expect(Epub.getChapter(userA, entity.id, 999)).rejects.toMatchObject({
        name: "EpubChapterNotFoundError",
      });
    });
  });

  it("isolates books across users — user B cannot see or touch user A's book", async () => {
    const entity = await runtime.runAs(userA, () => Epub.ingest(userA, buildEpub()));

    await runtime.runAs(userB, async () => {
      // list returns nothing for user B
      const items = await Epub.list(userB);
      expect(items).toEqual([]);

      // direct lookups return 404 (mapped from EpubNotFoundError)
      await expect(Epub.get(userB, entity.id)).rejects.toMatchObject({
        name: "EpubNotFoundError",
      });
      await expect(Epub.getDetail(userB, entity.id)).rejects.toMatchObject({
        name: "EpubNotFoundError",
      });
      await expect(Epub.getChapter(userB, entity.id, 0)).rejects.toMatchObject({
        name: "EpubNotFoundError",
      });
      await expect(Epub.getContext(userB, entity.id, {})).rejects.toMatchObject({
        name: "EpubNotFoundError",
      });
      await expect(Epub.remove(userB, entity.id)).rejects.toMatchObject({
        name: "EpubNotFoundError",
      });
    });

    // user A's book is still intact after user B's failed delete
    await runtime.runAs(userA, async () => {
      const stillThere = await Epub.get(userA, entity.id);
      expect(stillThere.id).toBe(entity.id);
    });
  });

  it("owner can list, fetch, and delete their own book", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildEpub());

      const items = await Epub.list(userA);
      expect(items.map((i) => i.id)).toContain(entity.id);

      await Epub.remove(userA, entity.id);

      await expect(Epub.get(userA, entity.id)).rejects.toMatchObject({
        name: "EpubNotFoundError",
      });
      const after = await Epub.list(userA);
      expect(after.map((i) => i.id)).not.toContain(entity.id);
    });
  });
});
