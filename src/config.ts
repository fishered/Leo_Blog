const publicSiteUrl = (import.meta.env.PUBLIC_SITE_URL ?? 'https://fishered.github.io/Leo_Blog').replace(/\/$/, '');

export const siteConfig = {
  title: "Leo's Blog",
  displayName: 'Leo',
  subtitle: '记录技术，也记录生活。',
  description: '记录软件开发、系统设计、AI 与生活里的小小发现。',
  author: 'Leo',
  avatar: '/images/leo-zhihu-avatar.jpg',
  signature: '愿每次记录，都让下一次出发轻松一点。',
  notice: '欢迎来到我的个人博客。旧文章正在慢慢搬家，新的思考也会继续在这里生长。',
  github: 'https://github.com/fishered',
  publicUrl: publicSiteUrl,
  feedUrl: `${publicSiteUrl}/rss.xml`,
} as const;

export const localizedSiteConfig = {
  zh: {
    ...siteConfig,
    feedUrl: `${publicSiteUrl}/rss.xml`,
  },
  en: {
    ...siteConfig,
    subtitle: 'Engineering notes on Java, AI, architecture, and the messy parts in between.',
    description: 'Technical field notes about software engineering, system design, AI, and practical debugging.',
    signature: 'Each note should make the next departure a little lighter.',
    notice: 'Welcome to my personal technical notebook. Older posts are being organized here, and new engineering notes will keep growing.',
    feedUrl: `${publicSiteUrl}/en/rss.xml`,
  },
} as const;
