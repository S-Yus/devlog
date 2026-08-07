import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { DEVLOG_KIND_VALUES } from './lib/devlog-kinds';
import { GUIDE_CATEGORY_VALUES } from './lib/guide-categories';

const devlogCommon = {
  title: z.string().min(1),
  description: z.string().min(1),
  publishedAt: z.coerce.date(),
  tags: z.array(z.string().min(1)),
  draft: z.boolean(),
};

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    status: z.enum(['draft', 'verified', 'needs-update', 'deprecated']),
    category: z.enum(GUIDE_CATEGORY_VALUES),
    tags: z.array(z.string().min(1)),
    environment: z.array(z.string().min(1)),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedMinutes: z.number().int().positive(),
    draft: z.boolean(),
  }),
});

const devlog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/devlog' }),
  schema: z.preprocess(
    (value) => {
      if (typeof value !== 'object' || value === null || 'kind' in value) return value;
      return { ...value, kind: DEVLOG_KIND_VALUES[1] };
    },
    z.discriminatedUnion('kind', [
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
    ]),
  ),
});

export const collections = { guides, devlog };
