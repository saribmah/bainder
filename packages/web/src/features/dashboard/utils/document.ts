import type { Document } from "@bainder/sdk";
import { formatRelativeTime } from "./date";

export const getProgressLabel = (doc: Document): string | null => {
  const progress = doc.progress;
  if (!progress) return null;
  return `Chapter ${progress.epubChapterOrder + 1} · ${formatRelativeTime(progress.updatedAt)}`;
};

export const filterDocuments = (documents: Document[], query: string): Document[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return documents;

  return documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(normalizedQuery) ||
      doc.originalFilename.toLowerCase().includes(normalizedQuery),
  );
};

export const sortByCreatedAtDesc = (documents: Document[]): Document[] =>
  [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
