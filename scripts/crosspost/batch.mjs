#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { listPlatforms } from './platforms.mjs';

const DEFAULT_SITE_URL = 'https://fishered.github.io/Leo_Blog';

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
  node scripts/crosspost/batch.mjs plan [--platforms zhihu,juejin] [--slug post-slug] [--site-url URL]
  node scripts/crosspost/batch.mjs check [--platforms zhihu,juejin] [--slug post-slug] [--site-url URL] [--verify-remote-assets]
  node scripts/crosspost/batch.mjs publish --platforms zhihu [--slug post-slug] [--limit 3] [--site-url URL] [--yes]

Notes:
  - plan/check can run across multiple platforms.
  - publish is safest one platform at a time unless you pass --yes.`);
}

function selectedPlatforms(args) {
  const known = new Set(listPlatforms().map((platform) => platform.id));
  const ids = args.platforms
    ? args.platforms.split(',').map((id) => id.trim()).filter(Boolean)
    : [...known];

  for (const id of ids) {
    if (!known.has(id)) {
      throw new Error(`Unknown platform "${id}". Expected one of: ${[...known].join(', ')}`);
    }
  }
  return ids;
}

function cliArgsFor(command, platform, args) {
  const cliArgs = ['scripts/crosspost/cli.mjs', command, '--platform', platform];
  cliArgs.push('--site-url', args.siteUrl ?? DEFAULT_SITE_URL);

  if (args.slug) cliArgs.push('--slug', args.slug);
  if (args.limit) cliArgs.push('--limit', args.limit);
  if (args.imageBaseUrl) cliArgs.push('--image-base-url', args.imageBaseUrl);
  if (args.verifyRemoteAssets) cliArgs.push('--verify-remote-assets');
  if (args.allowMojibake) cliArgs.push('--allow-mojibake');
  if (args.skipRemoteDuplicateCheck) cliArgs.push('--skip-remote-duplicate-check');
  if (args.yes) cliArgs.push('--yes');

  return cliArgs;
}

async function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Command stopped by signal ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!command || command === 'help' || args.help) {
    usage();
    return;
  }

  if (!['plan', 'check', 'publish'].includes(command)) {
    usage();
    throw new Error(`Unknown command: ${command}`);
  }

  const platforms = selectedPlatforms(args);
  if (command === 'publish' && platforms.length > 1 && !args.yes) {
    throw new Error('For manual review, publish one platform at a time. Use --platforms zhihu, or pass --yes intentionally.');
  }

  let failed = 0;
  for (const platform of platforms) {
    console.log(`\n=== ${command}: ${platform} ===`);
    const code = await runNode(cliArgsFor(command, platform, args));
    if (code !== 0) failed += 1;
  }

  if (failed) {
    process.exitCode = 1;
    console.log(`\nFinished with ${failed} failed platform(s).`);
  } else {
    console.log('\nAll selected platforms finished successfully.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
