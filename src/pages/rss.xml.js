import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/posts';
import { localizedSiteConfig } from '../config';

export async function GET() {
  const siteConfig = localizedSiteConfig.zh;
  const posts = await getPublishedPosts('zh');
  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: siteConfig.publicUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: `${siteConfig.publicUrl}/posts/${post.data.slug}/`,
      categories: post.data.tags,
    })),
    customData: '<language>zh-CN</language>',
  });
}
