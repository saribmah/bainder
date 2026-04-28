import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { parse as parseHtmlString, HTMLElement } from "node-html-parser";

// Pure EPUB parser: bytes → structured chapters + metadata + toc.
// No persistence, no HTTP. Called by `Epub.ingest`.

export type ParsedMetadata = {
  title: string;
  language: string;
  authors: string[];
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  identifiers: string[];
  subjects: string[];
  // OPF-relative href of the cover image, or null if none was declared. Bytes
  // are not extracted in the parser; the feature module turns this into the
  // stored asset URL after R2 upload.
  coverImage: string | null;
};

export type ParsedChapter = {
  spineId: string;
  order: number;
  href: string;
  title: string;
  html: string;
  text: string;
  wordCount: number;
  // EPUB spine `linear="no"` items (footnotes, ancillary content). Stored but
  // excluded from default reading-order traversal.
  linear: boolean;
};

export type ParsedTocEntry = {
  title: string;
  href: string;
  fileHref: string;
  anchor: string;
  children: ParsedTocEntry[];
};

export type ParsedImage = {
  // Sanitized basename used as the asset key. Stable across re-ingest of the
  // same book and safe for an `assets/{name}` URL token.
  name: string;
  bytes: Uint8Array;
  contentType: string;
};

export type ParsedEpub = {
  metadata: ParsedMetadata;
  chapters: ParsedChapter[];
  toc: ParsedTocEntry[];
  images: ParsedImage[];
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) =>
    ["item", "itemref", "navPoint", "li", "creator", "identifier", "subject", "meta"].includes(
      name,
    ),
});

const asArray = <T>(v: T | T[] | undefined): T[] => {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
};

const readText = (node: unknown): string => {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object" && node !== null && "#text" in node) {
    const t = (node as { "#text": unknown })["#text"];
    return typeof t === "string" ? t : "";
  }
  return "";
};

// Resolve a relative href against a directory (with trailing "/" or empty).
const resolveFromDir = (dir: string, rel: string): string => {
  const segs = dir.split("/").filter(Boolean);
  for (const seg of rel.split("/")) {
    if (seg === "..") segs.pop();
    else if (seg !== "." && seg !== "") segs.push(seg);
  }
  return segs.join("/");
};

const stripFragment = (href: string): { file: string; anchor: string } => {
  const idx = href.indexOf("#");
  if (idx === -1) return { file: href, anchor: "" };
  return { file: href.slice(0, idx), anchor: href.slice(idx + 1) };
};

// Tags removed wholesale (subtree decomposed) during chapter HTML cleaning.
// Same set as reader3.py:75. Comments are stripped by parser options below.
const STRIP_TAGS_HTML = "script, style, iframe, video, nav, form, button, input";

// Tags whose subtree should not contribute to plain-text extraction. We drop
// <head> in addition to script/style so titles/meta don't leak into LLM context.
const STRIP_TAGS_TEXT = "script, style, head";

const parseHtml = (raw: string): HTMLElement =>
  parseHtmlString(
    // node-html-parser preserves the `<?xml … ?>` declaration as raw text,
    // which would leak into `.text` extraction. Strip declarations and
    // <!DOCTYPE …> upfront — they carry no semantic value for our needs.
    raw.replace(/<\?[\s\S]*?\?>/g, "").replace(/<!DOCTYPE[\s\S]*?>/gi, ""),
    {
      // Default `comment: false` removes all <!-- --> nodes during parse.
      lowerCaseTagName: false,
    },
  );

const bodyOf = (root: HTMLElement): HTMLElement => {
  const body = root.querySelector("body");
  return body ?? root;
};

type ImageMap = {
  // Full ZIP path → safe asset name (e.g. "OEBPS/images/cover.jpg" → "cover.jpg").
  byPath: Map<string, string>;
  // Basename → safe asset name (fallback when chapter <img src> drops the path).
  byBasename: Map<string, string>;
};

const rewriteImageRefs = (root: HTMLElement, chapterFullPath: string, imageMap: ImageMap): void => {
  const chapterDir = chapterFullPath.includes("/")
    ? chapterFullPath.slice(0, chapterFullPath.lastIndexOf("/") + 1)
    : "";
  const rewriteAttr = (el: HTMLElement, attr: string): void => {
    const src = el.getAttribute(attr);
    if (!src) return;
    let decoded: string;
    try {
      decoded = decodeURIComponent(src);
    } catch {
      decoded = src;
    }
    const resolved = resolveFromDir(chapterDir, decoded);
    const basename = decoded.includes("/") ? decoded.slice(decoded.lastIndexOf("/") + 1) : decoded;
    const name = imageMap.byPath.get(resolved) ?? imageMap.byBasename.get(basename);
    if (name) el.setAttribute(attr, `assets/${name}`);
  };
  for (const img of root.querySelectorAll("img")) rewriteAttr(img, "src");
  for (const image of root.querySelectorAll("image")) {
    rewriteAttr(image, "xlink:href");
    rewriteAttr(image, "href");
  }
};

// Single-pass chapter processing: parse once, strip dangerous tags, rewrite
// image refs, then derive both cleaned HTML and plain text from the same DOM.
const processChapterContent = (
  raw: string,
  chapterFullPath: string,
  imageMap: ImageMap,
): { html: string; text: string } => {
  const root = parseHtml(raw);
  for (const el of root.querySelectorAll(STRIP_TAGS_HTML)) el.remove();
  rewriteImageRefs(root, chapterFullPath, imageMap);
  const html = bodyOf(root).innerHTML.trim();
  // Drop <head> before extracting plain text so titles/meta don't leak into
  // LLM context. STRIP_TAGS_HTML already covers script/style.
  for (const el of root.querySelectorAll(STRIP_TAGS_TEXT)) el.remove();
  // `.text` walks descendants and decodes HTML entities (&amp; → &).
  const text = root.text.replace(/\s+/g, " ").trim();
  return { html, text };
};

const sanitizeAssetName = (href: string, used: Set<string>): string => {
  const basename = href.includes("/") ? href.slice(href.lastIndexOf("/") + 1) : href;
  let safe = basename.replace(/[^A-Za-z0-9._-]/g, "_");
  if (!safe || safe === "." || safe === "..") safe = "image";
  if (!used.has(safe)) return safe;
  // Collision: append a numeric suffix before the extension.
  const dot = safe.lastIndexOf(".");
  const stem = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : "";
  let i = 1;
  while (used.has(`${stem}_${i}${ext}`)) i++;
  return `${stem}_${i}${ext}`;
};

const extractImages = (
  manifest: Map<string, ManifestItem>,
  files: FileMap,
  opfDir: string,
): { images: ParsedImage[]; map: ImageMap } => {
  const images: ParsedImage[] = [];
  const byPath = new Map<string, string>();
  const byBasename = new Map<string, string>();
  const used = new Set<string>();
  for (const item of manifest.values()) {
    if (!item.mediaType.startsWith("image/")) continue;
    const fullPath = resolveFromDir(opfDir, item.href);
    const bytes = files[fullPath];
    if (!bytes) continue;
    const name = sanitizeAssetName(item.href, used);
    used.add(name);
    images.push({ name, bytes, contentType: item.mediaType });
    byPath.set(fullPath, name);
    const basename = item.href.includes("/")
      ? item.href.slice(item.href.lastIndexOf("/") + 1)
      : item.href;
    if (!byBasename.has(basename)) byBasename.set(basename, name);
  }
  return { images, map: { byPath, byBasename } };
};

const countWords = (text: string): number => {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
};

const parseMetadata = (pkg: Record<string, unknown>): ParsedMetadata => {
  const meta = (pkg["metadata"] ?? {}) as Record<string, unknown>;

  const title = readText(meta["title"]) || "Untitled";
  const language = readText(meta["language"]) || "en";
  const authors = asArray(meta["creator"] as unknown)
    .map(readText)
    .filter(Boolean);
  const description = readText(meta["description"]) || null;
  const publisher = readText(meta["publisher"]) || null;
  const publishedDate = readText(meta["date"]) || null;
  const identifiers = asArray(meta["identifier"] as unknown)
    .map(readText)
    .filter(Boolean);
  const subjects = asArray(meta["subject"] as unknown)
    .map(readText)
    .filter(Boolean);

  return {
    title,
    language,
    authors,
    description,
    publisher,
    publishedDate,
    identifiers,
    subjects,
    coverImage: null,
  };
};

const detectCoverImage = (
  pkg: Record<string, unknown>,
  manifest: Map<string, ManifestItem>,
): string | null => {
  // EPUB3: a manifest item with properties containing "cover-image".
  for (const item of manifest.values()) {
    if (item.properties.split(/\s+/).includes("cover-image")) return item.href;
  }
  // EPUB2: <meta name="cover" content="<itemId>"> in the metadata block.
  const meta = (pkg["metadata"] ?? {}) as Record<string, unknown>;
  const metas = asArray(meta["meta"] as unknown) as Array<Record<string, string>>;
  for (const m of metas) {
    if (m["@_name"] === "cover") {
      const id = m["@_content"];
      if (id) {
        const item = manifest.get(id);
        if (item) return item.href;
      }
    }
  }
  return null;
};

type ManifestItem = { id: string; href: string; mediaType: string; properties: string };

const parseManifest = (pkg: Record<string, unknown>): Map<string, ManifestItem> => {
  const manifest = (pkg["manifest"] ?? {}) as Record<string, unknown>;
  const items = asArray(manifest["item"] as unknown) as Array<Record<string, string>>;
  const map = new Map<string, ManifestItem>();
  for (const item of items) {
    const id = item["@_id"];
    if (!id) continue;
    map.set(id, {
      id,
      href: item["@_href"] ?? "",
      mediaType: item["@_media-type"] ?? "",
      properties: item["@_properties"] ?? "",
    });
  }
  return map;
};

type SpineRef = { idref: string; linear: boolean };

const parseSpine = (pkg: Record<string, unknown>): SpineRef[] => {
  const spine = (pkg["spine"] ?? {}) as Record<string, unknown>;
  const itemrefs = asArray(spine["itemref"] as unknown) as Array<Record<string, string>>;
  return itemrefs
    .map((r) => ({
      idref: r["@_idref"] ?? "",
      linear: (r["@_linear"] ?? "yes").toLowerCase() !== "no",
    }))
    .filter((s) => s.idref);
};

type FileMap = Record<string, Uint8Array>;

const parseNcxToc = (ncxXml: string, ncxPath: string, opfDir: string): ParsedTocEntry[] => {
  const ncx = xmlParser.parse(ncxXml) as { ncx?: { navMap?: unknown } };
  const navMap = ncx.ncx?.navMap as Record<string, unknown> | undefined;
  if (!navMap) return [];

  const ncxDir = ncxPath.includes("/") ? ncxPath.slice(0, ncxPath.lastIndexOf("/") + 1) : "";

  const walk = (points: unknown): ParsedTocEntry[] => {
    return asArray(points as unknown[]).map((raw): ParsedTocEntry => {
      const point = raw as Record<string, unknown>;
      const labelNode = (point["navLabel"] as Record<string, unknown> | undefined) ?? {};
      const title = readText(labelNode["text"]) || "Untitled";
      const contentNode = (point["content"] as Record<string, string> | undefined) ?? {};
      const src = contentNode["@_src"] ?? "";
      const { file, anchor } = stripFragment(src);
      // NCX content/@src is relative to the NCX file; rewrite to be relative to OPF
      // so it lines up with manifest item.href used as chapter.href.
      const ncxAbs = file ? resolveFromDir(ncxDir, file) : "";
      const fileHref = opfDir && ncxAbs.startsWith(opfDir) ? ncxAbs.slice(opfDir.length) : ncxAbs;
      return {
        title,
        href: src,
        fileHref,
        anchor,
        children: walk(point["navPoint"]),
      };
    });
  };

  return walk(navMap["navPoint"]);
};

// EPUB3 navigation document: an XHTML file declared in the manifest with
// `properties` containing "nav". Inside is `<nav epub:type="toc">` (or
// `role="doc-toc"`), with one or more nested <ol><li><a>…</a></li></ol> trees.
const parseNavToc = (navXml: string, navPath: string, opfDir: string): ParsedTocEntry[] => {
  const root = parseHtml(navXml);
  const navs = root.querySelectorAll("nav");
  const tocNav =
    navs.find(
      (n) => n.getAttribute("epub:type") === "toc" || n.getAttribute("role") === "doc-toc",
    ) ?? navs[0];
  if (!tocNav) return [];
  const navDir = navPath.includes("/") ? navPath.slice(0, navPath.lastIndexOf("/") + 1) : "";

  const directChildElements = (el: HTMLElement, tag: string): HTMLElement[] => {
    const out: HTMLElement[] = [];
    for (const c of el.childNodes) {
      if (c instanceof HTMLElement && c.tagName.toLowerCase() === tag) out.push(c);
    }
    return out;
  };

  const walkOl = (ol: HTMLElement): ParsedTocEntry[] => {
    const out: ParsedTocEntry[] = [];
    for (const li of directChildElements(ol, "li")) {
      const anchor = directChildElements(li, "a")[0] ?? li.querySelector("a");
      const title = (anchor?.text ?? li.text).trim() || "Untitled";
      const rawHref = anchor?.getAttribute("href") ?? "";
      const { file, anchor: hashAnchor } = stripFragment(rawHref);
      const navAbs = file ? resolveFromDir(navDir, file) : "";
      const fileHref = opfDir && navAbs.startsWith(opfDir) ? navAbs.slice(opfDir.length) : navAbs;
      const childOl = directChildElements(li, "ol")[0];
      out.push({
        title,
        href: rawHref,
        fileHref,
        anchor: hashAnchor,
        children: childOl ? walkOl(childOl) : [],
      });
    }
    return out;
  };

  const ol = directChildElements(tocNav, "ol")[0] ?? tocNav.querySelector("ol");
  return ol ? walkOl(ol) : [];
};

const buildFallbackToc = (chapters: ParsedChapter[]): ParsedTocEntry[] =>
  chapters.map((c) => ({
    title: c.title,
    href: c.href,
    fileHref: c.href,
    anchor: "",
    children: [],
  }));

const enrichChapterTitles = (chapters: ParsedChapter[], toc: ParsedTocEntry[]): void => {
  const titleByHref = new Map<string, string>();
  const visit = (entries: ParsedTocEntry[]): void => {
    for (const e of entries) {
      if (e.fileHref && !titleByHref.has(e.fileHref)) titleByHref.set(e.fileHref, e.title);
      visit(e.children);
    }
  };
  visit(toc);
  for (const c of chapters) {
    const t = titleByHref.get(c.href);
    if (t) c.title = t;
  }
};

export const parseEpubBytes = (bytes: Uint8Array): ParsedEpub => {
  let files: FileMap;
  try {
    files = unzipSync(bytes);
  } catch (e) {
    throw new ParseFailure(`Not a valid ZIP archive: ${(e as Error).message}`);
  }

  const containerBytes = files["META-INF/container.xml"];
  if (!containerBytes) throw new ParseFailure("Missing META-INF/container.xml");

  const containerXml = strFromU8(containerBytes);
  const container = xmlParser.parse(containerXml) as {
    container?: {
      rootfiles?: { rootfile?: Record<string, string> | Array<Record<string, string>> };
    };
  };
  const rootfile = asArray(container.container?.rootfiles?.rootfile)[0];
  const opfPath = rootfile?.["@_full-path"];
  if (!opfPath) throw new ParseFailure("container.xml missing rootfile full-path");

  const opfBytes = files[opfPath];
  if (!opfBytes) throw new ParseFailure(`Missing OPF at ${opfPath}`);

  const opfXml = strFromU8(opfBytes);
  const opf = xmlParser.parse(opfXml) as { package?: Record<string, unknown> };
  if (!opf.package) throw new ParseFailure("OPF missing <package> root");

  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const metadata = parseMetadata(opf.package);
  const manifest = parseManifest(opf.package);
  const spine = parseSpine(opf.package);
  const { images, map: imageMap } = extractImages(manifest, files, opfDir);

  // Rewrite the cover href to a stored-asset token if we recognize it. If not
  // (e.g. the cover image isn't in the manifest), surface null rather than a
  // half-resolved href that the client can't fetch.
  const rawCoverHref = detectCoverImage(opf.package, manifest);
  if (rawCoverHref) {
    const coverFullPath = resolveFromDir(opfDir, rawCoverHref);
    const coverName =
      imageMap.byPath.get(coverFullPath) ??
      imageMap.byBasename.get(
        rawCoverHref.includes("/")
          ? rawCoverHref.slice(rawCoverHref.lastIndexOf("/") + 1)
          : rawCoverHref,
      );
    metadata.coverImage = coverName ? `assets/${coverName}` : null;
  } else {
    metadata.coverImage = null;
  }

  const chapters: ParsedChapter[] = [];
  let order = 0;
  for (const ref of spine) {
    const item = manifest.get(ref.idref);
    if (!item) continue;
    if (!item.mediaType.includes("html") && !item.mediaType.includes("xml")) continue;
    const fullPath = resolveFromDir(opfDir, item.href);
    const bytes = files[fullPath];
    if (!bytes) continue;
    const raw = strFromU8(bytes);
    const { html, text } = processChapterContent(raw, fullPath, imageMap);
    chapters.push({
      spineId: ref.idref,
      order,
      href: item.href,
      title: `Section ${order + 1}`,
      html,
      text,
      wordCount: countWords(text),
      linear: ref.linear,
    });
    order++;
  }

  // TOC source priority: EPUB3 nav.xhtml → NCX → fallback flat spine.
  let toc: ParsedTocEntry[] = [];
  const navItem = [...manifest.values()].find((i) => i.properties.split(/\s+/).includes("nav"));
  if (navItem) {
    const navPath = resolveFromDir(opfDir, navItem.href);
    const navBytes = files[navPath];
    if (navBytes) toc = parseNavToc(strFromU8(navBytes), navPath, opfDir);
  }
  if (toc.length === 0) {
    const spineEl = (opf.package["spine"] ?? {}) as Record<string, string>;
    const tocId = spineEl["@_toc"];
    if (tocId) {
      const ncxItem = manifest.get(tocId);
      if (ncxItem) {
        const ncxPath = resolveFromDir(opfDir, ncxItem.href);
        const ncxBytes = files[ncxPath];
        if (ncxBytes) toc = parseNcxToc(strFromU8(ncxBytes), ncxPath, opfDir);
      }
    }
  }
  if (toc.length === 0) toc = buildFallbackToc(chapters);

  enrichChapterTitles(chapters, toc);

  return { metadata, chapters, toc, images };
};

// Internal sentinel — translated into a NamedError by the feature module.
export class ParseFailure extends Error {
  override readonly name = "ParseFailure";
}
