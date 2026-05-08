export const binderChunkRefsTableSql = `
  -- Cross-binder chunk references + tokenizable text. PRD §9 specs a
  -- contentless FTS5 (content=''), but contentless FTS5 DELETE/UPDATE
  -- semantics require the caller to surface the full original column
  -- values for every removal -- unworkable for removeDocument without
  -- a round-trip back to DocumentDO. Use external-content FTS5 instead:
  -- text lives once in binder_chunk_refs.text and the FTS index is
  -- kept in sync via triggers. Trades modest BinderDO storage growth
  -- for clean UPSERT/DELETE behavior. Pure contentless can revisit
  -- if BinderDO size becomes a bottleneck (PRD §18 open question 1).
  CREATE TABLE binder_chunk_refs (
    rowid INTEGER PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    document_title TEXT NOT NULL,
    kind TEXT NOT NULL,
    section_key TEXT NOT NULL,
    section_title TEXT,
    section_order INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    text_path TEXT NOT NULL,
    text TEXT NOT NULL
  );
  CREATE INDEX idx_binder_chunk_refs_document ON binder_chunk_refs(document_id);
  CREATE INDEX idx_binder_chunk_refs_kind ON binder_chunk_refs(kind);
  CREATE UNIQUE INDEX idx_binder_chunk_refs_unique
    ON binder_chunk_refs(document_id, section_key, chunk_index);
`;

export const binderChunksFtsTableSql = `
  CREATE VIRTUAL TABLE binder_chunks_fts USING fts5(
    document_title,
    section_title,
    text,
    content='binder_chunk_refs',
    content_rowid='rowid',
    tokenize='porter unicode61 remove_diacritics 2'
  );
`;

export const binderChunkRefsTriggersSql = `
  CREATE TRIGGER binder_chunk_refs_ai AFTER INSERT ON binder_chunk_refs BEGIN
    INSERT INTO binder_chunks_fts(rowid, document_title, section_title, text)
    VALUES (new.rowid, new.document_title, new.section_title, new.text);
  END;
  CREATE TRIGGER binder_chunk_refs_ad AFTER DELETE ON binder_chunk_refs BEGIN
    INSERT INTO binder_chunks_fts(binder_chunks_fts, rowid, document_title, section_title, text)
    VALUES ('delete', old.rowid, old.document_title, old.section_title, old.text);
  END;
  CREATE TRIGGER binder_chunk_refs_au AFTER UPDATE ON binder_chunk_refs BEGIN
    INSERT INTO binder_chunks_fts(binder_chunks_fts, rowid, document_title, section_title, text)
    VALUES ('delete', old.rowid, old.document_title, old.section_title, old.text);
    INSERT INTO binder_chunks_fts(rowid, document_title, section_title, text)
    VALUES (new.rowid, new.document_title, new.section_title, new.text);
  END;
`;

export type BinderSearchHit = {
  documentId: string;
  documentTitle: string;
  kind: string;
  sectionKey: string;
  sectionTitle: string | null;
  chunkIndex: number;
  score: number;
  terms: string[];
};

export type BinderSearchInput = {
  query: string;
  limit?: number;
  kind?: string;
  excludeDocumentId?: string;
  excludeSectionKey?: string;
};
