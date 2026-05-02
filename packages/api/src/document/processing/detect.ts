import type { Document } from "../document";

// Magic-byte + extension based format detection. We don't trust the declared
// MIME type alone — browsers send `application/octet-stream` more often than
// not. The returned `mimeType` is the canonical one we'll persist; `kind` is
// the bucket the workflow dispatches on.
//
// EPUB is currently the only accepted format. Other formats (PDF, images,
// text) will be reintroduced one at a time — see `.agents/add-format.md`.
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
  if (ext === ".epub") {
    return { kind: "epub", mimeType: "application/epub+zip" };
  }

  if (declaredMimeType) {
    const normalized = declaredMimeType.toLowerCase().split(";")[0].trim();
    if (normalized === "application/epub+zip") {
      return { kind: "epub", mimeType: "application/epub+zip" };
    }
  }

  return null;
};

const matchSignature = (bytes: Uint8Array): FormatDetection | null => {
  // ZIP: PK\x03\x04. EPUBs are ZIPs with an "application/epub+zip" mimetype
  // file at the start. Plain ZIPs are not accepted.
  if (bytes.byteLength >= 4 && eq(bytes, 0, [0x50, 0x4b, 0x03, 0x04])) {
    if (looksLikeEpubZip(bytes)) return { kind: "epub", mimeType: "application/epub+zip" };
  }
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
