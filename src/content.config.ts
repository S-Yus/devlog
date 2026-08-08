import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { DEVLOG_KIND_VALUES } from './lib/devlog-kinds';
import { GUIDE_CATEGORY_VALUES } from './lib/guide-categories';
import { READING_SOURCE_TYPE_VALUES } from './lib/reading-source-types';

const historySchema = z
  .array(
    z.object({
      at: z.coerce.date(),
      summary: z.string().min(1),
    }),
  )
  .superRefine((entries, context) => {
    for (let index = 1; index < entries.length; index += 1) {
      const entry = entries[index];
      const previousEntry = entries[index - 1];
      if (!entry || !previousEntry) continue;

      if (entry.at.valueOf() < previousEntry.at.valueOf()) {
        context.addIssue({
          code: 'custom',
          message: '更新履歴は古い順に並べてください。',
          path: [index, 'at'],
        });
      }
    }
  });

const requirePublishedHistory = (
  data: { draft: boolean; history: Array<unknown> },
  context: z.RefinementCtx,
) => {
  if (!data.draft && data.history.length === 0) {
    context.addIssue({
      code: 'custom',
      message: '公開記事には更新履歴が1件以上必要です。',
      path: ['history'],
    });
  }
};

const devlogCommon = {
  title: z.string().min(1),
  description: z.string().min(1),
  publishedAt: z.coerce.date(),
  tags: z.array(z.string().min(1)),
  history: historySchema,
  draft: z.boolean(),
};

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      publishedAt: z.coerce.date(),
      status: z.enum(['draft', 'verified', 'needs-update', 'deprecated']),
      category: z.enum(GUIDE_CATEGORY_VALUES),
      tags: z.array(z.string().min(1)),
      environment: z.array(z.string().min(1)),
      estimatedMinutes: z.number().int().positive(),
      history: historySchema,
      draft: z.boolean(),
    })
    .superRefine(requirePublishedHistory),
});

const devlog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/devlog' }),
  schema: z.preprocess(
    (value) => {
      if (typeof value !== 'object' || value === null || 'kind' in value) return value;
      return { ...value, kind: DEVLOG_KIND_VALUES[1] };
    },
    z
      .discriminatedUnion('kind', [
        z.object({
          ...devlogCommon,
          kind: z.literal(DEVLOG_KIND_VALUES[0]),
        }),
        z.object({
          ...devlogCommon,
          kind: z.literal(DEVLOG_KIND_VALUES[1]),
          project: z.string().min(1),
          status: z.enum(['planning', 'ongoing', 'blocked', 'completed', 'abandoned']),
        }),
      ])
      .superRefine(requirePublishedHistory),
  ),
});

const reading = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reading' }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().min(1),
      publishedAt: z.coerce.date(),
      sourceType: z.enum(READING_SOURCE_TYPE_VALUES),
      sourceTitle: z.string().min(1),
      sourceUrl: z.url(),
      authors: z.array(z.string().min(1)),
      readAt: z.coerce.date(),
      tags: z.array(z.string().min(1)),
      history: historySchema,
      draft: z.boolean(),
    })
    .superRefine(requirePublishedHistory),
});

export const collections = { guides, devlog, reading };
