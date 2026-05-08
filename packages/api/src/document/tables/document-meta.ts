export const documentMetaTableSql = `
  CREATE TABLE document_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export type InitInput = {
  documentId: string;
  userId: string;
  kind: string;
  manifestKey: string;
  contentHash: string;
};

export type DocumentMeta = {
  documentId: string | null;
  userId: string | null;
  kind: string | null;
  manifestKey: string | null;
  contentHash: string | null;
};
