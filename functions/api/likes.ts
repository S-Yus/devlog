import { ensureLikesSchema, getLikeCounts, isArticlePath, isVoterId, recordLike } from '../lib/likes';

interface Env {
  DB?: D1Database;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

const getDatabase = (env: Env) => env.DB;

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const db = getDatabase(env);
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 503);

  const paths = new URL(request.url).searchParams
    .getAll('path')
    .filter(isArticlePath)
    .slice(0, 50);

  try {
    await ensureLikesSchema(db);
    return json({ likes: await getLikeCounts(db, paths) });
  } catch (error) {
    console.error('Failed to read article likes', error);
    return json({ error: 'Failed to read likes.' }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const db = getDatabase(env);
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 503);

  const requestUrl = new URL(request.url);
  const requestOrigin = request.headers.get('Origin');
  if (requestOrigin && requestOrigin !== requestUrl.origin) {
    return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  }

  let payload: { path?: unknown; voterId?: unknown };
  try {
    payload = (await request.json()) as { path?: unknown; voterId?: unknown };
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const path = typeof payload.path === 'string' ? payload.path : '';
  const voterId = typeof payload.voterId === 'string' ? payload.voterId : '';
  if (!isArticlePath(path) || !isVoterId(voterId)) {
    return json({ error: 'Invalid like request.' }, 400);
  }

  try {
    await ensureLikesSchema(db);
    return json(await recordLike(db, path, voterId));
  } catch (error) {
    console.error('Failed to record article like', error);
    return json({ error: 'Failed to record like.' }, 500);
  }
};
