import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeTitle } from './content.mjs';

const STATE_DIR = path.resolve('.crosspost');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

export async function readState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return { platforms: {} };
  }
}

export async function writeState(state) {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export async function recordTitle(platform, article, payload) {
  const state = await readState();
  state.platforms[platform.id] ??= { titles: {} };
  state.platforms[platform.id].titles[normalizeTitle(article.title)] = {
    title: article.title,
    slug: article.slug,
    checkedAt: new Date().toISOString(),
    ...payload,
  };
  await writeState(state);
}

export async function findRecordedTitle(platform, title) {
  const state = await readState();
  return state.platforms[platform.id]?.titles?.[normalizeTitle(title)];
}
