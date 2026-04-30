import { Config } from "../config/config";

// R2-backed asset store for documents. Keys live under
// `users/{userId}/documents/{documentId}/` so a per-user purge is one prefix
// sweep and original blobs are never co-mingled across owners.
export namespace DocumentAssetStore {
  const docPrefix = (userId: string, documentId: string): string =>
    `users/${userId}/documents/${documentId}/`;

  const originalKey = (userId: string, documentId: string, ext: string): string =>
    `${docPrefix(userId, documentId)}original${ext}`;

  const assetKey = (userId: string, documentId: string, name: string): string =>
    `${docPrefix(userId, documentId)}assets/${name}`;

  export type Asset = {
    body: ReadableStream<Uint8Array>;
    contentType: string;
    size: number;
  };

  export const putOriginal = async (
    userId: string,
    documentId: string,
    ext: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> => {
    await Config.requireR2Bucket().put(originalKey(userId, documentId, ext), bytes, {
      httpMetadata: { contentType },
    });
  };

  export const putAsset = async (
    userId: string,
    documentId: string,
    name: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> => {
    await Config.requireR2Bucket().put(assetKey(userId, documentId, name), bytes, {
      httpMetadata: { contentType },
    });
  };

  export const getOriginal = async (
    userId: string,
    documentId: string,
    key: string,
  ): Promise<Asset | null> => {
    // The full key is stored on the document row (since the extension is
    // chosen at upload time). Verify it sits under this user's prefix so a
    // malformed row can't be coerced into reading another user's data.
    if (!key.startsWith(docPrefix(userId, documentId))) return null;
    const obj = await Config.requireR2Bucket().get(key);
    if (!obj) return null;
    return {
      body: obj.body,
      contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
      size: obj.size,
    };
  };

  export const getAsset = async (
    userId: string,
    documentId: string,
    name: string,
  ): Promise<Asset | null> => {
    const obj = await Config.requireR2Bucket().get(assetKey(userId, documentId, name));
    if (!obj) return null;
    return {
      body: obj.body,
      contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
      size: obj.size,
    };
  };

  export const getOriginalBytes = async (
    userId: string,
    documentId: string,
    key: string,
  ): Promise<Uint8Array | null> => {
    if (!key.startsWith(docPrefix(userId, documentId))) return null;
    const obj = await Config.requireR2Bucket().get(key);
    if (!obj) return null;
    const buffer = await obj.arrayBuffer();
    return new Uint8Array(buffer);
  };

  // Idempotent prefix sweep across both `original.*` and `assets/*` for a
  // single document. R2 list returns at most 1000 keys per page; we paginate
  // defensively for asset-heavy documents.
  export const removeAll = async (userId: string, documentId: string): Promise<void> => {
    const bucket = Config.requireR2Bucket();
    const prefix = docPrefix(userId, documentId);
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
