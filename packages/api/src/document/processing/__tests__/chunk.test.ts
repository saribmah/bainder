import { describe, expect, test } from "bun:test";
import { chunkSection } from "../chunk";

describe("chunkSection", () => {
  test("returns no chunks for empty text", () => {
    expect(chunkSection("")).toEqual([]);
  });

  test("returns a single chunk when text fits maxChars", () => {
    const text = "hello world";
    const chunks = chunkSection(text, { maxChars: 100, overlap: 10 });
    expect(chunks).toEqual([{ chunkIndex: 0, startOffset: 0, endOffset: text.length, text }]);
  });

  test("splits a long text into overlapping chunks with stable offsets", () => {
    const text = "x".repeat(25);
    const chunks = chunkSection(text, { maxChars: 10, overlap: 3 });
    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toEqual({
      chunkIndex: 0,
      startOffset: 0,
      endOffset: 10,
      text: "x".repeat(10),
    });
    // Stride = maxChars - overlap = 7.
    expect(chunks[1].startOffset).toBe(7);
    expect(chunks[1].endOffset).toBe(17);
    expect(chunks[2].startOffset).toBe(14);
    expect(chunks[2].endOffset).toBe(24);
    // Last chunk ends exactly at text length.
    expect(chunks[chunks.length - 1].endOffset).toBe(text.length);
  });

  test("is deterministic — same input produces same chunk indexes/offsets", () => {
    const text = "a".repeat(50_000);
    const a = chunkSection(text);
    const b = chunkSection(text);
    expect(a).toEqual(b);
  });

  test("covers every character at least once", () => {
    const text = "0123456789".repeat(2_000);
    const chunks = chunkSection(text, { maxChars: 1_000, overlap: 100 });
    const reconstructed = new Array(text.length).fill(false);
    for (const c of chunks) {
      for (let i = c.startOffset; i < c.endOffset; i++) reconstructed[i] = true;
    }
    expect(reconstructed.every((v) => v)).toBe(true);
  });

  test("rejects invalid options", () => {
    expect(() => chunkSection("x", { maxChars: 0 })).toThrow();
    expect(() => chunkSection("x", { maxChars: 10, overlap: 10 })).toThrow();
    expect(() => chunkSection("x", { maxChars: 10, overlap: -1 })).toThrow();
  });
});
