import { Image } from "../../formats/image/image";

// Pure-JS image dimensions parser. Reads only the header bytes for each
// supported format; we never decode pixel data. Returning `unknown` lets the
// caller fall back to "store original blob without metadata" rather than
// failing the upload.
export type ParsedImage = {
  width: number;
  height: number;
  format: Image.Format;
};

export const parseImageBytes = (bytes: Uint8Array): ParsedImage | null => {
  if (bytes.byteLength < 4) return null;
  const png = parsePng(bytes);
  if (png) return png;
  const jpeg = parseJpeg(bytes);
  if (jpeg) return jpeg;
  const gif = parseGif(bytes);
  if (gif) return gif;
  const webp = parseWebp(bytes);
  if (webp) return webp;
  const bmp = parseBmp(bytes);
  if (bmp) return bmp;
  return null;
};

const parsePng = (bytes: Uint8Array): ParsedImage | null => {
  if (bytes.byteLength < 24) return null;
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== sig[i]) return null;
  }
  // IHDR is the first chunk, starting at byte 16 (length+type+data); width/height
  // are big-endian uint32 at bytes 16 and 20.
  const width = readUint32BE(bytes, 16);
  const height = readUint32BE(bytes, 20);
  return { width, height, format: "png" };
};

const parseJpeg = (bytes: Uint8Array): ParsedImage | null => {
  // JPEG: SOI (0xFFD8) followed by segments. Find the first SOFn marker
  // (0xFFC0..0xFFC3, 0xFFC5..0xFFC7, 0xFFC9..0xFFCB, 0xFFCD..0xFFCF).
  if (bytes.byteLength < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 8 < bytes.byteLength) {
    if (bytes[i] !== 0xff) return null;
    let marker = bytes[i + 1];
    while (marker === 0xff) {
      i++;
      marker = bytes[i + 1];
    }
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    const segLen = (bytes[i + 2] << 8) | bytes[i + 3];
    if (isSof) {
      // Frame header: bytes[i+5] precision, [i+6..7] height, [i+8..9] width.
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return { width, height, format: "jpeg" };
    }
    i += 2 + segLen;
  }
  return null;
};

const parseGif = (bytes: Uint8Array): ParsedImage | null => {
  if (bytes.byteLength < 10) return null;
  const sig = String.fromCharCode(...bytes.subarray(0, 6));
  if (sig !== "GIF87a" && sig !== "GIF89a") return null;
  const width = bytes[6] | (bytes[7] << 8);
  const height = bytes[8] | (bytes[9] << 8);
  return { width, height, format: "gif" };
};

const parseWebp = (bytes: Uint8Array): ParsedImage | null => {
  if (bytes.byteLength < 30) return null;
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return null;
  if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50)
    return null;
  // VP8 (lossy), VP8L (lossless), VP8X (extended).
  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunk === "VP8 ") {
    // Frame tag at 23..29: width and height are 14-bit little-endian.
    const width = ((bytes[27] << 8) | bytes[26]) & 0x3fff;
    const height = ((bytes[29] << 8) | bytes[28]) & 0x3fff;
    return { width, height, format: "webp" };
  }
  if (chunk === "VP8L") {
    const b = bytes;
    const width = 1 + (((b[22] & 0x3f) << 8) | b[21]);
    const height = 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6));
    return { width, height, format: "webp" };
  }
  if (chunk === "VP8X") {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { width, height, format: "webp" };
  }
  return null;
};

const parseBmp = (bytes: Uint8Array): ParsedImage | null => {
  if (bytes.byteLength < 26) return null;
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) return null;
  // DIB header at byte 14. BITMAPINFOHEADER (40 bytes) is the most common,
  // with width/height as int32 little-endian at offsets 18 and 22.
  const width = readInt32LE(bytes, 18);
  const height = Math.abs(readInt32LE(bytes, 22));
  return { width, height, format: "bmp" };
};

const readUint32BE = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];

const readInt32LE = (bytes: Uint8Array, offset: number): number => {
  const u =
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24);
  return u | 0;
};
