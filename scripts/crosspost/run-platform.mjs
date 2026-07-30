#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { getPlatform, listPlatforms } from './platforms.mjs';

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
  node scripts/crosspost/run-platform.mjs zhihu [--review] [--slug post-slug] [--limit 5]
  node scripts/crosspost/run-platform.mjs juejin [--skip-build] [--skip-check]

Platforms: ${listPlatforms().map((platform) => platform.id).join(', ')}

Default behavior:
  1. npm run build
  2. plan selected platform
  3. check selected platform
  4. publish all ready posts with --yes

Use --verify-remote-assets for strict remote image verification.
Use --review to fill editor pages without clicking the final publish button.`);
}

function nodeCliArgs(command, platformId, args) {
  const cliArgs = ['scripts/crosspost/cli.mjs', command, '--platform', platformId];
  cliArgs.push('--site-url', args.siteUrl ?? DEFAULT_SITE_URL);

  if (args.slug) cliArgs.push('--slug', args.slug);
  if (args.limit) cliArgs.push('--limit', args.limit);
  if (args.imageBaseUrl) cliArgs.push('--image-base-url', args.imageBaseUrl);
  if (args.allowMojibake) cliArgs.push('--allow-mojibake');
  if (args.skipRemoteDuplicateCheck) cliArgs.push('--skip-remote-duplicate-check');
  if (command === 'check' && args.verifyRemoteAssets) cliArgs.push('--verify-remote-assets');
  if (command === 'publish' && !args.review) cliArgs.push('--yes');

  return cliArgs;
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

async function run(command, args, options = {}) {
  const displayCommand = [command, ...args].join(' ');
  console.log(`\n> ${displayCommand}`);
  return new Promise((resolve, reject) => {
    const needsWindowsShell = process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command);
    const executable = needsWindowsShell ? 'cmd.exe' : command;
    const executableArgs = needsWindowsShell ? ['/d', '/s', '/c', command, ...args] : args;
    const child = spawn(executable, executableArgs, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: options.shell ?? false,
      ...options,
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

async function runRequired(command, args, options) {
  const code = await run(command, args, options);
  if (code !== 0) {
    throw new Error(`Command failed with exit code ${code}: ${[command, ...args].join(' ')}`);
  }
}

async function main() {
  const [platformId, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (!platformId || platformId === 'help' || args.help) {
    usage();
    return;
  }

  const platform = getPlatform(platformId);
  console.log(`Preparing crosspost pipeline for ${platform.name}.`);
  console.log(args.review ? 'Mode: review only, final publish button will not be clicked.' : 'Mode: auto publish, final publish button will be clicked when available.');

  if (!args.skipBuild) {
    await runRequired(npmCommand(), ['run', 'build']);
  }

  await runRequired(process.execPath, nodeCliArgs('plan', platform.id, args));

  if (!args.skipCheck) {
    await runRequired(process.execPath, nodeCliArgs('check', platform.id, args));
  }

  await runRequired(process.execPath, nodeCliArgs('publish', platform.id, args));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
