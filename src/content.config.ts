import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/posts',
    generateId: ({ entry }) =>
      entry
        .replaceAll('\\', '/')
        .replace(/\/index\.mdx?$/, '')
        .replace(/\.mdx?$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lang: z.enum(['zh', 'en']).default('zh'),
    translationKey: z.string().optional(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    slug: z.string(),
    tags: z.array(z.string()).default([]),
    series: z.string().optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    source: z
      .object({
        platform: z.string(),
        url: z.url(),
        published: z.coerce.date().optional(),
      })
      .optional(),
  }),
});

export const collections = { posts };
