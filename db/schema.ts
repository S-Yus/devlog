export const createArticleLikesTableSql = `
  CREATE TABLE IF NOT EXISTS article_likes (
    path TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (path, voter_id)
  )
`;
