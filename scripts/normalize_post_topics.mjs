import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('src/content/posts');

const titleTopicRules = [
  [/Elastic\s*Search|Lucence|Lucene/i, 'Search Engine'],
  [/Agent|AI|RAG|LangChain|LangGraph|大模型/i, 'AI & Agent'],
  [/rocket\s*mq|rocketmq/i, 'RocketMQ'],
  [/JVM|GC调优|内存模型/i, 'JVM'],
  [/AQS|LockSupport|volatile|CAS|原子类|线程|锁|并发|JMM/i, 'JUC'],
  [/JDK|List|Map/i, 'JDK'],
  [/MYSQL|MySQL|mysql/i, 'MySQL'],
  [/docker/i, 'Docker'],
  [/微服务/i, 'Microservices'],
  [/Firefly|调度|Scheduler/i, 'Scheduling'],
  [/Executor|Selector|数据库/i, 'Database'],
  [/Delay|延时队列|队列/i, 'Java'],
  [/Markdown|博客|写作/i, 'Blog'],
];

const tagTopicRules = [
  ['Elastic Search', 'Search Engine'],
  ['搜索引擎', 'Search Engine'],
  ['AI', 'AI & Agent'],
  ['Agent', 'AI & Agent'],
  ['RAG', 'AI & Agent'],
  ['LangChain', 'AI & Agent'],
  ['LangGraph', 'AI & Agent'],
  ['大模型', 'AI & Agent'],
  ['RocketMQ', 'RocketMQ'],
  ['消息队列', 'RocketMQ'],
  ['JUC', 'JUC'],
  ['并发编程', 'JUC'],
  ['Concurrent Programming', 'JUC'],
  ['JVM', 'JVM'],
  ['JDK', 'JDK'],
  ['MySQL', 'MySQL'],
  ['MYSQL', 'MySQL'],
  ['数据库', 'Database'],
  ['Databases', 'Database'],
  ['Docker', 'Docker'],
  ['微服务', 'Microservices'],
  ['Microservices', 'Microservices'],
  ['调度系统', 'Scheduling'],
  ['Scheduling', 'Scheduling'],
  ['分布式', 'Distributed Systems'],
  ['Distributed Systems', 'Distributed Systems'],
  ['Java', 'Java'],
  ['Markdown', 'Blog'],
  ['独立博客', 'Blog'],
  ['写作', 'Blog'],
  ['工作流', 'Blog'],
];

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error('Missing frontmatter');
  return {
    full: match[0],
    raw: match[1],
    body: markdown.slice(match[0].length),
  };
}

function valueOf(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  if (!match) return '';
  return match[1].trim().replace(/^"|"$/g, '');
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

function pickTopic(title, tags) {
  for (const [pattern, topic] of titleTopicRules) {
    if (pattern.test(title)) return topic;
  }

  for (const tag of tags) {
    const found = tagTopicRules.find(([candidate]) => candidate.toLowerCase() === tag.toLowerCase());
    if (found) return found[1];
  }

  return 'Engineering';
}

function replaceTags(frontmatter, topic) {
  const tagsBlock = `tags:\n  - "${topic}"`;
  if (/^tags:\s*\r?\n(?:\s+-\s+.*\r?\n?)*/m.test(frontmatter)) {
    return frontmatter.replace(/^tags:\s*\r?\n(?:\s+-\s+.*\r?\n?)*/m, `${tagsBlock}\n`);
  }
  return `${frontmatter.trimEnd()}\n${tagsBlock}`;
}

async function inferTopic(file) {
  const markdown = await readFile(file, 'utf8');
  const { raw } = parseFrontmatter(markdown);
  const title = valueOf(raw, 'title');
  const tags = listOf(raw, 'tags');
  return pickTopic(title, tags);
}

async function normalizeFile(file, topic) {
  const markdown = await readFile(file, 'utf8');
  const { raw, body } = parseFrontmatter(markdown);
  const nextFrontmatter = replaceTags(raw, topic);
  await writeFile(file, `---\n${nextFrontmatter.trimEnd()}\n---\n${body}`, 'utf8');
  return topic;
}

async function main() {
  const entries = await readdir(root, { withFileTypes: true });
  const counts = new Map();
  let files = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const postDir = path.join(root, entry.name);
    const sourceFile = path.join(postDir, 'index.md');
    let topic;
    try {
      topic = await inferTopic(sourceFile);
    } catch {
      continue;
    }

    for (const filename of ['index.md', 'en.md']) {
      const file = path.join(postDir, filename);
      try {
        await normalizeFile(file, topic);
        counts.set(topic, (counts.get(topic) ?? 0) + 1);
        files += 1;
      } catch {
        // Skip missing files.
      }
    }
  }

  console.log(`Normalized ${files} Markdown files.`);
  for (const [topic, count] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en'))) {
    console.log(`${topic}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
