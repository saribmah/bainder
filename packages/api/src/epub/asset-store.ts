import { Config } from "../config/config";

// R2-backed asset store for EPUB images. Peer of `storage.ts`: it owns the
// other half of an EPUB book's persistence (chapter HTML / metadata live in
// D1; image bytes live here). Keys are namespaced under `epub/{bookId}/` so
// `removeAll(bookId)` is a single prefix sweep.
export namespace EpubAssetStore {
  const keyOf = (bookId: string, name: string): string => `epub/${bookId}/${name}`;
  const prefixOf = (bookId: string): string => `epub/${bookId}/`;

  export const put = async (
    bookId: string,
    name: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> => {
    await Config.requireR2Bucket().put(keyOf(bookId, name), bytes, {
      httpMetadata: { contentType },
    });
  };

  export type Asset = {
    body: ReadableStream<Uint8Array>;
    contentType: string;
    size: number;
  };

  export const get = async (bookId: string, name: string): Promise<Asset | null> => {
    const obj = await Config.requireR2Bucket().get(keyOf(bookId, name));
    if (!obj) return null;
    return {
      body: obj.body,
      contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
      size: obj.size,
    };
  };

  // Idempotent prefix sweep. R2 list returns at most 1000 keys per page;
  // for typical EPUBs (tens to low hundreds of images) one page is enough,
  // but we paginate defensively for picture-heavy books.
  export const removeAll = async (bookId: string): Promise<void> => {
    const bucket = Config.requireR2Bucket();
    const prefix = prefixOf(bookId);
    let cursor: string | undefined;
    while (true) {
      const page = await bucket.list({ prefix, cursor });
      const keys = page.objects.map((o) => o.key);
      if (keys.length > 0) await bucket.delete(keys);
      if (!page.truncated) break;
      cursor = page.cursor;
    }
  };
}
