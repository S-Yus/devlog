import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { newestFirst } from '../lib/content';

export async function GET(context: APIContext) {
  const guides = (await getCollection('guides'))
    .filter((entry) => !entry.data.draft)
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/guides/${entry.id}/`,
      data: { publishedAt: entry.data.publishedAt },
    }));
  const devlog = (await getCollection('devlog'))
    .filter((entry) => !entry.data.draft)
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/devlog/${entry.id}/`,
      data: { publishedAt: entry.data.publishedAt },
    }));
  const reading = (await getCollection('reading'))
    .filter((entry) => !entry.data.draft)
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/reading/${entry.id}/`,
      data: { publishedAt: entry.data.publishedAt },
    }));
  const items = [...guides, ...devlog, ...reading].sort(newestFirst);

  return rss({
    title: 'Yusei.dev',
    description: '技術ガイド，開発・研究の記録，読んだ資料の考察',
    site: context.site ?? 'https://yusei.dev',
    items,
    customData: '<language>ja</language>',
  });
}
