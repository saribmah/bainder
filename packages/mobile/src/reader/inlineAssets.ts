// Prefetch chapter assets (e.g. cover images, in-line figures) referenced by
// relative paths in EPUB chapter HTML and inline them as data URIs. The
// in-WebView document is loaded as a blob and cannot present auth cookies, so
// authed assets must be resolved by RN before the HTML is handed off.

export type AssetCache = Map<string, string>;

const SRC_PATTERN = /<img\b[^>]*?\bsrc\s*=\s*(["'])([^"']+)\1/gi;

const isAbsolute = (value: string): boolean => /^(?:https?:|data:|blob:|file:)/i.test(value);

const blobToDataUri = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("FileReader did not return string"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });

export async function inlineEpubAssets(
  html: string,
  assetBase: string,
  fetchImpl: typeof fetch,
  cache: AssetCache,
): Promise<string> {
  const refs = new Set<string>();
  for (const match of html.matchAll(SRC_PATTERN)) {
    const value = match[2];
    if (!value || isAbsolute(value)) continue;
    refs.add(value);
  }

  await Promise.all(
    Array.from(refs).map(async (ref) => {
      if (cache.has(ref)) return;
      try {
        const url = new URL(ref, assetBase).toString();
        const res = await fetchImpl(url);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUri = await blobToDataUri(blob);
        cache.set(ref, dataUri);
      } catch {
        // Leave the original reference; the WebView will simply fail to load it.
      }
    }),
  );

  return html.replace(SRC_PATTERN, (full, quote: string, value: string) => {
    const dataUri = cache.get(value);
    if (!dataUri) return full;
    return full.replace(`${quote}${value}${quote}`, `${quote}${dataUri}${quote}`);
  });
}
