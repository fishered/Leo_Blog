export const PLATFORM_CONFIGS = {
  juejin: {
    id: 'juejin',
    name: 'Juejin',
    language: 'zh',
    aliases: ['juejin', '掘金'],
    homeUrl: 'https://juejin.cn',
    loginUrl: 'https://juejin.cn/login',
    searchUrl: (title) => `https://juejin.cn/search?query=${encodeURIComponent(title)}&type=0`,
    newPostUrl: 'https://juejin.cn/editor/drafts/new?v=2',
    pasteMode: 'markdown',
    directTextInput: true,
    titleSelectors: [
      'textarea.title-input',
      'textarea[placeholder="输入文章标题..."]',
      'input[placeholder*="标题"]',
      'textarea[placeholder*="标题"]',
      '.title-input input',
      '.title-input textarea',
      '[data-testid*="title"] input',
      '[class*="title"] textarea',
      '[class*="title"] input',
    ],
    bodySelectors: [
      '.bytemd-editor .cm-content[contenteditable="true"]',
      '.cm-editor .cm-content[contenteditable="true"]',
      '.cm-content[contenteditable="true"]',
      '.CodeMirror textarea',
      'textarea[placeholder*="Markdown"]',
      '[contenteditable="true"]',
    ],
    publishButtonNames: [/发布/, /Publish/i],
  },

  cnblogs: {
    id: 'cnblogs',
    name: 'Cnblogs',
    language: 'zh',
    aliases: ['cnblogs', '博客园', '博客園', 'Cnblogs'],
    homeUrl: 'https://www.cnblogs.com',
    loginUrl: 'https://account.cnblogs.com/signin',
    searchUrl: (title) => `https://zzk.cnblogs.com/s/blogpost?w=${encodeURIComponent(title)}`,
    newPostUrl: 'https://i.cnblogs.com/posts/edit',
    pasteMode: 'markdown',
    titleSelectors: [
      '#post-title',
      '#Editor_Edit_txbTitle',
      'input[name*="Title"]',
      'input[placeholder*="标题"]',
      'input',
    ],
    bodySelectors: [
      '#md-editor textarea',
      '#Editor_Edit_EditorBody',
      '.CodeMirror textarea',
      'textarea',
      'iframe',
      '[contenteditable="true"]',
    ],
    publishButtonNames: [/发布/, /保存并发布/, /Publish/i],
  },

  zhihu: {
    id: 'zhihu',
    name: 'Zhihu',
    language: 'zh',
    aliases: ['zhihu', '知乎', 'Zhihu'],
    homeUrl: 'https://www.zhihu.com',
    loginUrl: 'https://www.zhihu.com/signin',
    searchUrl: (title) => `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(title)}`,
    newPostUrl: 'https://zhuanlan.zhihu.com/write',
    pasteMode: 'html',
    embedLocalImagesAsDataUri: true,
    rasterizeSvgImages: true,
    titleSelectors: [
      'textarea[placeholder*="标题"]',
      'input[placeholder*="标题"]',
      '.WriteIndex-titleInput textarea',
      '[contenteditable="true"][data-placeholder*="标题"]',
    ],
    bodySelectors: [
      '.RichText .public-DraftEditor-content',
      '.DraftEditor-editorContainer [contenteditable="true"]',
      '[contenteditable="true"]',
    ],
    publishButtonNames: [/发布/, /Publish/i],
  },

  devto: {
    id: 'devto',
    name: 'dev.to',
    language: 'en',
    aliases: ['dev.to', 'devto', 'dev', 'DEV Community'],
    homeUrl: 'https://dev.to',
    loginUrl: 'https://dev.to/enter',
    searchUrl: (title) => `https://dev.to/search?q=${encodeURIComponent(title)}`,
    dashboardUrl: 'https://dev.to/dashboard',
    newPostUrl: 'https://dev.to/new',
    pasteMode: 'markdown',
    titleSelectors: [
      '#article-form-title',
      'textarea[placeholder*="title"]',
      'input[placeholder*="title"]',
      'textarea[name*="title"]',
    ],
    bodySelectors: [
      '#article_body_markdown',
      'textarea[name*="body_markdown"]',
      'textarea',
      '[contenteditable="true"]',
    ],
    tagSelectors: [
      'input[name="tag_list"]',
      'input#tag-input',
      'input[placeholder*="tags"]',
      'input[placeholder*="Add up to"]',
      '[data-testid*="tag"] input',
    ],
    publishButtonNames: [/Publish/i, /Save changes/i],
    confirmPublishButtonNames: [/Publish/i, /Confirm/i, /Yes, publish/i],
    successUrlPattern: /^https:\/\/dev\.to\/[^/]+\/[^/]+/i,
  },
};

export function getPlatform(id) {
  const key = id?.toLowerCase();
  const platform = PLATFORM_CONFIGS[key];
  if (!platform) {
    throw new Error(`Unknown platform "${id}". Expected one of: ${Object.keys(PLATFORM_CONFIGS).join(', ')}`);
  }
  return platform;
}

export function listPlatforms() {
  return Object.values(PLATFORM_CONFIGS);
}

export function normalizePlatformName(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replaceAll('.', '')
    .replaceAll('-', '')
    .replaceAll('_', '')
    .replace(/\s+/g, '');
}

export function sourceMatchesPlatform(sourcePlatform, platform) {
  const source = normalizePlatformName(sourcePlatform);
  return platform.aliases.some((alias) => normalizePlatformName(alias) === source);
}
