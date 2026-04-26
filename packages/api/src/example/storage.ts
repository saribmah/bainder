import type { Example } from "./example";

// In-memory storage demonstrating the storage-module shape.
// Real apps swap this for Prisma/Drizzle/D1/KV/etc. — keep the same exported
// surface (entitySelect, EntityRow, toEntity, query functions returning Entity).
// See `.agents/add-storage-prisma.md` etc. for migration recipes.
export namespace ExampleStorage {
  // Raw DB row shape (here: identical to Entity since we're in-memory).
  // For SQL-backed stores this is `Prisma.<Model>GetPayload<{ select: typeof entitySelect }>`.
  export type EntityRow = {
    id: string;
    name: string;
    createdAt: Date;
  };

  // What columns/relations the storage module reads when assembling an Entity.
  // For SQL stores: a `Prisma.<Model>Select` constant. Kept here as documentation.
  export const entitySelect = {
    id: true,
    name: true,
    createdAt: true,
  } as const;

  export const toEntity = (row: EntityRow): Example.Entity => {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    };
  };

  // ---- In-memory store (swap with real persistence) ---------------------
  const store = new Map<string, EntityRow>();

  export const create = async (input: { name: string }): Promise<Example.Entity> => {
    const row: EntityRow = {
      id: crypto.randomUUID(),
      name: input.name,
      createdAt: new Date(),
    };
    store.set(row.id, row);
    return toEntity(row);
  };

  export const get = async (id: string): Promise<Example.Entity | null> => {
    const row = store.get(id);
    return row ? toEntity(row) : null;
  };

  export const findByName = async (name: string): Promise<Example.Entity | null> => {
    for (const row of store.values()) {
      if (row.name === name) return toEntity(row);
    }
    return null;
  };

  export const list = async (): Promise<Example.Entity[]> => {
    return Array.from(store.values()).map(toEntity);
  };
}
