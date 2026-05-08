export const summariesTableSql = `
  CREATE TABLE summaries (
    target_type TEXT NOT NULL,
    target_key TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    summary TEXT NOT NULL,
    model TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (target_type, target_key, content_hash)
  );
`;
