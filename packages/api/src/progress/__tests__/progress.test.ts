import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Document } from "../../document/document";
import { DocumentStorage } from "../../document/storage";
import { createTestRuntime } from "../../document/__tests__/test-db";
import { Progress } from "../progress";

const seedDocument = (
  userId: string,
  kind: "epub" | "pdf",
  overrides?: Partial<Parameters<typeof DocumentStorage.create>[0]>,
) =>
  DocumentStorage.create({
    id: crypto.randomUUID(),
    userId,
    kind,
    mimeType: kind === "epub" ? "application/epub+zip" : "application/pdf",
    originalFilename: `seed.${kind}`,
    sizeBytes: 100,
    sha256: "0".repeat(64),
    title: "Seed",
    sensitive: false,
    status: "processed",
    r2KeyOriginal: `users/${userId}/documents/seed/original.${kind}`,
    ...overrides,
  });

describe("Progress feature", () => {
  const userA = "user-a";
  const userB = "user-b";
  let runtime: ReturnType<typeof createTestRuntime>;

  beforeEach(() => {
    runtime = createTestRuntime([
      { id: userA, name: "Alice", email: "alice@example.com" },
      { id: userB, name: "Bob", email: "bob@example.com" },
    ]);
  });

  afterEach(() => runtime.close());

  it("upserts EPUB progress and surfaces it on Document.get", async () => {
    await runtime.runAs(userA, async () => {
      const doc = await seedDocument(userA, "epub");

      const first = await Progress.upsert(userA, doc.id, { epubChapterOrder: 3 });
      expect(first.epubChapterOrder).toBe(3);
      expect(first.pdfPageNumber).toBeNull();

      const fetched = await Document.get(userA, doc.id);
      expect(fetched.progress).not.toBeNull();
      expect(fetched.progress?.epubChapterOrder).toBe(3);

      // Upsert overwrites in place — second call updates rather than insert.
      const second = await Progress.upsert(userA, doc.id, { epubChapterOrder: 7 });
      expect(second.epubChapterOrder).toBe(7);

      const refetched = await Document.get(userA, doc.id);
      expect(refetched.progress?.epubChapterOrder).toBe(7);
    });
  });

  it("upserts PDF progress with pdfPageNumber", async () => {
    await runtime.runAs(userA, async () => {
      const doc = await seedDocument(userA, "pdf");
      const created = await Progress.upsert(userA, doc.id, { pdfPageNumber: 42 });
      expect(created.pdfPageNumber).toBe(42);
      expect(created.epubChapterOrder).toBeNull();
    });
  });

  it("rejects PDF progress on an EPUB document", async () => {
    await runtime.runAs(userA, async () => {
      const doc = await seedDocument(userA, "epub");
      await expect(Progress.upsert(userA, doc.id, { pdfPageNumber: 1 })).rejects.toMatchObject({
        name: "ProgressInvalidTargetError",
      });
    });
  });

  it("treats another user's document as not found", async () => {
    const doc = await runtime.runAs(userA, () => seedDocument(userA, "epub"));
    await runtime.runAs(userB, async () => {
      await expect(Progress.upsert(userB, doc.id, { epubChapterOrder: 1 })).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
    });
  });

  it("isolates progress across users on the same document", async () => {
    const doc = await runtime.runAs(userA, () => seedDocument(userA, "epub"));
    // Both users need access — share by seeding under both.
    const docB = await runtime.runAs(userB, () =>
      seedDocument(userB, "epub", { id: crypto.randomUUID() }),
    );

    await runtime.runAs(userA, async () => {
      await Progress.upsert(userA, doc.id, { epubChapterOrder: 5 });
    });
    await runtime.runAs(userB, async () => {
      await Progress.upsert(userB, docB.id, { epubChapterOrder: 9 });
    });

    await runtime.runAs(userA, async () => {
      const a = await Document.get(userA, doc.id);
      expect(a.progress?.epubChapterOrder).toBe(5);
    });
    await runtime.runAs(userB, async () => {
      const b = await Document.get(userB, docB.id);
      expect(b.progress?.epubChapterOrder).toBe(9);
    });
  });
});
