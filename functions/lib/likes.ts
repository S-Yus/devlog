import { createArticleLikesTableSql } from '../../db/schema';

interface LikeCountRow {
  path: string;
  count: number;
}

interface LikeMatchRow {
  path: string;
  voter_id: string;
}

let schemaReady: Promise<void> | undefined;

export const isArticlePath = (path: string) =>
  /^\/(guides|devlog)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(path);

export const isVoterId = (value: string) => /^[a-zA-Z0-9-]{16,80}$/.test(value);

export const ensureLikesSchema = async (db: D1Database) => {
  schemaReady ??= db
    .prepare(createArticleLikesTableSql)
    .run()
    .then(() => undefined)
    .catch((error: unknown) => {
      schemaReady = undefined;
      throw error;
    });

  await schemaReady;
};

export const getLikeCounts = async (db: D1Database, paths: string[]) => {
  const uniquePaths = [...new Set(paths)];
  const counts = Object.fromEntries(uniquePaths.map((path) => [path, 0]));
  if (uniquePaths.length === 0) return counts;

  const placeholders = uniquePaths.map(() => '?').join(', ');
  const query = `
    SELECT path, COUNT(*) AS count
    FROM article_likes
    WHERE path IN (${placeholders})
    GROUP BY path
  `;
  const result = await db.prepare(query).bind(...uniquePaths).all<LikeCountRow>();

  for (const row of result.results) counts[row.path] = Number(row.count);
  return counts;
};

export const getLikeMatches = async (
  db: D1Database,
  paths: string[],
  voterIds: string[],
) => {
  const uniquePaths = [...new Set(paths)];
  const uniqueVoterIds = [...new Set(voterIds)];
  if (uniquePaths.length === 0 || uniqueVoterIds.length === 0) return [];

  const pathPlaceholders = uniquePaths.map(() => '?').join(', ');
  const voterPlaceholders = uniqueVoterIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `SELECT path, voter_id
       FROM article_likes
       WHERE path IN (${pathPlaceholders})
         AND voter_id IN (${voterPlaceholders})`,
    )
    .bind(...uniquePaths, ...uniqueVoterIds)
    .all<LikeMatchRow>();

  return result.results;
};

export const recordLike = async (
  db: D1Database,
  path: string,
  voterIds: string[],
  preferredVoterId: string,
) => {
  const uniqueVoterIds = [...new Set(voterIds)];
  const matches = await getLikeMatches(db, [path], uniqueVoterIds);
  const matchedVoterIds = new Set(matches.map((match) => match.voter_id));
  const existingVoterId = uniqueVoterIds.find((voterId) => matchedVoterIds.has(voterId));
  const voterId = existingVoterId ?? preferredVoterId;

  let accepted = false;
  if (!existingVoterId) {
    const inserted = await db
      .prepare('INSERT OR IGNORE INTO article_likes (path, voter_id) VALUES (?, ?)')
      .bind(path, voterId)
      .run();
    accepted = inserted.meta.changes > 0;
  }

  const count = await db
    .prepare('SELECT COUNT(*) AS count FROM article_likes WHERE path = ?')
    .bind(path)
    .first<number>('count');

  return {
    count: Number(count ?? 0),
    accepted,
    voterId,
  };
};
