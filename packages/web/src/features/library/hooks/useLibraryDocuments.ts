import { useCallback, useEffect, useMemo, useState } from "react";
import type { Document } from "@bainder/sdk";
import { useSdk } from "../../../sdk";
import { filterDocuments, sortDocuments } from "../utils/document";
import type { LibraryFilter } from "../constants";

export function useLibraryDocuments() {
  const { client } = useSdk();
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");

  const refresh = useCallback(async () => {
    try {
      const res = await client.document.list();
      if (res.data) {
        setDocuments(sortDocuments(res.data.items));
        setError(null);
      } else {
        setError("Failed to load library");
      }
    } catch (err) {
      setError(String(err));
    }
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!documents) return;
    const hasPending = documents.some(
      (doc) => doc.status === "uploading" || doc.status === "processing",
    );
    if (!hasPending) return;
    const interval = setInterval(() => void refresh(), 3000);
    return () => clearInterval(interval);
  }, [documents, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const uploadDocument = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const res = await client.document.create({ file });
        if (res.error) {
          setError("Upload failed");
        } else {
          setToast(`Uploaded ${file.name}`);
          await refresh();
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setUploading(false);
      }
    },
    [client, refresh],
  );

  const renameDocument = useCallback(
    async (doc: Document, title: string) => {
      try {
        const res = await client.document.update({ id: doc.id, title });
        if (res.data) {
          const updated = res.data;
          setDocuments((prev) =>
            prev
              ? sortDocuments(prev.map((item) => (item.id === updated.id ? updated : item)))
              : prev,
          );
          setToast("Renamed");
        } else {
          setError("Rename failed");
        }
      } catch (err) {
        setError(String(err));
      }
    },
    [client],
  );

  const deleteDocument = useCallback(
    async (doc: Document) => {
      try {
        const res = await client.document.delete({ id: doc.id });
        if (res.error) {
          setError("Delete failed");
          return;
        }
        setDocuments((prev) => (prev ? prev.filter((item) => item.id !== doc.id) : prev));
        setToast(`Deleted ${doc.title}`);
      } catch (err) {
        setError(String(err));
      }
    },
    [client],
  );

  const filteredDocuments = useMemo(() => {
    if (!documents) return null;
    return filterDocuments(documents, query, filter);
  }, [documents, filter, query]);

  const counts = useMemo(() => {
    const all = documents?.length ?? 0;
    const books = documents?.filter((doc) => doc.kind === "epub").length ?? 0;
    return { all, books, pdfs: 0, articles: 0 };
  }, [documents]);

  return {
    documents,
    filteredDocuments,
    counts,
    error,
    uploading,
    toast,
    query,
    setQuery,
    filter,
    setFilter,
    refresh,
    uploadDocument,
    renameDocument,
    deleteDocument,
  };
}
