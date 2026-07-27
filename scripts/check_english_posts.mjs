import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src/content/posts');

const forbiddenPatterns = [
  { name: 'Chinese or full-width CJK text', pattern: /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/ },
  { name: 'replacement character', pattern: /\ufffd/ },
  { name: 'old localization note', pattern: /Localization Note|Original Technical Body|safe migration|A polished English field note/i },
  { name: 'Chinese migration wording', pattern: /安全迁移|中文正文|英文导读/ },
  { name: 'broken mojibake marker', pattern: /锛|鈥|銆|绋|绾|涓|闆|寤|鍐|骞|鍏|鐨|鏄|妯|瀹/ },
];

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return undefined;
  return match[1];
}

function valueOf(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match?.[1]?.trim().replace(/^"|"$/g, '');
}

function listOf(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*\\r?\\n((?:\\s+-\\s+.*\\r?\\n?)*)`, 'm'));
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-\s+/, '').replace(/^"|"$/g, ''));
}

function hasRequiredSections(markdown) {
  const required = [
    '## Intended Reader',
    '## Why This Matters',
    '## Mental Model',
    '## Implementation Walkthrough',
    '## Pitfalls and Tradeoffs',
    '## Verification Checklist',
  ];
  return required.filter((section) => !markdown.includes(section));
}

const errors = [];
let checked = 0;

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = path.join(root, entry.name, 'en.md');
  let markdown;
  try {
    markdown = await readFile(file, 'utf8');
  } catch {
    continue;
  }

  checked += 1;
  const frontmatter = parseFrontmatter(markdown);
  if (!frontmatter) {
    errors.push(`${file}: missing frontmatter`);
    continue;
  }

  const title = valueOf(frontmatter, 'title');
  const lang = valueOf(frontmatter, 'lang');
  const tags = listOf(frontmatter, 'tags');

  if (!title || title.length < 8) errors.push(`${file}: title is missing or too short`);
  if (lang !== 'en') errors.push(`${file}: lang must be en`);
  if (tags.length !== 1) errors.push(`${file}: expected exactly one topic tag, found ${tags.length}`);
  if (tags.some((tag) => forbiddenPatterns[0].pattern.test(tag))) {
    errors.push(`${file}: topic tag contains CJK text`);
  }

  for (const check of forbiddenPatterns) {
    if (check.pattern.test(markdown)) {
      errors.push(`${file}: contains ${check.name}`);
    }
  }

  const missingSections = hasRequiredSections(markdown);
  if (missingSections.length) {
    errors.push(`${file}: missing required sections: ${missingSections.join(', ')}`);
  }

  const wordCount = markdown
    .replace(/^---[\s\S]*?---/, '')
    .split(/\s+/)
    .filter(Boolean)
    .length;
  if (wordCount < 280) {
    errors.push(`${file}: English body is too thin (${wordCount} words)`);
  }
}

if (errors.length) {
  console.error(`English post check failed. checked=${checked}, errors=${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`English post check passed. checked=${checked}`);
}
