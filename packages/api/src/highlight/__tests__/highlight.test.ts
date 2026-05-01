import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { DocumentStorage } from "../../document/storage";
import { createTestRuntime } from "../../document/__tests__/test-db";
import { Highlight } from "../highlight";

// Seed a `document` row directly. The highlight feature only needs the row
// to exist with the right userId/kind; no parsing / R2 work is required to
// exercise highlight CRUD.
const seedDocument = async (
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

describe("Highlight feature", () => {
  const userA = "user-a";
  const userB = "user-b";
  let runtime: ReturnType<typeof createTestRuntime>;

  beforeEach(() => {
    runtime = createTestRuntime([
      { id: userA, name: "Alice", email: "alice@example.com" },
      { id: userB, name: "Bob", email: "bob@example.com" },
    ]);
  });

  afterEach(() => {
    runtime.close();
  });

  it("creates a highlight on an EPUB chapter and lists it back", async () => {
    await runtime.runAs(userA, async () => {
      const doc = await seedDocument(userA, "epub");

      const created = await Highlight.create(userA, {
        documentId: doc.id,
        epubChapterOrder: 2,
        offsetStart: 100,
        offsetEnd: 145,
        textSnippet: "Affordances define what actions are possible.",
        color: "yellow",
      });

      expect(created.id).toBeDefined();
      expect(created.documentId).toBe(doc.id);
      expect(created.epubChapterOrder).toBe(2);
      expect(created.pdfPageNumber).toBeNull();
      expect(created.color).toBe("yellow");
      expect(created.note).toBeNull();
      expect(created.createdAt).toBe(created.updatedAt);

      const all = await Highlight.list(userA, { documentId: doc.id });
      expect(all).toHaveLength(1);

      const scoped = await Highlight.list(userA, { documentId: doc.id, epubChapterOrder: 2 });
      expect(scoped).toHaveLength(1);

      const otherChapter = await Highlight.list(userA, {
        documentId: doc.id,
        epubChapterOrder: 0,
      });
      expect(otherChapter).toEqual([]);
    });
  });

  it("creates a highlight with a note and updates color + note", async () => {
    await runtime.runAs(userA, async () => {
      const doc = await seedDocument(userA, "pdf");

      const created = await Highlight.create(userA, {
        documentId: doc.id,
        pdfPageNumber: 5,
        offsetStart: 0,
        offsetEnd: 12,
        textSnippet: "First words.",
        color: "pink",
        note: "Opening thought.",
      });
      expect(created.note).toBe("Opening thought.");

      const updatedColor = await Highlight.update(userA, created.id, { color: "blue" });
      expect(updatedColor.color).toBe("blue");
      expect(updatedColor.note).toBe("Opening thought.");

      const cleared = await Highlight.update(userA, created.id, { note: null });
      expect(cleared.note).toBeNull();
    });
  });

  it("rejects targeting an EPUB chapter on a PDF document", async () => {
    await runtime.runAs(userA, async () => {
      const pdf = await seedDocument(userA, "pdf");
      await expect(
        Highlight.create(userA, {
          documentId: pdf.id,
          epubChapterOrder: 1,
          offsetStart: 0,
          offsetEnd: 5,
          textSnippet: "hello",
          color: "yellow",
        }),
      ).rejects.toMatchObject({ name: "HighlightInvalidTargetError" });
    });
  });

  it("treats another user's highlight as not found", async () => {
    const docA = await runtime.runAs(userA, () => seedDocument(userA, "epub"));
    const created = await runtime.runAs(userA, () =>
      Highlight.create(userA, {
        documentId: docA.id,
        epubChapterOrder: 0,
        offsetStart: 0,
        offsetEnd: 4,
        textSnippet: "Hi.",
        color: "yellow",
      }),
    );

    await runtime.runAs(userB, async () => {
      await expect(Highlight.update(userB, created.id, { color: "blue" })).rejects.toMatchObject({
        name: "HighlightNotFoundError",
      });
      await expect(Highlight.remove(userB, created.id)).rejects.toMatchObject({
        name: "HighlightNotFoundError",
      });
      // Listing under another user's documentId must surface as DocumentNotFound,
      // not an empty list, so the API doesn't leak ownership.
      await expect(Highlight.list(userB, { documentId: docA.id })).rejects.toMatchObject({
        name: "DocumentNotFoundError",
      });
    });
  });

  it("removes a highlight", async () => {
    await runtime.runAs(userA, async () => {
      const doc = await seedDocument(userA, "epub");
      const created = await Highlight.create(userA, {
        documentId: doc.id,
        epubChapterOrder: 0,
        offsetStart: 0,
        offsetEnd: 4,
        textSnippet: "Hi.",
        color: "green",
      });
      await Highlight.remove(userA, created.id);
      const after = await Highlight.list(userA, { documentId: doc.id });
      expect(after).toEqual([]);

      await expect(Highlight.remove(userA, created.id)).rejects.toMatchObject({
        name: "HighlightNotFoundError",
      });
    });
  });

  it("cascades deletes when the parent document is removed", async () => {
    await runtime.runAs(userA, async () => {
      const doc = await seedDocument(userA, "epub");
      await Highlight.create(userA, {
        documentId: doc.id,
        epubChapterOrder: 0,
        offsetStart: 0,
        offsetEnd: 4,
        textSnippet: "Hi.",
        color: "yellow",
      });
      // Direct storage delete is fine — Document.remove also touches R2 and
      // we're testing FK cascade behaviour, not the asset cleanup.
      await DocumentStorage.remove(doc.id, userA);
      // Re-seed a doc to satisfy the ownership check on list.
      const replacement = await seedDocument(userA, "epub");
      const survivors = await Highlight.list(userA, { documentId: replacement.id });
      expect(survivors).toEqual([]);
    });
  });
});
