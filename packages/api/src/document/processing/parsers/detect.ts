import type { Document } from "../../document";

// Magic-byte + extension based format detection. We don't trust the declared
// MIME type alone — browsers send `application/octet-stream` more often than
// not. The returned `mimeType` is the canonical one we'll persist; `kind` is
// the bucket the workflow dispatches on.
export type FormatDetection = {
  kind: Document.Kind;
  mimeType: string;
};

export const detectFormat = (
  bytes: Uint8Array,
  declaredMimeType: string | null,
  filename: string,
): FormatDetection | null => {
  if (bytes.byteLength === 0) return null;

  const signature = matchSignature(bytes);
  if (signature) return signature;

  const ext = extensionOf(filename);
  if (ext) {
    const byExt = matchExtension(ext, declaredMimeType);
    if (byExt) return byExt;
  }

  if (declaredMimeType) {
    const byMime = matchMimeType(declaredMimeType);
    if (byMime) return byMime;
  }

  return null;
};

const matchSignature = (bytes: Uint8Array): FormatDetection | null => {
  // PDF: starts with "%PDF-".
  if (bytes.byteLength >= 5 && eq(bytes, 0, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { kind: "pdf", mimeType: "application/pdf" };
  }
  // ZIP: PK\x03\x04. EPUBs are ZIPs with an "application/epub+zip" mimetype
  // file at the start. Not all ZIPs are EPUBs, but we accept any ZIP whose
  // mimetype member declares the EPUB type.
  if (bytes.byteLength >= 4 && eq(bytes, 0, [0x50, 0x4b, 0x03, 0x04])) {
    if (looksLikeEpubZip(bytes)) return { kind: "epub", mimeType: "application/epub+zip" };
    // Plain ZIPs aren't supported as a primary format yet.
    return null;
  }
  // JPEG.
  if (bytes.byteLength >= 3 && eq(bytes, 0, [0xff, 0xd8, 0xff])) {
    return { kind: "image", mimeType: "image/jpeg" };
  }
  // PNG.
  if (bytes.byteLength >= 8 && eq(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: "image", mimeType: "image/png" };
  }
  // GIF.
  if (
    bytes.byteLength >= 6 &&
    (eq(bytes, 0, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      eq(bytes, 0, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))
  ) {
    return { kind: "image", mimeType: "image/gif" };
  }
  // WebP: "RIFF" + 4 bytes size + "WEBP".
  if (
    bytes.byteLength >= 12 &&
    eq(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    eq(bytes, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return { kind: "image", mimeType: "image/webp" };
  }
  // BMP.
  if (bytes.byteLength >= 2 && eq(bytes, 0, [0x42, 0x4d])) {
    return { kind: "image", mimeType: "image/bmp" };
  }
  // TIFF.
  if (
    bytes.byteLength >= 4 &&
    (eq(bytes, 0, [0x49, 0x49, 0x2a, 0x00]) || eq(bytes, 0, [0x4d, 0x4d, 0x00, 0x2a]))
  ) {
    return { kind: "image", mimeType: "image/tiff" };
  }
  // HEIC / HEIF: ftyp box at offset 4, brand "heic", "heix", "mif1", "msf1".
  if (
    bytes.byteLength >= 12 &&
    eq(bytes, 4, [0x66, 0x74, 0x79, 0x70]) &&
    (eq(bytes, 8, [0x68, 0x65, 0x69, 0x63]) ||
      eq(bytes, 8, [0x68, 0x65, 0x69, 0x78]) ||
      eq(bytes, 8, [0x6d, 0x69, 0x66, 0x31]) ||
      eq(bytes, 8, [0x6d, 0x73, 0x66, 0x31]))
  ) {
    return { kind: "image", mimeType: "image/heic" };
  }
  return null;
};

const matchExtension = (ext: string, mimeType: string | null): FormatDetection | null => {
  switch (ext) {
    case ".epub":
      return { kind: "epub", mimeType: "application/epub+zip" };
    case ".pdf":
      return { kind: "pdf", mimeType: "application/pdf" };
    case ".jpg":
    case ".jpeg":
      return { kind: "image", mimeType: "image/jpeg" };
    case ".png":
      return { kind: "image", mimeType: "image/png" };
    case ".gif":
      return { kind: "image", mimeType: "image/gif" };
    case ".webp":
      return { kind: "image", mimeType: "image/webp" };
    case ".heic":
      return { kind: "image", mimeType: "image/heic" };
    case ".bmp":
      return { kind: "image", mimeType: "image/bmp" };
    case ".tif":
    case ".tiff":
      return { kind: "image", mimeType: "image/tiff" };
    case ".txt":
      return { kind: "text", mimeType: "text/plain" };
    case ".md":
    case ".markdown":
      return { kind: "text", mimeType: "text/markdown" };
    default:
      // If the extension is unknown but the declared MIME suggests text,
      // treat as text.
      if (mimeType && mimeType.startsWith("text/")) {
        return { kind: "text", mimeType };
      }
      return null;
  }
};

const matchMimeType = (mimeType: string): FormatDetection | null => {
  const normalized = mimeType.toLowerCase().split(";")[0].trim();
  if (normalized === "application/pdf") return { kind: "pdf", mimeType: "application/pdf" };
  if (normalized === "application/epub+zip") {
    return { kind: "epub", mimeType: "application/epub+zip" };
  }
  if (normalized.startsWith("image/")) return { kind: "image", mimeType: normalized };
  if (normalized.startsWith("text/")) return { kind: "text", mimeType: normalized };
  return null;
};

const looksLikeEpubZip = (bytes: Uint8Array): boolean => {
  // EPUB spec requires "mimetype" be the first file in the ZIP, stored
  // (no compression) with content "application/epub+zip". The local file
  // header layout puts the filename and content at known offsets relative to
  // a 30-byte fixed header. We don't fully parse the ZIP; we just check the
  // bytes near the start for "application/epub+zip".
  const window = bytes.subarray(0, Math.min(bytes.byteLength, 200));
  const ascii = new TextDecoder("ascii", { fatal: false }).decode(window);
  return ascii.includes("application/epub+zip");
};

const extensionOf = (filename: string): string | null => {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return null;
  return filename.slice(dot).toLowerCase();
};

const eq = (bytes: Uint8Array, offset: number, expected: number[]): boolean => {
  if (offset + expected.length > bytes.byteLength) return false;
  for (let i = 0; i < expected.length; i++) {
    if (bytes[offset + i] !== expected[i]) return false;
  }
  return true;
};
