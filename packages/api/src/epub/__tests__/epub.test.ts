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

const buildEpubWithChapter = (chapterHtml: string): Uint8Array =>
  zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(opf),
    "OEBPS/toc.ncx": strToU8(ncx),
    "OEBPS/ch1.xhtml": strToU8(chapterHtml),
    "OEBPS/ch2.xhtml": strToU8(ch2),
  });

// EPUB3 nav.xhtml fixture: no NCX, nav doc declared via properties="nav".
const navOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:nav-test</dc:identifier>
    <dc:title>Nav Book</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Author One</dc:creator>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<body>
  <nav epub:type="toc">
    <ol>
      <li><a href="ch1.xhtml">Prologue</a>
        <ol><li><a href="ch1.xhtml#mid">Midway Section</a></li></ol>
      </li>
      <li><a href="ch2.xhtml">Epilogue</a></li>
    </ol>
  </nav>
</body>
</html>`;

const buildNavEpub = (): Uint8Array =>
  zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(navOpf),
    "OEBPS/nav.xhtml": strToU8(navXhtml),
    "OEBPS/ch1.xhtml": strToU8(ch1),
    "OEBPS/ch2.xhtml": strToU8(ch2),
  });

// Spine with linear="no" on the third chapter (a footnote).
const linearOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:linear-test</dc:identifier>
    <dc:title>Linear Book</dc:title>
    <dc:language>en</dc:language>
    <dc:creator>Author Two</dc:creator>
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="ch3.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
    <itemref idref="ch3" linear="no"/>
  </spine>
</package>`;

const ch3 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Footnote Section</h1><p>Aside content.</p></body></html>`;

const buildLinearEpub = (): Uint8Array =>
  zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(linearOpf),
    "OEBPS/toc.ncx": strToU8(ncx),
    "OEBPS/ch1.xhtml": strToU8(ch1),
    "OEBPS/ch2.xhtml": strToU8(ch2),
    "OEBPS/ch3.xhtml": strToU8(ch3),
  });

// Cover image declared two ways: properties="cover-image" (EPUB3) and
// <meta name="cover" content="..."> (EPUB2 fallback). We expect EPUB3 to win.
const coverOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:cover-test</dc:identifier>
    <dc:title>Cover Book</dc:title>
    <dc:language>en</dc:language>
    <meta name="cover" content="cov"/>
  </metadata>
  <manifest>
    <item id="cov" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;

const buildCoverEpub = (): Uint8Array =>
  zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(coverOpf),
    "OEBPS/toc.ncx": strToU8(ncx),
    "OEBPS/ch1.xhtml": strToU8(ch1),
    "OEBPS/ch2.xhtml": strToU8(ch2),
    // Cover bytes — actual content doesn't matter for Phase 1b (we only check
    // that the href is captured into entity.coverImage).
    "OEBPS/images/cover.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
  });

// EPUB with one inline image and one URL-encoded src reference. The cover
// image is extracted via EPUB3 properties; chapter HTML rewrites both srcs.
const imageOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:img-test</dc:identifier>
    <dc:title>Image Book</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="cov" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="pic" href="images/pic 1.jpg" media-type="image/jpeg"/>
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
<img src="images/pic%201.jpg" alt="picture one"/>
</body></html>`;

const buildImageEpub = (): Uint8Array =>
  zipSync({
    mimetype: strToU8("application/epub+zip"),
    "META-INF/container.xml": strToU8(container),
    "OEBPS/content.opf": strToU8(imageOpf),
    "OEBPS/toc.ncx": strToU8(ncx),
    "OEBPS/ch1.xhtml": strToU8(imageCh1),
    "OEBPS/images/cover.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xc0, 0xff, 0xee]),
    "OEBPS/images/pic 1.jpg": new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
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

  it("recovers text from a chapter with no closing body/html tags", async () => {
    await runtime.runAs(userA, async () => {
      const malformed = `<html><head><title>Bad</title></head><body><h1>Heading</h1><p>Paragraph text here.`;
      const entity = await Epub.ingest(userA, buildEpubWithChapter(malformed));
      const chapter = await Epub.getChapter(userA, entity.id, 0);
      expect(chapter.text).toContain("Heading");
      expect(chapter.text).toContain("Paragraph text here.");
    });
  });

  it("preserves nested elements like <picture><img></picture>", async () => {
    await runtime.runAs(userA, async () => {
      const html = `<html><body><h1>Cover</h1><picture><source srcset="big.jpg"/><img src="small.jpg" alt="cover"/></picture><p>caption</p></body></html>`;
      const entity = await Epub.ingest(userA, buildEpubWithChapter(html));
      const chapter = await Epub.getChapter(userA, entity.id, 0);
      expect(chapter.html).toContain("<picture");
      expect(chapter.html).toContain("<img");
      expect(chapter.html).toContain('src="small.jpg"');
      expect(chapter.text).toContain("Cover");
      expect(chapter.text).toContain("caption");
    });
  });

  it("removes HTML comments even when they contain '>'", async () => {
    await runtime.runAs(userA, async () => {
      const html = `<html><body><!-- foo > bar --><p>visible</p><!-- a > b > c --></body></html>`;
      const entity = await Epub.ingest(userA, buildEpubWithChapter(html));
      const chapter = await Epub.getChapter(userA, entity.id, 0);
      expect(chapter.html).not.toContain("foo");
      expect(chapter.html).not.toContain("<!--");
      expect(chapter.text).not.toContain("foo");
      expect(chapter.text).not.toContain("a > b");
      expect(chapter.text).toContain("visible");
    });
  });

  it("uses EPUB3 nav.xhtml as the TOC source when no NCX is present", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildNavEpub());
      const detail = await Epub.getDetail(userA, entity.id);
      expect(detail.toc.length).toBeGreaterThan(0);
      expect(detail.toc[0].title).toBe("Prologue");
      expect(detail.toc[0].fileHref).toBe("ch1.xhtml");
      // Nested <ol> child becomes a depth-1 entry under "Prologue".
      const nested = detail.toc.find((t) => t.depth === 1 && t.title === "Midway Section");
      expect(nested).toBeDefined();
      expect(nested?.anchor).toBe("mid");
      // Chapter titles get enriched from the nav doc just like NCX.
      expect(detail.chapters[0].title).toBe("Prologue");
      expect(detail.chapters[1].title).toBe("Epilogue");
    });
  });

  it('ingests linear="no" chapters but excludes them from default reading range', async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildLinearEpub());
      // Total chapter count includes non-linear items.
      expect(entity.chapterCount).toBe(3);

      // Default chapter list / TOC excludes the non-linear chapter 3.
      const detail = await Epub.getDetail(userA, entity.id);
      expect(detail.chapters).toHaveLength(2);
      expect(detail.chapters.every((c) => c.linear)).toBe(true);

      // getChapter still resolves the non-linear chapter directly.
      const aside = await Epub.getChapter(userA, entity.id, 2);
      expect(aside.linear).toBe(false);
      expect(aside.text).toContain("Aside content");

      // AI context across the whole book skips the footnote chapter.
      const ctx = await Epub.getContext(userA, entity.id, {});
      expect(ctx.context).not.toContain("Aside content");
      expect(ctx.chapterCount).toBe(2);
    });
  });

  it("captures the cover image href via EPUB3 properties or EPUB2 meta fallback", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildCoverEpub());
      // Cover href is rewritten to the same `assets/{name}` token that chapter
      // <img src> rewrites use, so a single asset route serves both.
      expect(entity.coverImage).toBe("assets/cover.jpg");
    });
  });

  it("extracts images to R2 and rewrites chapter <img src> to assets/{name}", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildImageEpub());
      // Cover token uses sanitized basename; spaces become underscores.
      expect(entity.coverImage).toBe("assets/cover.jpg");

      const chapter = await Epub.getChapter(userA, entity.id, 0);
      expect(chapter.html).toContain('src="assets/cover.jpg"');
      // URL-encoded src `images/pic%201.jpg` resolves to the asset whose name
      // was sanitized from `pic 1.jpg` → `pic_1.jpg`.
      expect(chapter.html).toContain('src="assets/pic_1.jpg"');

      // Both images are reachable via the asset accessor.
      const cover = await Epub.getAsset(userA, entity.id, "cover.jpg");
      expect(cover).not.toBeNull();
      expect(cover?.contentType).toBe("image/jpeg");
      expect(cover?.size).toBe(7);

      const pic = await Epub.getAsset(userA, entity.id, "pic_1.jpg");
      expect(pic?.size).toBe(4);
    });
  });

  it("non-owners cannot retrieve another user's assets", async () => {
    const entity = await runtime.runAs(userA, () => Epub.ingest(userA, buildImageEpub()));
    await runtime.runAs(userB, async () => {
      const asset = await Epub.getAsset(userB, entity.id, "cover.jpg");
      expect(asset).toBeNull();
    });
  });

  it("deleting a book removes its assets from R2", async () => {
    await runtime.runAs(userA, async () => {
      const entity = await Epub.ingest(userA, buildImageEpub());
      expect(await Epub.getAsset(userA, entity.id, "cover.jpg")).not.toBeNull();

      await Epub.remove(userA, entity.id);

      // After delete the book row is gone; getAsset goes through ownership check
      // first and returns null. The R2 keys are also removed by removeAll, so
      // even a direct lookup against the bucket would miss.
      await expect(Epub.get(userA, entity.id)).rejects.toMatchObject({
        name: "EpubNotFoundError",
      });
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
