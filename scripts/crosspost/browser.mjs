import { existsSync } from 'node:fs';
import path from 'node:path';
import { findRecordedTitle, recordTitle } from './state.mjs';
import { normalizeTitle } from './content.mjs';

const PROFILE_DIR = path.resolve('.crosspost/chrome-profile');
const PUBLISH_BLOCKER_PATTERNS = [
  /账户.*受.*限制/,
  /账号.*受.*限制/,
  /暂时无法发布/,
  /无法发布文章/,
  /发布失败/,
  /操作频繁/,
  /验证码/,
  /captcha/i,
];
const DASHBOARD_TITLE_CACHE = new WeakMap();

async function loadPlaywright() {
  try {
    return await import('playwright-core');
  } catch {
    throw new Error('Missing browser automation dependency. Install it with: npm install -D playwright-core');
  }
}

function chromeExecutableCandidates() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe'),
  ].filter(Boolean);
}

export async function launchChrome(options = {}) {
  const { chromium } = await loadPlaywright();
  const baseOptions = {
    headless: options.headless ?? false,
    viewport: { width: 1440, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
  };

  try {
    return await chromium.launchPersistentContext(PROFILE_DIR, {
      ...baseOptions,
      channel: 'chrome',
    });
  } catch (channelError) {
    const executablePath = chromeExecutableCandidates().find((candidate) => existsSync(candidate));
    if (!executablePath) throw channelError;
    return await chromium.launchPersistentContext(PROFILE_DIR, {
      ...baseOptions,
      executablePath,
    });
  }
}

export async function openLogin(platform, options = {}) {
  const context = await launchChrome(options);
  const page = await context.newPage();
  await page.goto(platform.loginUrl ?? platform.homeUrl, { waitUntil: 'domcontentloaded' });
  console.log(`Opened ${platform.name} login page.`);
  console.log('Finish login in Chrome, then stop this command with Ctrl+C. The session is saved under .crosspost/chrome-profile.');
  await new Promise(() => {});
}

async function candidateTitleTexts(page) {
  return page.locator('a, h1, h2, h3, [role="heading"], .title, [class*="title"]').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent ?? '').filter(Boolean),
  ).catch(() => []);
}

async function visibleTextContainsExactTitle(page, title) {
  const needle = normalizeTitle(title);
  const texts = await candidateTitleTexts(page);
  return texts.some((text) => normalizeTitle(text) === needle || normalizeTitle(text).includes(needle));
}

async function dashboardTitles(context, platform, options = {}) {
  let platformCache = DASHBOARD_TITLE_CACHE.get(context);
  if (!platformCache) {
    platformCache = new Map();
    DASHBOARD_TITLE_CACHE.set(context, platformCache);
  }
  if (platformCache.has(platform.id)) return platformCache.get(platform.id);

  const page = await context.newPage();
  try {
    await page.goto(platform.dashboardUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout ?? 45000 });
    await page.waitForTimeout(2500);
    const titles = new Set((await candidateTitleTexts(page)).map((text) => normalizeTitle(text)).filter(Boolean));
    platformCache.set(platform.id, { titles, url: page.url() });
    return platformCache.get(platform.id);
  } finally {
    await page.close().catch(() => {});
  }
}

export async function articleAlreadyExists(context, platform, article, options = {}) {
  const recorded = await findRecordedTitle(platform, article.title);
  if (recorded?.status === 'published' || (recorded?.status === 'duplicate' && recorded.duplicateCheck !== 'public-search')) {
    return { exists: true, reason: `state:${recorded.status}`, url: recorded.url };
  }

  if (options.skipRemoteDuplicateCheck) {
    return { exists: false };
  }

  if (platform.dashboardUrl) {
    const dashboard = await dashboardTitles(context, platform, options);
    if (dashboard.titles.has(normalizeTitle(article.title))) {
      await recordTitle(platform, article, {
        status: 'duplicate',
        url: dashboard.url,
        duplicateCheck: 'dashboard',
      });
      return { exists: true, reason: 'dashboard', url: dashboard.url };
    }
    return { exists: false };
  }

  const page = await context.newPage();
  try {
    await page.goto(platform.searchUrl(article.title), { waitUntil: 'domcontentloaded', timeout: options.timeout ?? 45000 });
    await page.waitForTimeout(2500);
    const exists = await visibleTextContainsExactTitle(page, article.title);
    if (exists) {
      await recordTitle(platform, article, {
        status: 'duplicate',
        url: page.url(),
        duplicateCheck: 'public-search',
      });
      return { exists: true, reason: 'public-search', url: page.url() };
    }
    return { exists: false };
  } finally {
    await page.close().catch(() => {});
  }
}

async function writeClipboard(page, text, html) {
  if (html) {
    try {
      await page.evaluate(async ({ text, html }) => {
        const item = new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        });
        await navigator.clipboard.write([item]);
      }, { text, html });
      return true;
    } catch {
      // Fall through to plain text clipboard.
    }
  }

  try {
    await page.evaluate(async (value) => navigator.clipboard.writeText(value), text);
    return true;
  } catch {
    return false;
  }
}

async function pasteIntoLocator(page, locator, value, html) {
  await locator.click({ timeout: 5000, force: true });
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  const selectedEditable = await locator.evaluate((node) => {
    if (!(node instanceof HTMLElement) || node.contentEditable !== 'true') return false;
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return true;
  }).catch(() => false);
  if (!selectedEditable) {
    await page.keyboard.press(`${mod}+A`).catch(() => {});
  }
  const clipboardOk = await writeClipboard(page, value, html);
  if (clipboardOk) {
    await page.keyboard.press(`${mod}+V`);
  } else {
    await page.keyboard.insertText(value);
  }
}

async function typeIntoLocator(page, locator, value) {
  await locator.click({ timeout: 5000, force: true });
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+A`).catch(() => {});
  await page.keyboard.insertText(value);
}

async function textInLocator(locator) {
  return locator.evaluate((node) => {
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) return node.value;
    return node.textContent ?? '';
  }).catch(() => '');
}

async function pageContainsProbe(page, probe) {
  if (!probe) return true;
  const bodyText = await page.locator('body').textContent().catch(() => '');
  if (bodyText.includes(probe)) return true;
  const activeText = await page.evaluate(() => {
    const node = document.activeElement;
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) return node.value;
    return node?.textContent ?? '';
  }).catch(() => '');
  return activeText.includes(probe);
}

function meaningfulProbe(value) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/[#>*_`[\](){}.,:;'"!?，。！？：；、“”‘’（）【】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

async function fillFirst(page, selectors, value, label, html, directTextInput = false, verify = true) {
  const probe = meaningfulProbe(value);
  let lastError = '';
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count().catch(() => 0);
    if (!count) continue;

    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
      if (directTextInput) {
        if (tagName === 'input' || tagName === 'textarea') {
          await locator.fill(value, { timeout: 15000 });
        } else {
          await typeIntoLocator(page, locator, value);
        }
      } else if ((tagName === 'input' || tagName === 'textarea') && !html) {
        await locator.fill(value, { timeout: 15000 });
      } else {
        await pasteIntoLocator(page, locator, value, html);
      }
      await page.waitForTimeout(800);
      if (verify && probe) {
        const actualText = await textInLocator(locator);
        if (!actualText.includes(probe) && !(await pageContainsProbe(page, probe))) {
          throw new Error(`filled ${label} selector "${selector}", but content did not appear`);
        }
      }
      return { selector };
    } catch (error) {
      lastError = `${selector}: ${error.message}`;
      // Try the next selector; editors change markup often.
    }
  }
  throw new Error(`Could not fill ${label}. Last error: ${lastError || 'no matching selector'}`);
}

async function fillMarkdownBody(page, selectors, markdown) {
  const probe = meaningfulProbe(markdown);
  let lastError = '';

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (!(await locator.count().catch(() => 0))) continue;

    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      await locator.fill(markdown, { timeout: 15000 });
    } catch (error) {
      lastError = `${selector}: ${error.message}`;
      continue;
    }

    await page.waitForTimeout(800);
    const actualText = await textInLocator(locator);
    if (probe && !actualText.includes(probe)) {
      throw new Error(`The ${labelForPlatform(page)} editor rejected the article body at selector "${selector}"`);
    }
    return { selector };
  }

  throw new Error(`Could not fill body editor. Last error: ${lastError || 'no visible editable field'}`);
}

function labelForPlatform(page) {
  try {
    return new URL(page.url()).hostname;
  } catch {
    return 'platform';
  }
}

async function fillJuejinArticle(page, platform, article) {
  const titleFill = await fillFirst(
    page,
    platform.titleSelectors,
    article.title,
    'title',
    undefined,
    platform.directTextInput,
    false,
  );

  const bodyFill = await fillMarkdownBody(page, platform.bodySelectors, article.markdown);

  return { titleFill, bodyFill };
}

async function fillCnblogsBody(page, platform, markdown) {
  const codeMirror = page.locator('.CodeMirror').first();
  if (await codeMirror.count().catch(() => 0)) {
    await codeMirror.waitFor({ state: 'visible', timeout: 10000 });
    const actualText = await codeMirror.evaluate((node, value) => {
      const editor = node.CodeMirror;
      if (!editor || typeof editor.setValue !== 'function') return null;
      editor.setValue(value);
      if (typeof editor.save === 'function') editor.save();
      if (typeof editor.refresh === 'function') editor.refresh();
      return typeof editor.getValue === 'function' ? editor.getValue() : null;
    }, markdown);

    const probe = meaningfulProbe(markdown);
    if (typeof actualText === 'string' && (!probe || actualText.includes(probe))) {
      return { selector: '.CodeMirror (CodeMirror.setValue)' };
    }
  }

  return fillMarkdownBody(page, platform.bodySelectors, markdown);
}

async function fillCnblogsArticle(page, platform, article) {
  const titleFill = await fillFirst(
    page,
    platform.titleSelectors,
    article.title,
    'title',
    undefined,
    false,
    false,
  );
  const bodyFill = await fillCnblogsBody(page, platform, article.markdown);
  return { titleFill, bodyFill };
}

async function clickPublish(page, platform) {
  for (const name of platform.publishButtonNames) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0)) {
      await button.click({ timeout: 10000 });
      return true;
    }
  }

  for (const name of platform.publishButtonNames) {
    const text = page.getByText(name).first();
    if (await text.count().catch(() => 0)) {
      await text.click({ timeout: 10000 });
      return true;
    }
  }

  return false;
}

async function clickPublishNames(page, names, timeout = 10000) {
  for (const name of names) {
    const button = page.getByRole('button', { name }).first();
    if (await button.count().catch(() => 0)) {
      await button.click({ timeout });
      return true;
    }
  }

  for (const name of names) {
    const text = page.getByText(name).first();
    if (await text.count().catch(() => 0)) {
      await text.click({ timeout });
      return true;
    }
  }

  return false;
}

function isAuthPage(page, platform) {
  const currentUrl = page.url();
  const loginUrl = platform.loginUrl ?? '';
  if (loginUrl && currentUrl.startsWith(loginUrl)) return true;
  return /\/(?:login|signin|passport|account)\b/i.test(currentUrl);
}

async function detectPublishBlocker(page) {
  const texts = await page.locator('body').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent ?? '').filter(Boolean),
  ).catch(() => []);
  const visibleText = texts.join('\n');
  const matched = PUBLISH_BLOCKER_PATTERNS.find((pattern) => pattern.test(visibleText));
  if (!matched) return null;

  if (/账户.*受.*限制|账号.*受.*限制|暂时无法发布|无法发布文章/.test(visibleText)) {
    return 'account-restricted';
  }
  if (/操作频繁/.test(visibleText)) {
    return 'rate-limited';
  }
  if (/验证码|captcha/i.test(visibleText)) {
    return 'captcha-required';
  }
  return 'publish-failed';
}

function normalizeDevtoTag(tag) {
  return tag
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function devtoTagList(tags = []) {
  return [...new Set(
    tags
      .flatMap((tag) => (Array.isArray(tag) ? tag : [tag]))
      .map((tag) => normalizeDevtoTag(tag))
      .filter(Boolean),
  )].slice(0, 4).join(', ');
}

export async function publishArticle(context, platform, article, options = {}) {
  const duplicate = await articleAlreadyExists(context, platform, article, options);
  if (duplicate.exists) {
    return { status: 'skipped', reason: `duplicate:${duplicate.reason}`, url: duplicate.url };
  }

  const page = await context.newPage();
  await page.goto(platform.newPostUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout ?? 60000 });
  await page.waitForTimeout(2500);

  if (isAuthPage(page, platform)) {
    return { status: 'blocked', reason: 'auth-required', url: page.url() };
  }

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

  let titleFill;
  let bodyFill;

  if (platform.id === 'juejin') {
    ({ titleFill, bodyFill } = await fillJuejinArticle(page, platform, article));
  } else if (platform.id === 'cnblogs') {
    ({ titleFill, bodyFill } = await fillCnblogsArticle(page, platform, article));
  } else {
    titleFill = await fillFirst(page, platform.titleSelectors, article.title, 'title');
  }

  if (platform.tagSelectors?.length) {
    const tagsValue = devtoTagList(article.tags);
    if (tagsValue) {
      try {
        await fillFirst(page, platform.tagSelectors, tagsValue, 'tags');
      } catch {
        // Tags are helpful but not always mandatory for every platform/editor variant.
      }
    }
  }
  if (!bodyFill) {
    if (platform.id === 'zhihu') {
      bodyFill = await fillFirst(
        page,
        platform.bodySelectors,
        article.html,
        'body editor',
        article.html,
        false,
        false,
      );
    } else {
      bodyFill = platform.pasteMode === 'markdown'
        ? await fillMarkdownBody(page, platform.bodySelectors, article.markdown)
        : await fillFirst(
          page,
          platform.bodySelectors,
          article.markdown,
          'body editor',
          article.html,
          false,
          false,
        );
    }
  }

  if (options.yes) {
    const clicked = await clickPublish(page, platform);
    if (!clicked) {
      return {
        status: 'prepared',
        reason: 'publish-button-not-found',
        titleSelector: titleFill.selector,
        bodySelector: bodyFill.selector,
        url: page.url(),
      };
    }
    if (platform.confirmPublishButtonNames?.length) {
      await page.waitForTimeout(1500);
      await clickPublishNames(page, platform.confirmPublishButtonNames, 10000).catch(() => {});
    }
    await page.waitForTimeout(4000);
    const blocker = await detectPublishBlocker(page);
    if (blocker) {
      return {
        status: 'blocked',
        reason: blocker,
        titleSelector: titleFill.selector,
        bodySelector: bodyFill.selector,
        url: page.url(),
      };
    }
    if (platform.successUrlPattern && !platform.successUrlPattern.test(page.url())) {
      return {
        status: 'blocked',
        reason: 'publish-incomplete',
        titleSelector: titleFill.selector,
        bodySelector: bodyFill.selector,
        url: page.url(),
      };
    }
    await recordTitle(platform, article, {
      status: 'published',
      url: page.url(),
      titleSelector: titleFill.selector,
      bodySelector: bodyFill.selector,
    });
    return { status: 'published', url: page.url() };
  }

  return {
    status: 'prepared',
    reason: 'manual-confirmation-required',
    titleSelector: titleFill.selector,
    bodySelector: bodyFill.selector,
    url: page.url(),
  };
}
