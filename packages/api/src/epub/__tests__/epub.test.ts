import { describe, expect, it } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { Epub } from "../epub";

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
  it("ingests a valid EPUB and exposes metadata + chapters + TOC", async () => {
    const entity = await Epub.ingest(buildEpub());
    expect(entity.title).toBe("Test Book");
    expect(entity.authors).toEqual(["Ada Lovelace", "Charles Babbage"]);
    expect(entity.language).toBe("en");
    expect(entity.publisher).toBe("Test House");
    expect(entity.publishedDate).toBe("2026-01-01");
    expect(entity.identifiers).toContain("urn:uuid:test-1");
    expect(entity.subjects).toContain("fiction");
    expect(entity.chapterCount).toBe(2);
    expect(entity.wordCount).toBeGreaterThan(0);

    const detail = await Epub.getDetail(entity.id);
    expect(detail.chapters).toHaveLength(2);
    expect(detail.chapters[0].title).toBe("The Beginning");
    expect(detail.chapters[1].title).toBe("The End");
    expect(detail.toc[0].title).toBe("The Beginning");
    expect(detail.toc[0].fileHref).toBe("ch1.xhtml");
    expect(detail.toc[0].depth).toBe(0);
    expect(detail.toc[0].parent).toBeNull();
  });

  it("returns chapter content with cleaned HTML and AI-ready text", async () => {
    const entity = await Epub.ingest(buildEpub());
    const chapter = await Epub.getChapter(entity.id, 0);
    expect(chapter.title).toBe("The Beginning");
    expect(chapter.html).not.toContain("<script");
    expect(chapter.html).not.toContain("<style");
    expect(chapter.text).toContain("Hello world & welcome.");
    expect(chapter.text).not.toContain("<");
    expect(chapter.wordCount).toBeGreaterThan(0);
  });

  it("assembles AI context across chapters in default range", async () => {
    const entity = await Epub.ingest(buildEpub());
    const ctx = await Epub.getContext(entity.id, {});
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

  it("supports a chapter range and markdown format", async () => {
    const entity = await Epub.ingest(buildEpub());
    const ctx = await Epub.getContext(entity.id, { from: 1, to: 1, format: "markdown" });
    expect(ctx.from).toBe(1);
    expect(ctx.to).toBe(1);
    expect(ctx.chapterCount).toBe(1);
    expect(ctx.context).toContain("# Test Book");
    expect(ctx.context).toContain("## The End");
    expect(ctx.context).not.toContain("The Beginning");
  });

  it("rejects bytes that aren't a valid ZIP", async () => {
    const garbage = new TextEncoder().encode("not an epub");
    await expect(Epub.ingest(garbage)).rejects.toMatchObject({
      name: "EpubInvalidFormatError",
    });
  });

  it("rejects ZIPs missing META-INF/container.xml", async () => {
    const empty = zipSync({ mimetype: strToU8("application/epub+zip") });
    await expect(Epub.ingest(empty)).rejects.toMatchObject({
      name: "EpubInvalidFormatError",
    });
  });

  it("throws EpubNotFoundError for missing book id", async () => {
    await expect(Epub.get("missing")).rejects.toMatchObject({
      name: "EpubNotFoundError",
    });
  });

  it("throws EpubChapterNotFoundError for out-of-range chapter", async () => {
    const entity = await Epub.ingest(buildEpub());
    await expect(Epub.getChapter(entity.id, 999)).rejects.toMatchObject({
      name: "EpubChapterNotFoundError",
    });
  });
});
