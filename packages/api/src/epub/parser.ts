import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";

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
};

export type ParsedChapter = {
  spineId: string;
  order: number;
  href: string;
  title: string;
  html: string;
  text: string;
  wordCount: number;
};

export type ParsedTocEntry = {
  title: string;
  href: string;
  fileHref: string;
  anchor: string;
  children: ParsedTocEntry[];
};

export type ParsedEpub = {
  metadata: ParsedMetadata;
  chapters: ParsedChapter[];
  toc: ParsedTocEntry[];
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) =>
    ["item", "itemref", "navPoint", "li", "creator", "identifier", "subject"].includes(name),
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

const decodeEntities = (s: string): string =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));

const stripBlock = (html: string, tag: string): string =>
  html.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, "gi"), "");

const cleanChapterHtml = (raw: string): string => {
  let html = raw;
  for (const tag of ["script", "style", "iframe", "video", "nav", "form", "button"]) {
    html = stripBlock(html, tag);
  }
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<input\b[^>]*\/?>/gi, "");
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : html.trim();
};

const extractPlainText = (raw: string): string => {
  let text = raw;
  for (const tag of ["script", "style", "head"]) {
    text = stripBlock(text, tag);
  }
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  return text.replace(/\s+/g, " ").trim();
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

  return { title, language, authors, description, publisher, publishedDate, identifiers, subjects };
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

const parseSpine = (pkg: Record<string, unknown>): string[] => {
  const spine = (pkg["spine"] ?? {}) as Record<string, unknown>;
  const itemrefs = asArray(spine["itemref"] as unknown) as Array<Record<string, string>>;
  return itemrefs.map((r) => r["@_idref"]).filter(Boolean);
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

  const chapters: ParsedChapter[] = [];
  let order = 0;
  for (const idref of spine) {
    const item = manifest.get(idref);
    if (!item) continue;
    if (!item.mediaType.includes("html") && !item.mediaType.includes("xml")) continue;
    const fullPath = resolveFromDir(opfDir, item.href);
    const bytes = files[fullPath];
    if (!bytes) continue;
    const raw = strFromU8(bytes);
    const text = extractPlainText(raw);
    chapters.push({
      spineId: idref,
      order,
      href: item.href,
      title: `Section ${order + 1}`,
      html: cleanChapterHtml(raw),
      text,
      wordCount: countWords(text),
    });
    order++;
  }

  let toc: ParsedTocEntry[] = [];
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
  if (toc.length === 0) toc = buildFallbackToc(chapters);

  enrichChapterTitles(chapters, toc);

  return { metadata, chapters, toc };
};

// Internal sentinel — translated into a NamedError by the feature module.
export class ParseFailure extends Error {
  override readonly name = "ParseFailure";
}
