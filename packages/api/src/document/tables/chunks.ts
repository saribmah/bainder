import type { SectionInput } from "./sections";

export const chunksTableSql = `
  CREATE TABLE chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_key TEXT NOT NULL REFERENCES sections(section_key) ON DELETE CASCADE,
    section_order INTEGER NOT NULL,
    section_title TEXT,
    chunk_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    text_path TEXT NOT NULL,
    text TEXT NOT NULL
  );
  CREATE UNIQUE INDEX idx_chunks_unique ON chunks(section_key, chunk_index);
  CREATE INDEX idx_chunks_section ON chunks(section_key);
`;

export const chunksFtsTableSql = `
  CREATE VIRTUAL TABLE chunks_fts USING fts5(
    section_title,
    text,
    content='chunks',
    content_rowid='id',
    tokenize='porter unicode61 remove_diacritics 2'
  );
`;

export type ChunkInput = {
  sectionKey: string;
  sectionOrder: number;
  sectionTitle: string | null;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  textPath: string;
  text: string;
};

export type IndexChunksInput = {
  sections: SectionInput[];
  chunks: ChunkInput[];
};

export type ChunkSnippet = {
  sectionKey: string;
  sectionTitle: string | null;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
};

export type DocumentSearchHit = {
  sectionKey: string;
  sectionTitle: string | null;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  score: number;
  snippet: string;
};
