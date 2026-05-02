import type { Document } from "@bainder/sdk";
import { formatRelativeTime } from "./date";

// Section keys mint as `${kind}:section:${order}`. Reading the order back
// out lets the dashboard show "Chapter N" without fetching the manifest.
const SECTION_ORDER_PATTERN = /:section:(\d+)$/;

const sectionOrderFromKey = (sectionKey: string): number | null => {
  const match = SECTION_ORDER_PATTERN.exec(sectionKey);
  if (!match) return null;
  return Number(match[1]);
};

export const getProgressLabel = (doc: Document): string | null => {
  const progress = doc.progress;
  if (!progress) return null;
  const order = sectionOrderFromKey(progress.sectionKey);
  const stamp = formatRelativeTime(progress.updatedAt);
  return order !== null ? `Chapter ${order + 1} · ${stamp}` : `Continue reading · ${stamp}`;
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
