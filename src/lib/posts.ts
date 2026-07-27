import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

export type Post = CollectionEntry<'posts'>;

export async function getPublishedPosts(lang: Lang = 'zh'): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft && data.lang === lang);
  return posts.sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  );
}

export function getAllTags(posts: Post[]) {
  const counts = new Map<string, number>();
  posts.forEach((post) => {
    post.data.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  });
  return [...counts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], posts[0]?.data.lang === 'en' ? 'en-US' : 'zh-CN'),
  );
}

export function formatDate(date: Date, lang: Lang = 'zh') {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function readingMinutes(body: string) {
  const latinWords = body.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  const chineseChars = body.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return Math.max(1, Math.ceil(latinWords / 220 + chineseChars / 400));
}

export function readingTimeLabel(body: string, lang: Lang = 'zh') {
  const minutes = readingMinutes(body);
  return lang === 'en' ? `${minutes} min read` : `${minutes} 分钟阅读`;
}
