export const sectionsTableSql = `
  CREATE TABLE sections (
    section_key TEXT PRIMARY KEY,
    section_order INTEGER NOT NULL,
    title TEXT,
    word_count INTEGER,
    text_path TEXT NOT NULL
  );
  CREATE INDEX idx_sections_order ON sections(section_order);
`;

export type SectionInput = {
  sectionKey: string;
  sectionOrder: number;
  title: string | null;
  wordCount: number;
  textPath: string;
};
