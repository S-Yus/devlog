import {
  ensureLikesSchema,
  getLikeCounts,
  getLikeMatches,
  isArticlePath,
  isVoterId,
  recordLike,
} from '../lib/likes';

interface Env {
  DB?: D1Database;
}

const voterCookieName = 'yusei_like_voter';
const voterCookieMaxAge = 60 * 60 * 24 * 400;

const json = (body: unknown, status = 200, additionalHeaders?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...Object.fromEntries(new Headers(additionalHeaders)),
    },
  });

const getDatabase = (env: Env) => env.DB;

const getCookieVoterId = (request: Request) => {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return undefined;

  for (const part of cookie.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name !== voterCookieName) continue;
    const value = valueParts.join('=');
    return isVoterId(value) ? value : undefined;
  }

  return undefined;
};

const createVoterCookie = (request: Request, voterId: string) => {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${voterCookieName}=${voterId}; Path=/; Max-Age=${voterCookieMaxAge}; SameSite=Lax; HttpOnly${secure}`;
};

const uniqueVoterIds = (...values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value && isVoterId(value))))];

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const db = getDatabase(env);
  if (!db) return json({ error: 'D1 binding DB is not configured.' }, 503);

  const requestUrl = new URL(request.url);
  const paths = requestUrl.searchParams
    .getAll('path')
    .filter(isArticlePath)
    .slice(0, 50);
  const cookieVoterId = getCookieVoterId(request);
  const suppliedVoterId = request.headers.get('X-Voter-ID') ?? undefined;
  const voterIds = uniqueVoterIds(cookieVoterId, suppliedVoterId);

  try {
    await ensureLikesSchema(db);
    const [likes, matches] = await Promise.all([
      getLikeCounts(db, paths),
      getLikeMatches(db, paths, voterIds),
    ]);
    const matchedVoterIds = new Set(matches.map((match) => match.voter_id));
    const voterId =
      voterIds.find((candidate) => matchedVoterIds.has(candidate)) ??
      cookieVoterId ??
      voterIds[0] ??
      crypto.randomUUID();
    const likedPaths = new Set(matches.map((match) => match.path));
    const liked = Object.fromEntries(paths.map((path) => [path, likedPaths.has(path)]));

    return json(
      { likes, liked },
      200,
      { 'Set-Cookie': createVoterCookie(request, voterId) },
    );
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
  const suppliedVoterId = typeof payload.voterId === 'string' ? payload.voterId : undefined;
  if (!isArticlePath(path) || (suppliedVoterId !== undefined && !isVoterId(suppliedVoterId))) {
    return json({ error: 'Invalid like request.' }, 400);
  }

  const cookieVoterId = getCookieVoterId(request);
  const voterIds = uniqueVoterIds(cookieVoterId, suppliedVoterId);
  const preferredVoterId = cookieVoterId ?? suppliedVoterId ?? crypto.randomUUID();

  try {
    await ensureLikesSchema(db);
    const result = await recordLike(db, path, voterIds, preferredVoterId);
    const { voterId, ...response } = result;
    return json(
      response,
      200,
      { 'Set-Cookie': createVoterCookie(request, voterId) },
    );
  } catch (error) {
    console.error('Failed to record article like', error);
    return json({ error: 'Failed to record like.' }, 500);
  }
};
