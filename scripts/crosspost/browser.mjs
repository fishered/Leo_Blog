import { existsSync } from 'node:fs';
import path from 'node:path';
import { findRecordedTitle, recordTitle } from './state.mjs';
import { normalizeTitle } from './content.mjs';

const PROFILE_DIR = path.resolve('.crosspost/chrome-profile');

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

async function visibleTextContainsExactTitle(page, title) {
  const needle = normalizeTitle(title);
  const texts = await page.locator('a, h1, h2, h3, [role="heading"], .title, [class*="title"]').evaluateAll((nodes) =>
    nodes.map((node) => node.textContent ?? '').filter(Boolean),
  ).catch(() => []);
  return texts.some((text) => normalizeTitle(text) === needle || normalizeTitle(text).includes(needle));
}

export async function articleAlreadyExists(context, platform, article, options = {}) {
  const recorded = await findRecordedTitle(platform, article.title);
  if (recorded?.status === 'published' || recorded?.status === 'duplicate') {
    return { exists: true, reason: `state:${recorded.status}`, url: recorded.url };
  }

  if (options.skipRemoteDuplicateCheck) {
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
  await locator.click({ timeout: 5000 });
  const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${mod}+A`).catch(() => {});
  const clipboardOk = await writeClipboard(page, value, html);
  if (clipboardOk) {
    await page.keyboard.press(`${mod}+V`);
  } else {
    await page.keyboard.insertText(value);
  }
}

async function fillFirst(page, selectors, value, label, html) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count().catch(() => 0);
    if (!count) continue;

    try {
      await locator.waitFor({ state: 'visible', timeout: 5000 });
      const tagName = await locator.evaluate((node) => node.tagName.toLowerCase()).catch(() => '');
      if ((tagName === 'input' || tagName === 'textarea') && !html) {
        await locator.fill(value, { timeout: 15000 });
      } else {
        await pasteIntoLocator(page, locator, value, html);
      }
      return { selector };
    } catch {
      // Try the next selector; editors change markup often.
    }
  }
  throw new Error(`Could not find a visible ${label} field. Update selectors for this platform.`);
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

export async function publishArticle(context, platform, article, options = {}) {
  const duplicate = await articleAlreadyExists(context, platform, article, options);
  if (duplicate.exists) {
    return { status: 'skipped', reason: `duplicate:${duplicate.reason}`, url: duplicate.url };
  }

  const page = await context.newPage();
  await page.goto(platform.newPostUrl, { waitUntil: 'domcontentloaded', timeout: options.timeout ?? 60000 });
  await page.waitForTimeout(2500);

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

  const titleFill = await fillFirst(page, platform.titleSelectors, article.title, 'title');
  const bodyFill = platform.id === 'zhihu'
    ? await fillFirst(page, platform.bodySelectors, article.html, 'body editor', article.html)
    : await fillFirst(page, platform.bodySelectors, article.markdown, 'body editor', platform.pasteMode === 'html' ? article.html : undefined);

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
    await page.waitForTimeout(4000);
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
