// Plain-text / markdown parser. We try strict UTF-8 first; on decode failure
// we fall back to latin-1 (which always succeeds for any byte sequence) and
// flag the charset accordingly.
export type ParsedText = {
  charset: string;
  text: string;
};

export const parseTextBytes = (bytes: Uint8Array): ParsedText => {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { charset: "utf-8", text };
  } catch {
    const text = new TextDecoder("iso-8859-1").decode(bytes);
    return { charset: "iso-8859-1", text };
  }
};
