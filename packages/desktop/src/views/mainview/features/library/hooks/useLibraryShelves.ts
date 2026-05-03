import { useCallback, useEffect, useMemo, useState } from "react";
import type { Document, Shelf, ShelfCustom } from "@bainder/sdk";
import { useSdk } from "../../../sdk";

export type ShelfMemberships = Record<string, ShelfCustom[]>;

type CreateShelfInput = {
  name: string;
  description?: string;
};

type UpdateShelfInput = {
  name?: string;
  description?: string | null;
  position?: number | null;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export function useLibraryShelves(documents?: ReadonlyArray<Document> | null) {
  const { client } = useSdk();
  const [shelves, setShelves] = useState<Shelf[] | null>(null);
  const [memberships, setMemberships] = useState<ShelfMemberships>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [workingShelfId, setWorkingShelfId] = useState<string | null>(null);

  const refreshShelves = useCallback(async () => {
    try {
      const res = await client.shelf.list();
      if (res.data) {
        setShelves(res.data.items);
        setError(null);
      } else {
        setError("Failed to load shelves");
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [client]);

  const refreshDocumentShelves = useCallback(
    async (documentId: string) => {
      try {
        const res = await client.document.listShelves({ id: documentId });
        if (res.data) {
          setMemberships((prev) => ({ ...prev, [documentId]: res.data.items }));
        }
      } catch {
        setMemberships((prev) => ({ ...prev, [documentId]: [] }));
      }
    },
    [client],
  );

  const refreshMemberships = useCallback(
    async (items: ReadonlyArray<Document>) => {
      if (items.length === 0) {
        setMemberships({});
        return;
      }
      try {
        const pairs = await Promise.all(
          items.map(async (doc) => {
            const res = await client.document.listShelves({ id: doc.id });
            return [doc.id, res.data?.items ?? []] as const;
          }),
        );
        setMemberships(Object.fromEntries(pairs));
      } catch {
        setMemberships({});
      }
    },
    [client],
  );

  useEffect(() => {
    void refreshShelves();
  }, [refreshShelves]);

  useEffect(() => {
    if (!documents) return;
    void refreshMemberships(documents);
  }, [documents, refreshMemberships]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const smartShelves = useMemo(
    () =>
      shelves?.filter(
        (shelf): shelf is Extract<Shelf, { kind: "smart" }> => shelf.kind === "smart",
      ) ?? [],
    [shelves],
  );
  const customShelves = useMemo(
    () => shelves?.filter((shelf): shelf is ShelfCustom => shelf.kind === "custom") ?? [],
    [shelves],
  );

  const createShelf = useCallback(
    async (input: CreateShelfInput): Promise<ShelfCustom | null> => {
      const name = input.name.trim();
      const description = input.description?.trim();
      if (!name) return null;
      try {
        const res = await client.shelf.create({
          name,
          description: description ? description : undefined,
        });
        if (!res.data) {
          setError("Create shelf failed");
          return null;
        }
        setShelves((prev) => (prev ? [...prev, res.data] : prev));
        setToast("Shelf created");
        setError(null);
        return res.data;
      } catch (err) {
        setError(errorMessage(err));
        return null;
      }
    },
    [client],
  );

  const updateShelf = useCallback(
    async (shelf: ShelfCustom, input: UpdateShelfInput): Promise<ShelfCustom | null> => {
      try {
        const res = await client.shelf.update({ id: shelf.id, ...input });
        if (!res.data) {
          setError("Update shelf failed");
          return null;
        }
        setShelves((prev) =>
          prev ? prev.map((item) => (item.id === shelf.id ? res.data : item)) : prev,
        );
        setToast("Shelf updated");
        setError(null);
        return res.data;
      } catch (err) {
        setError(errorMessage(err));
        return null;
      }
    },
    [client],
  );

  const deleteShelf = useCallback(
    async (shelf: ShelfCustom): Promise<boolean> => {
      try {
        const res = await client.shelf.delete({ id: shelf.id });
        if (res.error) {
          setError("Delete shelf failed");
          return false;
        }
        setShelves((prev) => (prev ? prev.filter((item) => item.id !== shelf.id) : prev));
        setMemberships((prev) =>
          Object.fromEntries(
            Object.entries(prev).map(([documentId, items]) => [
              documentId,
              items.filter((item) => item.id !== shelf.id),
            ]),
          ),
        );
        setToast("Shelf deleted");
        setError(null);
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      }
    },
    [client],
  );

  const addDocumentToShelf = useCallback(
    async (shelf: ShelfCustom, documentId: string): Promise<boolean> => {
      setWorkingShelfId(shelf.id);
      try {
        const res = await client.shelf.addDocument({ id: shelf.id, documentId });
        if (res.error) {
          setError("Add to shelf failed");
          return false;
        }
        await Promise.all([refreshShelves(), refreshDocumentShelves(documentId)]);
        setToast(`Added to ${shelf.name}`);
        setError(null);
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      } finally {
        setWorkingShelfId(null);
      }
    },
    [client, refreshDocumentShelves, refreshShelves],
  );

  const removeDocumentFromShelf = useCallback(
    async (shelf: ShelfCustom, documentId: string): Promise<boolean> => {
      setWorkingShelfId(shelf.id);
      try {
        const res = await client.shelf.removeDocument({ id: shelf.id, documentId });
        if (res.error) {
          setError("Remove from shelf failed");
          return false;
        }
        await Promise.all([refreshShelves(), refreshDocumentShelves(documentId)]);
        setToast(`Removed from ${shelf.name}`);
        setError(null);
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      } finally {
        setWorkingShelfId(null);
      }
    },
    [client, refreshDocumentShelves, refreshShelves],
  );

  const toggleDocumentShelf = useCallback(
    async (shelf: ShelfCustom, documentId: string, selected: boolean): Promise<boolean> =>
      selected ? removeDocumentFromShelf(shelf, documentId) : addDocumentToShelf(shelf, documentId),
    [addDocumentToShelf, removeDocumentFromShelf],
  );

  return {
    shelves,
    smartShelves,
    customShelves,
    memberships,
    error,
    toast,
    workingShelfId,
    refreshShelves,
    refreshDocumentShelves,
    createShelf,
    updateShelf,
    deleteShelf,
    addDocumentToShelf,
    removeDocumentFromShelf,
    toggleDocumentShelf,
  };
}
