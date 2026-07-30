#!/usr/bin/env node
import { getPlatform, listPlatforms } from './platforms.mjs';
import {
  loadPostsForPlatform,
  prepareArticleForPlatform,
  shouldSkipForPlatform,
  validatePost,
  verifyRemoteAssets,
} from './content.mjs';
import { launchChrome, openLogin, publishArticle } from './browser.mjs';

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [rawKey, rawValue] = token.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (rawValue !== undefined) {
      args[key] = rawValue;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function usage() {
  console.log(`Usage:
  node scripts/crosspost/cli.mjs check [--platform zhihu] [--slug post-slug] [--site-url URL] [--image-base-url URL] [--allow-mojibake] [--verify-remote-assets]
  node scripts/crosspost/cli.mjs plan --platform juejin [--slug post-slug] [--site-url URL]
  node scripts/crosspost/cli.mjs login --platform zhihu
  node scripts/crosspost/cli.mjs publish --platform devto [--slug post-slug] [--site-url URL] [--image-base-url URL] [--limit 1] [--yes] [--skip-remote-duplicate-check]

Platforms: ${listPlatforms().map((platform) => platform.id).join(', ')}`);
}

function selectedPlatforms(args) {
  if (args.platform) return [getPlatform(args.platform)];
  return listPlatforms();
}

function filterBySlug(posts, slug) {
  return slug ? posts.filter((post) => post.slug === slug) : posts;
}

async function collect(platform, args) {
  const posts = await loadPostsForPlatform(platform, { includeDrafts: args.includeDrafts });
  return filterBySlug(posts, args.slug);
}

async function runCheck(args) {
  let total = 0;
  let failed = 0;

  for (const platform of selectedPlatforms(args)) {
    const posts = await collect(platform, args);
    console.log(`\n[${platform.id}] checking ${posts.length} candidate files`);

    for (const post of posts) {
      total += 1;
      const validation = await validatePost(post, platform, {
        allowMojibake: args.allowMojibake,
        requirePublishedAssets: true,
        siteUrl: args.siteUrl,
      });

      if (validation.skipped) {
        console.log(`- skip ${post.slug}: ${validation.skipReason}`);
        continue;
      }

      if (!validation.ok) {
        failed += 1;
        console.log(`- fail ${post.slug}`);
        validation.errors.forEach((error) => console.log(`  error: ${error}`));
      } else {
        console.log(`- ok   ${post.slug}`);
      }
      validation.warnings.forEach((warning) => console.log(`  warn: ${warning}`));

      if (validation.ok && args.verifyRemoteAssets) {
        const article = await prepareArticleForPlatform(post, platform, {
          siteUrl: args.siteUrl,
          imageBaseUrl: args.imageBaseUrl,
        });
        const remoteChecks = await verifyRemoteAssets(article.imageUrls);
        for (const check of remoteChecks) {
          if (!check.ok) {
            failed += 1;
            console.log(`  error: remote image failed ${check.status ?? check.error}: ${check.url}`);
          }
        }
      }
    }
  }

  console.log(`\nchecked=${total}, failed=${failed}`);
  if (failed) process.exitCode = 1;
}

async function runPlan(args) {
  if (!args.platform) throw new Error('plan requires --platform');
  const platform = getPlatform(args.platform);
  const posts = await collect(platform, args);
  const rows = [];

  for (const post of posts) {
    const validation = await validatePost(post, platform, {
      allowMojibake: args.allowMojibake,
      requirePublishedAssets: true,
      siteUrl: args.siteUrl,
    });
    const sourceSkip = shouldSkipForPlatform(post, platform);

    rows.push({
      slug: post.slug,
      title: post.frontmatter.title,
      status: validation.skipped
        ? `skip:${validation.skipReason}`
        : !validation.ok
          ? 'blocked:validation'
          : sourceSkip.skip
            ? `skip:${sourceSkip.reason}`
            : 'ready',
      errors: validation.errors.join('; '),
      warnings: validation.warnings.join('; '),
    });
  }

  console.table(rows);
}

async function runLogin(args) {
  if (!args.platform) throw new Error('login requires --platform');
  await openLogin(getPlatform(args.platform), { headless: false });
}

async function runPublish(args) {
  if (!args.platform) throw new Error('publish requires --platform');
  const platform = getPlatform(args.platform);
  const posts = await collect(platform, args);
  const context = await launchChrome({ headless: args.headless === true });
  const limit = args.limit ? Number(args.limit) : Number.POSITIVE_INFINITY;
  let publishedOrPrepared = 0;

  try {
    for (const post of posts) {
      if (publishedOrPrepared >= limit) break;

      const validation = await validatePost(post, platform, {
        allowMojibake: args.allowMojibake,
        requirePublishedAssets: true,
        siteUrl: args.siteUrl,
      });
      if (validation.skipped) {
        console.log(`[${platform.id}] skip ${post.slug}: ${validation.skipReason}`);
        continue;
      }
      if (!validation.ok) {
        console.log(`[${platform.id}] blocked ${post.slug}: ${validation.errors.join('; ')}`);
        continue;
      }

      const sourceSkip = shouldSkipForPlatform(post, platform);
      if (sourceSkip.skip) {
        console.log(`[${platform.id}] skip ${post.slug}: ${sourceSkip.reason}`);
        continue;
      }

      const article = await prepareArticleForPlatform(post, platform, {
        siteUrl: args.siteUrl,
        imageBaseUrl: args.imageBaseUrl,
      });
      const result = await publishArticle(context, platform, article, {
        yes: args.yes === true,
        skipRemoteDuplicateCheck: args.skipRemoteDuplicateCheck === true,
      });
      console.log(`[${platform.id}] ${post.slug}: ${result.status}${result.reason ? ` (${result.reason})` : ''} ${result.url ?? ''}`);
      if (result.status === 'published' || result.status === 'prepared') publishedOrPrepared += 1;
    }
  } finally {
    if (args.yes === true || args.headless === true) {
      await context.close().catch(() => {});
    } else {
      console.log('Chrome is left open for manual review. Stop the command with Ctrl+C after you finish.');
      await new Promise(() => {});
    }
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!command || command === 'help' || args.help) {
    usage();
    return;
  }

  if (command === 'check') return runCheck(args);
  if (command === 'plan') return runPlan(args);
  if (command === 'login') return runLogin(args);
  if (command === 'publish') return runPublish(args);

  usage();
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
