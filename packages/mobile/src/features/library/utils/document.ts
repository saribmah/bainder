import type { Document, DocumentManifest, DocumentSectionSummary } from "@bainder/sdk";
import type { LibraryFilter } from "../constants";

const SECTION_ORDER_PATTERN = /:section:(\d+)$/;

export const sectionOrderFromKey = (sectionKey: string | null | undefined): number | null => {
  if (!sectionKey) return null;
  const match = SECTION_ORDER_PATTERN.exec(sectionKey);
  if (!match) return null;
  return Number(match[1]);
};

export const sourceLabel = (doc: Document, manifest?: DocumentManifest | null): string => {
  const authors = manifest?.kind === "epub" ? manifest.metadata.authors : [];
  if (authors.length > 0) return authors.join(", ");
  return doc.originalFilename.replace(/\.[^.]+$/, "");
};

export const progressPercent = (doc: Document): number => {
  const progress = doc.progress?.progressPercent;
  if (typeof progress !== "number") return 0;
  return Math.round(Math.max(0, Math.min(1, progress)) * 100);
};

export const statusLabel = (doc: Document): string => {
  if (doc.status === "failed") return "Failed";
  if (doc.status !== "processed") return "Processing";
  const pct = progressPercent(doc);
  if (pct >= 100) return "Finished";
  if (pct > 0) return "Reading";
  return "New";
};

export const filterDocuments = (
  documents: ReadonlyArray<Document>,
  query: string,
  filter: LibraryFilter,
): Document[] => {
  const normalized = query.trim().toLowerCase();
  return documents.filter((doc) => {
    const kindMatch = filter === "all" || (filter === "books" && doc.kind === "epub");
    if (!kindMatch) return false;
    if (!normalized) return true;
    return (
      doc.title.toLowerCase().includes(normalized) ||
      doc.originalFilename.toLowerCase().includes(normalized)
    );
  });
};

export const sortDocuments = (documents: ReadonlyArray<Document>): Document[] =>
  [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export const estimateMinutes = (section: DocumentSectionSummary): string => {
  const minutes = Math.max(1, Math.round(section.wordCount / 225));
  return `${minutes} min`;
};

export const formatWordCount = (wordCount: number): string => {
  if (wordCount >= 1000) return `${Math.round(wordCount / 100) / 10}k words`;
  return `${wordCount} words`;
};
