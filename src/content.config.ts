import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    status: z.enum(['draft', 'verified', 'needs-update', 'deprecated']),
    category: z.string().min(1),
    tags: z.array(z.string().min(1)),
    environment: z.array(z.string().min(1)),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedMinutes: z.number().int().positive(),
    draft: z.boolean(),
  }),
});

const devlog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/devlog' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    project: z.string().min(1),
    status: z.enum(['planning', 'ongoing', 'blocked', 'completed', 'abandoned']),
    tags: z.array(z.string().min(1)),
    draft: z.boolean(),
  }),
});

export const collections = { guides, devlog };
