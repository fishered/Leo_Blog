import { access, readdir, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { sourceMatchesPlatform } from './platforms.mjs';

export const POSTS_ROOT = path.resolve('src/content/posts');
const DIST_ROOT = path.resolve('dist');
const EXCLUDED_SLUGS = new Set(['markdown-writing-guide', 'building-my-digital-garden']);

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const HTML_IMAGE_RE = /<img\b[^>]*\bsrc=(["'])(.*?)\1[^>]*>/gi;
const HTML_SRC_RE = /\bsrc=(["'])(.*?)\1/i;
const SUSPICIOUS_MOJIBAKE_RE = /(?:涓|鐨|杩|鎴|鍦|涔|鏄|锛|銆|鈥|€|绋|鍐|浣|灏|濡|闂|瀹|妫|彂|绾|傛|侊|犵)/g;

export function parseFrontmatter(markdown, file) {
  const match = markdown.match(FRONTMATTER_RE);
  if (!match) throw new Error(`${file}: missing YAML frontmatter`);
  const data = yaml.load(match[1]) ?? {};
  return {
    data,
    body: markdown.slice(match[0].length).trimStart(),
    rawFrontmatter: match[1],
  };
}

export function normalizeTitle(title = '') {
  return title
    .toString()
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
    .toLowerCase();
}

export function detectMojibake(text) {
  const hits = text.match(SUSPICIOUS_MOJIBAKE_RE) ?? [];
  return {
    count: hits.length,
    sample: [...new Set(hits)].slice(0, 8).join(' '),
    suspicious: hits.length >= 8,
  };
}

export function wantedLanguageForPlatform(platform) {
  return platform.language === 'en' ? 'en' : 'zh';
}

export function postFileForPlatform(postDir, platform) {
  return path.join(postDir, wantedLanguageForPlatform(platform) === 'en' ? 'en.md' : 'index.md');
}

export async function loadPostsForPlatform(platform, options = {}) {
  const entries = await readdir(POSTS_ROOT, { withFileTypes: true });
  const posts = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const dir = path.join(POSTS_ROOT, entry.name);
    const file = postFileForPlatform(dir, platform);
    let markdown;
    try {
      markdown = await readFile(file, 'utf8');
    } catch {
      continue;
    }

    const parsed = parseFrontmatter(markdown, file);
    const frontmatter = parsed.data;
    const language = frontmatter.lang ?? (file.endsWith('en.md') ? 'en' : 'zh');
    const slug = frontmatter.slug ?? entry.name;
    const draft = frontmatter.draft === true;

    if (EXCLUDED_SLUGS.has(slug)) {
      posts.push({
        slug,
        dir,
        file,
        markdown,
        body: parsed.body,
        frontmatter,
        language,
        draft,
        skipped: true,
        skipReason: 'excluded',
      });
      continue;
    }

    if (draft && !options.includeDrafts) {
      posts.push({
        slug,
        dir,
        file,
        markdown,
        body: parsed.body,
        frontmatter,
        language,
        draft,
        skipped: true,
        skipReason: 'draft',
      });
      continue;
    }

    posts.push({
      slug,
      dir,
      file,
      markdown,
      body: parsed.body,
      frontmatter,
      language,
      draft,
      skipped: false,
    });
  }

  return posts.sort((a, b) => {
    const ap = new Date(a.frontmatter.published ?? 0).getTime();
    const bp = new Date(b.frontmatter.published ?? 0).getTime();
    return bp - ap || a.slug.localeCompare(b.slug);
  });
}

export function extractMarkdownImages(body) {
  const images = [];
  for (const match of body.matchAll(MARKDOWN_IMAGE_RE)) {
    images.push({
      raw: match[0],
      url: match[1],
      index: match.index ?? -1,
    });
  }
  return images;
}

export function splitMarkdownBodyForEditor(body, postDir) {
  const segments = [];
  const imageFiles = [];
  let cursor = 0;

  for (const match of body.matchAll(MARKDOWN_IMAGE_RE)) {
    const start = match.index ?? cursor;
    const before = body.slice(cursor, start);
    if (before) segments.push({ type: 'text', value: before });

    const imageUrl = match[1];
    if (isRemoteUrl(imageUrl)) {
      segments.push({ type: 'text', value: match[0] });
    } else {
      const localFile = path.resolve(postDir, decodeURIComponent(imageUrl.split('#')[0].split('?')[0]));
      imageFiles.push(localFile);
      segments.push({ type: 'image', filePath: localFile, raw: match[0], alt: match[0] });
    }

    cursor = start + match[0].length;
  }

  const tail = body.slice(cursor);
  if (tail) segments.push({ type: 'text', value: tail });

  return { segments, imageFiles };
}

function isRemoteUrl(url) {
  return /^(?:https?:|data:|mailto:|#)/i.test(url);
}

async function exists(file) {
  try {
    await access(file, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function validatePost(post, platform, options = {}) {
  const errors = [];
  const warnings = [];
  const expectedLang = wantedLanguageForPlatform(platform);
  const title = post.frontmatter.title?.toString().trim();

  if (post.skipped) {
    return { ok: true, errors, warnings, skipped: true, skipReason: post.skipReason };
  }

  if (!title) errors.push('missing title');
  if (!post.frontmatter.slug) warnings.push('missing explicit slug; directory name will be used');
  if (!post.frontmatter.published) errors.push('missing published date');
  if (post.language !== expectedLang) {
    errors.push(`language mismatch: expected ${expectedLang}, found ${post.language}`);
  }

  const sourcePlatform = post.frontmatter.source?.platform;
  if (sourcePlatform && sourceMatchesPlatform(sourcePlatform, platform)) {
    warnings.push(`source platform is already ${platform.name}; default plan will skip it`);
  }

  const mojibake = detectMojibake(`${title ?? ''}\n${post.frontmatter.description ?? ''}\n${post.body}`);
  if (mojibake.suspicious && !options.allowMojibake) {
    errors.push(`suspected mojibake/encoding damage (${mojibake.count} hits: ${mojibake.sample})`);
  } else if (mojibake.suspicious) {
    warnings.push(`suspected mojibake ignored by --allow-mojibake (${mojibake.count} hits)`);
  }

  const images = extractMarkdownImages(post.body);
  for (const image of images) {
    if (isRemoteUrl(image.url)) {
      warnings.push(`external image cannot be verified offline: ${image.url}`);
      continue;
    }
    const localFile = path.resolve(post.dir, decodeURIComponent(image.url.split('#')[0].split('?')[0]));
    if (!(await exists(localFile))) {
      errors.push(`missing image: ${image.url}`);
    }
  }

  if (images.length && options.requirePublishedAssets) {
    const assets = await resolvePublishedAssets(post, platform, options.siteUrl);
    if (assets.errors.length) errors.push(...assets.errors);
    const localImageCount = images.filter((image) => !isRemoteUrl(image.url)).length;
    if (assets.urls.length < localImageCount) {
      errors.push(`dist image mapping incomplete: local markdown=${localImageCount}, dist=${assets.urls.length}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    skipped: false,
  };
}

export function shouldSkipForPlatform(post, platform) {
  if (post.skipped) return { skip: true, reason: post.skipReason };
  const sourcePlatform = post.frontmatter.source?.platform;
  if (sourcePlatform && sourceMatchesPlatform(sourcePlatform, platform)) {
    return { skip: true, reason: `source:${sourcePlatform}` };
  }
  return { skip: false };
}

export function publicPathForPost(post, platform) {
  const lang = wantedLanguageForPlatform(platform);
  return lang === 'en' ? `/en/posts/${post.slug}/` : `/posts/${post.slug}/`;
}

function distHtmlPathForPost(post, platform) {
  const lang = wantedLanguageForPlatform(platform);
  return lang === 'en'
    ? path.join(DIST_ROOT, 'en', 'posts', post.slug, 'index.html')
    : path.join(DIST_ROOT, 'posts', post.slug, 'index.html');
}

function absoluteUrl(siteUrl, assetPath) {
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  const cleanSite = (siteUrl ?? '').replace(/\/$/, '');
  if (!cleanSite) return assetPath;
  const cleanPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${cleanSite}${cleanPath}`;
}

function parseGitHubRepository(remoteUrl = '') {
  const cleanUrl = remoteUrl.trim();
  const httpsMatch = cleanUrl.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i);
  if (httpsMatch) return `${httpsMatch[1]}/${httpsMatch[2]}`;

  const sshMatch = cleanUrl.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (sshMatch) return `${sshMatch[1]}/${sshMatch[2]}`;

  return '';
}

async function readGitOriginUrl() {
  const config = await readFile(path.resolve('.git/config'), 'utf8').catch(() => '');
  const originBlock = config.match(/\[remote "origin"\]([\s\S]*?)(?:\n\[|$)/);
  return originBlock?.[1]?.match(/\n\s*url\s*=\s*(.+)/)?.[1]?.trim() ?? '';
}

async function readGitBranchName() {
  const head = await readFile(path.resolve('.git/HEAD'), 'utf8').catch(() => '');
  return head.match(/^ref:\s*refs\/heads\/(.+)\s*$/)?.[1]?.trim() || 'main';
}

async function defaultImageBaseUrl(siteUrl) {
  const envRepo = process.env.GITHUB_REPOSITORY;
  const repo = envRepo || parseGitHubRepository(await readGitOriginUrl());
  const branch = process.env.GITHUB_REF_NAME || await readGitBranchName();
  if (repo) return `https://cdn.jsdelivr.net/gh/${repo}@${branch}`;
  return siteUrl;
}

function encodePathForUrl(filePath) {
  return filePath
    .split(path.sep)
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function localImageFileForPost(post, imageUrl) {
  return path.resolve(post.dir, decodeURIComponent(imageUrl.split('#')[0].split('?')[0]));
}

function publicImageUrl(post, imageUrl, imageBaseUrl) {
  if (isRemoteUrl(imageUrl)) return imageUrl;
  const localFile = localImageFileForPost(post, imageUrl);
  const relativeFile = path.relative(process.cwd(), localFile);
  return `${imageBaseUrl.replace(/\/$/, '')}/${encodePathForUrl(relativeFile)}`;
}

function replaceHtmlImageSources(html, urls) {
  let imageIndex = 0;
  return html.replace(HTML_IMAGE_RE, (img) => {
    const nextUrl = urls[imageIndex];
    imageIndex += 1;
    if (!nextUrl) return img;

    const src = img.match(HTML_SRC_RE)?.[2];
    return src ? img.replace(src, nextUrl) : img;
  });
}

function extractArticleContentHtml(html) {
  const match = html.match(/<div class="prose article-content">([\s\S]*?)<\/div><aside class="toc"/);
  if (match) return match[1];
  const fallback = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  return fallback?.[1] ?? '';
}

export async function resolvePublishedAssets(post, platform, siteUrl) {
  const errors = [];
  const distHtml = distHtmlPathForPost(post, platform);
  let html;
  try {
    html = await readFile(distHtml, 'utf8');
  } catch {
    return {
      urls: [],
      html: '',
      errors: [`missing built article HTML: ${distHtml}; run npm run build first`],
    };
  }

  const articleHtml = extractArticleContentHtml(html);
  const urls = [];
  for (const match of articleHtml.matchAll(HTML_IMAGE_RE)) {
    urls.push(absoluteUrl(siteUrl, match[2]));
  }

  const htmlWithAbsoluteAssets = articleHtml.replace(HTML_IMAGE_RE, (img) => {
    const src = img.match(HTML_SRC_RE)?.[2];
    if (!src) return img;
    return img.replace(src, absoluteUrl(siteUrl, src));
  });

  return {
    urls,
    html: htmlWithAbsoluteAssets,
    errors,
  };
}

export async function prepareArticleForPlatform(post, platform, options = {}) {
  const siteUrl = options.siteUrl ?? process.env.PUBLIC_SITE_URL ?? process.env.SITE ?? 'https://fishered.github.io/Leo_Blog';
  const imageBaseUrl = options.imageBaseUrl ?? process.env.CROSSPOST_IMAGE_BASE_URL ?? await defaultImageBaseUrl(siteUrl);
  const images = extractMarkdownImages(post.body);
  const assets = await resolvePublishedAssets(post, platform, siteUrl);
  if (assets.errors.length) {
    throw new Error(assets.errors.join('\n'));
  }
  if (assets.urls.length < images.length) {
    throw new Error(`Cannot publish ${post.slug}: dist image mapping incomplete (${assets.urls.length}/${images.length})`);
  }

  let markdown = post.body;
  const imageUrls = images.map((image) => publicImageUrl(post, image.url, imageBaseUrl));
  const { segments: editorSegments, imageFiles } = splitMarkdownBodyForEditor(post.body, post.dir);
  images.forEach((image, index) => {
    if (isRemoteUrl(image.url)) return;
    markdown = markdown.replace(image.url, imageUrls[index]);
  });

  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description ?? '',
    tags: Array.isArray(post.frontmatter.tags) ? post.frontmatter.tags : [],
    slug: post.slug,
    sourceUrl: post.frontmatter.source?.url,
    canonicalUrl: absoluteUrl(siteUrl, publicPathForPost(post, platform)),
    markdown,
    html: replaceHtmlImageSources(assets.html, imageUrls),
    imageUrls,
    editorSegments,
    imageFiles,
  };
}

export async function verifyRemoteAssets(urls) {
  const checks = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { method: 'GET' });
        return { url, ok: response.ok, status: response.status };
      } catch (error) {
        return { url, ok: false, error: error.message };
      }
    }),
  );
  return checks;
}
