import { withBase } from './url';

export const languages = {
  zh: '中文',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'zh';

export const ui = {
  zh: {
    title: "Leo's Blog",
    displayName: 'Leo',
    subtitle: '记录技术，也记录生活。',
    description: '记录软件开发、系统设计、AI 与生活里的小小发现。',
    signature: '愿每次记录，都让下一次出发轻松一点。',
    notice: '欢迎来到我的个人博客。旧文章正在慢慢搬家，新的思考也会继续在这里生长。',
    nav: {
      home: '首页',
      articles: '文章',
      tags: '标签',
      archive: '归档',
      about: '关于',
      search: '搜索文章',
    },
    heroTopics: ['代码', '阅读', '生活'],
    keepScrolling: 'KEEP SCROLLING',
    langSwitch: 'EN',
    readingMinute: '分钟',
    readingSuffix: '分钟阅读',
    postTagsLabel: '文章标签',
    pagination: {
      label: '文章分页',
      previous: '上一页',
      next: '下一页',
    },
    footer: {
      rss: '订阅更新',
      about: '关于',
      powered: '内容由 Markdown 驱动，托管于 GitHub Pages。',
    },
    floating: {
      label: '快捷工具',
      mobileLabel: '移动端快捷导航',
      top: '返回顶部',
      tags: '浏览标签',
      theme: '切换配色',
      home: '首页',
      articles: '文章',
      search: '搜索',
      skin: '换肤',
    },
    article: {
      fallbackSeries: '随手记',
      published: '发布于',
      updated: '修订于',
      toc: '本文目录',
      noToc: '短文暂无目录',
      relatedEyebrow: '继续逛逛',
      relatedTitle: '也许你还想读',
      defaultTag: '文章',
    },
    provenance: {
      label: '文章发布轨迹',
      eyebrow: '发布轨迹',
      original: '原始发布',
      firstPublished: '首次发表于',
      migrated: '迁移至个人博客',
      publishedHere: '发布于个人博客',
      updated: '最后修订',
    },
    search: {
      loading: '搜索索引会在生产构建后加载。',
      placeholder: '搜索文章...',
    },
  },
  en: {
    title: "Leo's Blog",
    displayName: 'Leo',
    subtitle: 'Engineering notes on Java, AI, architecture, and the messy parts in between.',
    description: 'Technical field notes about software engineering, system design, AI, and practical debugging.',
    signature: 'Each note should make the next departure a little lighter.',
    notice: 'Welcome to my personal technical notebook. Older posts are being organized here, and new engineering notes will keep growing.',
    nav: {
      home: 'Home',
      articles: 'Articles',
      tags: 'Topics',
      archive: 'Archive',
      about: 'About',
      search: 'Search posts',
    },
    heroTopics: ['Code', 'Systems', 'AI'],
    keepScrolling: 'KEEP SCROLLING',
    langSwitch: '中文',
    readingMinute: 'min',
    readingSuffix: 'min read',
    postTagsLabel: 'Post tags',
    pagination: {
      label: 'Post pagination',
      previous: 'Previous page',
      next: 'Next page',
    },
    footer: {
      rss: 'RSS',
      about: 'About',
      powered: 'Written in Markdown and hosted on GitHub Pages.',
    },
    floating: {
      label: 'Quick tools',
      mobileLabel: 'Mobile quick navigation',
      top: 'Back to top',
      tags: 'Browse topics',
      theme: 'Toggle theme',
      home: 'Home',
      articles: 'Articles',
      search: 'Search',
      skin: 'Theme',
    },
    article: {
      fallbackSeries: 'Field note',
      published: 'Published on',
      updated: 'Updated on',
      toc: 'Contents',
      noToc: 'No table of contents for this short note',
      relatedEyebrow: 'Keep reading',
      relatedTitle: 'You may also like',
      defaultTag: 'Post',
    },
    provenance: {
      label: 'Publication trail',
      eyebrow: 'Publication trail',
      original: 'Original publication',
      firstPublished: 'First published on',
      migrated: 'Migrated to personal blog',
      publishedHere: 'Published on personal blog',
      updated: 'Last updated',
    },
    search: {
      loading: 'The search index is loaded after a production build.',
      placeholder: 'Search posts...',
    },
  },
} as const;

export function getLangFromPath(pathname: string): Lang {
  const base = import.meta.env.BASE_URL;
  const basePath = base.endsWith('/') ? base : `${base}/`;
  const path = pathname.startsWith(basePath)
    ? `/${pathname.slice(basePath.length)}`
    : pathname;
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'zh';
}

export function localizedPath(path: string, lang: Lang) {
  const normalized = path === '/' ? '/' : `/${path.replace(/^\/|\/$/g, '')}/`;
  return withBase(lang === 'en' ? `/en${normalized === '/' ? '/' : normalized}` : normalized);
}

export function switchLanguagePath(pathname: string, target: Lang) {
  const base = import.meta.env.BASE_URL;
  const basePath = base.endsWith('/') ? base : `${base}/`;
  const path = pathname.startsWith(basePath)
    ? `/${pathname.slice(basePath.length)}`
    : pathname;
  const withoutLang = path === '/en' || path === '/en/'
    ? '/'
    : path.replace(/^\/en(?=\/)/, '');
  return localizedPath(withoutLang, target);
}

export function postPath(slug: string, lang: Lang) {
  return localizedPath(`/posts/${slug}/`, lang);
}

export function tagPath(tag: string, lang: Lang) {
  return localizedPath(`/tags/${encodeURIComponent(tag)}/`, lang);
}

export function pagedPath(page: number, lang: Lang) {
  return localizedPath(page === 1 ? '/' : `/page/${page}/`, lang);
}
