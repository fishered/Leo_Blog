import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { englishArticleProfiles } from './english_article_profiles.mjs';

const root = path.resolve('src/content/posts');

const titleMap = new Map(Object.entries({
  '为什么我要重新建立一个独立博客': 'Why I Rebuilt an Independent Blog',
  '这套博客的 Markdown 写作约定': 'Markdown Writing Conventions for This Blog',
  'Elastic Search初步架构与Lucence（一）': 'Elasticsearch Architecture and Lucene Basics (Part 1)',
  'Elastic Search Cluster搭建及可视化（二）': 'Building and Visualizing an Elasticsearch Cluster (Part 2)',
  'Elastic Search Node加载流程（三）': 'Elasticsearch Node Startup Flow (Part 3)',
  'Elastic Search 注册通信核心流程（四）': 'Core Registration and Communication Flow in Elasticsearch (Part 4)',
  '数据库Executor-Selector排查实践': 'Debugging a Database Executor-Selector Issue',
  'AI毁掉的技术团队': 'When AI Damages an Engineering Team',
  '（AI）AI模型是如何工作的': 'How AI Models Work',
  'Agent的概念原理与构建模式': 'Agent Concepts, Principles, and Construction Patterns',
  'AI_Agent搭建实操指南': 'A Practical Guide to Building an AI Agent',
  'RAG工作机制详解': 'How RAG Works: A Detailed Walkthrough',
  '为什么要放弃LangChain': 'Why Consider Moving Away from LangChain',
  'LangChain核心组件全解析': 'A Complete Guide to LangChain Core Components',
  'LangChain Agent、Tools 与 Memory': 'LangChain Agents, Tools, and Memory',
  'LangGraph：把 Agent 从“会回答”推进到“可控执行”的工程架构': 'LangGraph: Moving Agents from Answering to Controlled Execution',
  'Firefly：为 Java 业务系统打造轻量级分布式调度中心': 'Firefly: A Lightweight Distributed Scheduler for Java Business Systems',
  '记录Delay延时队列的使用': 'Notes on Using Delay Queues',
  'MYSQL大数据量查询优化--索引': 'Optimizing Large MySQL Queries with Indexes',
  '基于docker的mysql集群搭建': 'Building a MySQL Cluster with Docker',
  '神奇的volatile': 'The Subtleties of volatile',
  '【rocketMq】基础架构篇': 'RocketMQ Architecture Basics',
  '【rocketMq】如何保证消息零丢失': 'RocketMQ: How to Prevent Message Loss',
  '【rocketMq】如何保证消息不重复消费': 'RocketMQ: How to Avoid Duplicate Consumption',
  '【rocketMq】如何保证消息顺序消费': 'RocketMQ: How to Preserve Message Ordering',
  '【rocketMq】如何处理积压消息': 'RocketMQ: How to Handle Message Backlog',
  '【rocketMq】rocket的持久化': 'RocketMQ Persistence Internals',
  '【rocketMq】producer源码分析': 'RocketMQ Producer Source Code Analysis',
  '【juc】关于aqs模型': 'JUC: Understanding the AQS Model',
  '【juc】关于LockSupport': 'JUC: Understanding LockSupport',
  '【jdk】关于List': 'JDK: Understanding List',
  '【jvm】关于jvm内存模型及GC调优': 'JVM Memory Model and GC Tuning',
  '聊聊微服务拆分设计': 'A Practical Discussion on Microservice Decomposition',
  '【JDK】关于Map': 'JDK: Understanding Map',
  '【并发编程】前言': 'Concurrent Programming: Preface',
  '线程的本质': 'The Nature of Threads',
  '锁与并发': 'Locks and Concurrency',
  '【juc】原子类和CAS原理': 'JUC: Atomic Classes and CAS Principles',
  '大名鼎鼎的JMM模型': 'The Well-Known Java Memory Model',
  'AQS原理刨析': 'Dissecting the Principles of AQS',
}));

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
  ['JVM', 'JVM'],
  ['JDK', 'JDK'],
  ['MySQL', 'MySQL'],
  ['MYSQL', 'MySQL'],
  ['数据库', 'Database'],
  ['Docker', 'Docker'],
  ['微服务', 'Microservices'],
  ['调度系统', 'Scheduling'],
  ['分布式', 'Distributed Systems'],
  ['Java', 'Java'],
  ['Markdown', 'Blog'],
  ['独立博客', 'Blog'],
  ['写作', 'Blog'],
  ['工作流', 'Blog'],
];

const platformMap = new Map(Object.entries({
  '知乎': 'Zhihu',
}));

const seriesMap = new Map(Object.entries({
  '建站手记': 'Site Notes',
}));

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error('Missing frontmatter');
  return {
    raw: match[1],
    body: markdown.slice(match[0].length).trimStart(),
  };
}

function valueOf(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  if (!match) return undefined;
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

function blockValue(frontmatter, block, key) {
  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${block}:`);
  if (start < 0) return undefined;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('  ')) break;
    const match = line.match(new RegExp(`^\\s+${key}:\\s*(.*)$`));
    if (match) return match[1].trim().replace(/^"|"$/g, '');
  }
  return undefined;
}

function quote(value) {
  return JSON.stringify(value ?? '');
}

function describe(title, tags) {
  const topic = tags[0] || 'software engineering';
  return `A practical English edition of "${title}", focused on ${topic}, source-backed implementation evidence, and the engineering decisions behind the original note.`;
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

const topicProfiles = {
  'AI & Agent': {
    context: 'Agent-oriented AI systems are not only about calling a model. They also involve context management, tool boundaries, retrieval quality, memory, execution control, and failure recovery.',
    core: 'Treat the model as one component in an execution system. The valuable engineering work is deciding what the model may do, what evidence it can use, how state is carried forward, and how the workflow can be inspected or rolled back.',
    takeaways: [
      'Separate model reasoning, tool execution, retrieval, memory, and orchestration instead of mixing everything into a single prompt.',
      'Use RAG or memory only when it improves the task boundary; more context is not automatically better context.',
      'Prefer explicit workflows for production agents, especially when tools mutate state or depend on external systems.',
      'Evaluate the system by observing failures: hallucinated tool calls, stale context, ambiguous state, and missing fallback paths.',
    ],
    checklist: [
      'Define what the agent is allowed to read, decide, and execute.',
      'Keep tool inputs and outputs inspectable.',
      'Add retries, timeouts, and human handoff for high-risk actions.',
      'Measure answer quality with real tasks, not only demo prompts.',
    ],
  },
  JUC: {
    context: 'Java concurrency is where language semantics, JVM memory visibility, OS scheduling, and data-structure design meet. Small misunderstandings often become production-only bugs.',
    core: 'Think in terms of state ownership, visibility, ordering, blocking, and wake-up semantics. APIs such as AQS, CAS, LockSupport, volatile, and ThreadLocal are tools for shaping those guarantees.',
    takeaways: [
      'Distinguish atomicity, visibility, and ordering; they solve different classes of concurrency bugs.',
      'Do not treat locks as a single concept. Lock acquisition, queueing, parking, interruption, and fairness all affect behavior.',
      'Use low-level primitives only when the higher-level abstraction cannot express the requirement clearly.',
      'Concurrency bugs need evidence: thread dumps, state transitions, queue length, contention, and timeout signals.',
    ],
    checklist: [
      'Identify which thread owns each mutable state transition.',
      'Document the happens-before relationship you rely on.',
      'Prefer existing JUC abstractions before building your own synchronizer.',
      'Test cancellation, interruption, timeout, and retry paths.',
    ],
  },
  RocketMQ: {
    context: 'Message queues decouple producers and consumers, but they also introduce delivery semantics, ordering constraints, persistence tradeoffs, and operational recovery work.',
    core: 'A reliable RocketMQ design starts from the desired message semantics: loss prevention, duplicate handling, ordering, backlog recovery, and broker durability.',
    takeaways: [
      'Message loss, duplication, and disorder are separate problems; each needs a different design response.',
      'Exactly-once is usually achieved at the business layer through idempotency and state checks, not by the queue alone.',
      'Ordering requires narrowing concurrency and queue assignment; it should be used only where business semantics require it.',
      'Backlog handling depends on consumer capacity, retry strategy, dead-letter queues, and visibility into lag.',
    ],
    checklist: [
      'Define producer send confirmation and retry behavior.',
      'Make consumers idempotent before scaling them horizontally.',
      'Monitor lag, retry counts, dead-letter messages, and broker health.',
      'Choose ordering scope carefully: global ordering is expensive.',
    ],
  },
  'Search Engine': {
    context: 'Search engine systems combine indexing, storage, distributed coordination, query execution, and scoring. Elasticsearch is a practical way to study those layers through a real system.',
    core: 'Understand the path from document ingestion to Lucene segments, then from cluster/node startup to query routing and result collection.',
    takeaways: [
      'Lucene provides the core index mechanics; Elasticsearch adds distributed coordination, APIs, and operational tooling.',
      'Cluster behavior depends on node discovery, shard allocation, replica strategy, and failure recovery.',
      'Index design should follow query patterns, update frequency, and storage cost rather than default settings.',
      'Visualization tools help, but they should be paired with an understanding of the underlying shard and node model.',
    ],
    checklist: [
      'Design mappings before loading large data volumes.',
      'Validate shard count, replica count, and refresh behavior against workload needs.',
      'Observe cluster health, allocation decisions, and slow queries.',
      'Treat search relevance and operational stability as separate feedback loops.',
    ],
  },
  MySQL: {
    context: 'MySQL performance and deployment work is usually about data shape, access paths, indexes, transactions, and operational topology.',
    core: 'The key is to understand how the database chooses an execution path and how deployment choices change availability, maintenance, and failure recovery.',
    takeaways: [
      'Index design should start from predicates, sorting, cardinality, and result size.',
      'Large queries need execution-plan evidence, not guesswork.',
      'Docker-based clusters are useful for learning and local verification, but production topology requires stricter durability and backup planning.',
      'Optimization should preserve correctness first, then reduce latency and resource cost.',
    ],
    checklist: [
      'Inspect execution plans before and after changing indexes.',
      'Avoid adding indexes without considering write cost.',
      'Validate backup, restore, and failover behavior.',
      'Record dataset size, query shape, and latency baseline.',
    ],
  },
  JDK: {
    context: 'JDK collection types look simple at the API level, but their behavior depends on data structures, resizing, iteration, hashing, and concurrency assumptions.',
    core: 'Choose collections by access pattern and mutation pattern, not by habit.',
    takeaways: [
      'List and Map implementations optimize different operations; the wrong choice can quietly become a performance bottleneck.',
      'Hashing, resizing, ordering, and null handling are part of the practical contract.',
      'Collections are not automatically thread-safe; concurrency needs an explicit design.',
      'Reading the JDK source helps connect API behavior with memory and performance costs.',
    ],
    checklist: [
      'Match the collection to read/write frequency and ordering needs.',
      'Consider resizing and memory overhead for large collections.',
      'Avoid sharing mutable collections across threads without protection.',
      'Benchmark representative workloads before replacing core data structures.',
    ],
  },
  JVM: {
    context: 'JVM behavior is shaped by memory layout, object allocation, garbage collection, class loading, and runtime optimization.',
    core: 'A useful JVM mental model connects symptoms such as latency spikes, high allocation rate, or memory pressure to observable runtime signals.',
    takeaways: [
      'GC tuning starts with allocation behavior and service-level goals, not with random flag changes.',
      'Memory visibility and object lifetime matter when debugging performance or correctness issues.',
      'JVM diagnostics should combine logs, metrics, heap/thread evidence, and workload context.',
      'A tuning change is only useful if it can be tied to a measured improvement.',
    ],
    checklist: [
      'Record heap usage, allocation rate, pause time, and throughput.',
      'Compare GC logs before and after tuning.',
      'Keep JVM flags documented with the reason for each setting.',
      'Validate changes under production-like workload.',
    ],
  },
  Database: {
    context: 'Database debugging often involves more than SQL. Executors, selectors, connection management, and distributed runtime behavior can all affect what users see.',
    core: 'Work from observable symptoms back to the execution path, then isolate whether the problem belongs to query planning, runtime dispatch, connection state, or infrastructure.',
    takeaways: [
      'Start with concrete evidence: logs, metrics, query shape, connection state, and reproduction steps.',
      'Executor and selector issues often show up as latency, starvation, or uneven resource use.',
      'A fix should be validated against both correctness and operational stability.',
      'Keep the investigation trail clear enough for future incidents.',
    ],
    checklist: [
      'Capture the failing path and the healthy path.',
      'Compare timing, resource usage, and state transitions.',
      'Avoid changing multiple variables at once.',
      'Write down the final root cause and rollback strategy.',
    ],
  },
  Microservices: {
    context: 'Microservice decomposition is a design decision about ownership, data boundaries, deployment independence, and operational cost.',
    core: 'Split services only when the boundary makes ownership and change safer. A split that only moves code into another repository can make the system harder to operate.',
    takeaways: [
      'A good service boundary follows business capability and data ownership.',
      'Distributed transactions, observability, and deployment coordination become more important after a split.',
      'Team structure and runtime ownership matter as much as code structure.',
      'Start with modularity before forcing every module into a network boundary.',
    ],
    checklist: [
      'Define ownership before defining repositories.',
      'Make data boundaries explicit.',
      'Plan observability, rollback, and compatibility.',
      'Measure whether the split reduces or increases delivery friction.',
    ],
  },
  Scheduling: {
    context: 'Scheduling systems turn time-based business intent into reliable execution. Real systems need visibility, retry behavior, ownership, and cross-time-zone correctness.',
    core: 'A scheduler should make task definitions, executor registration, dispatch, persistence, failure handling, and observability explicit.',
    takeaways: [
      'Cron syntax is only the beginning; execution ownership and failure semantics are the hard parts.',
      'Distributed schedulers need fencing, idempotency, and clear executor state.',
      'Time zone handling should be a task-level decision, not an accidental machine default.',
      'Operational visibility is part of the product, not an afterthought.',
    ],
    checklist: [
      'Define retry, timeout, and missed-run behavior.',
      'Track task lifecycle and executor heartbeat.',
      'Store execution history for debugging.',
      'Validate cross-time-zone schedules explicitly.',
    ],
  },
  Java: {
    context: 'Java engineering notes often sit between language features, runtime behavior, and practical service implementation.',
    core: 'The goal is to connect the API-level usage with the runtime behavior and the production tradeoff behind it.',
    takeaways: [
      'Understand the abstraction before relying on it in a critical path.',
      'Prefer simple, observable designs unless the problem clearly requires more machinery.',
      'Keep examples close to real service constraints.',
      'Document edge cases, not only the happy path.',
    ],
    checklist: [
      'Clarify the API contract and failure behavior.',
      'Test with representative data and concurrency.',
      'Add logs or metrics around important transitions.',
      'Keep the implementation easy to revisit later.',
    ],
  },
  Blog: {
    context: 'A personal technical blog is also an engineering system: content format, asset ownership, routing, search, and migration all affect whether knowledge can survive platform changes.',
    core: 'Markdown-first publishing keeps content portable while still allowing a polished reading experience on GitHub Pages.',
    takeaways: [
      'Keep source Markdown readable without depending on one platform.',
      'Store images locally so posts remain stable after migration.',
      'Use clear frontmatter for title, date, topic, language, and source.',
      'Treat the blog as a long-term knowledge base, not only a visual site.',
    ],
    checklist: [
      'Keep one canonical Markdown file per language.',
      'Verify image paths during migration.',
      'Build locally before publishing.',
      'Keep routing stable for old links when possible.',
    ],
  },
  Engineering: {
    context: 'This note captures a practical engineering problem and the reasoning around it.',
    core: 'The useful part is not only the final answer, but the path from symptom to model, then from model to implementation choice.',
    takeaways: [
      'Make the problem boundary explicit.',
      'Keep evidence close to the conclusion.',
      'Prefer operationally simple designs.',
      'Record tradeoffs so future readers can evaluate the decision.',
    ],
    checklist: [
      'Define the problem and assumptions.',
      'Collect evidence before changing behavior.',
      'Validate the result with a reproducible check.',
      'Document follow-up risks.',
    ],
  },
};

const unsafeEnglishPattern = /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]|�|锛|鈥|銆|绋|绾|涓|闆|寤|鍐|骞|鍏|鐨|鏄|妯|瀹|忚|噺|跺|彂|湪|鍒|殑|犵|攱/;

const headingReplacements = [
  [/什么是/g, 'What is'],
  [/为什么/g, 'Why'],
  [/如何/g, 'How to'],
  [/怎么/g, 'How to'],
  [/关于/g, 'Understanding'],
  [/前言/g, 'Preface'],
  [/目录/g, 'Table of contents'],
  [/背景/g, 'Background'],
  [/生态/g, 'Ecosystem'],
  [/架构/g, 'Architecture'],
  [/基础/g, 'Basics'],
  [/核心/g, 'Core'],
  [/原理/g, 'Principles'],
  [/模型/g, 'Model'],
  [/流程/g, 'Flow'],
  [/源码/g, 'Source code'],
  [/解析/g, 'Analysis'],
  [/实现/g, 'Implementation'],
  [/实践/g, 'Practice'],
  [/实操/g, 'Hands-on guide'],
  [/指南/g, 'Guide'],
  [/搭建/g, 'Build'],
  [/使用/g, 'Usage'],
  [/创建/g, 'Creation'],
  [/启动/g, 'Startup'],
  [/加载/g, 'Loading'],
  [/注册/g, 'Registration'],
  [/通信/g, 'Communication'],
  [/请求/g, 'Request'],
  [/控制器/g, 'Controller'],
  [/生命周期/g, 'Lifecycle'],
  [/节点/g, 'Node'],
  [/集群/g, 'Cluster'],
  [/可视化/g, 'Visualization'],
  [/索引/g, 'Indexing'],
  [/执行计划/g, 'Execution plan'],
  [/数据/g, 'Data'],
  [/指标/g, 'Metrics'],
  [/查询/g, 'Query'],
  [/优化/g, 'Optimization'],
  [/主从复制/g, 'Primary-replica replication'],
  [/复制/g, 'Replication'],
  [/准备工作/g, 'Preparation'],
  [/思考/g, 'Reflection'],
  [/消息/g, 'Message'],
  [/丢失/g, 'Loss'],
  [/重复消费/g, 'Duplicate consumption'],
  [/顺序消费/g, 'Ordered consumption'],
  [/积压/g, 'Backlog'],
  [/持久化/g, 'Persistence'],
  [/生产者/g, 'Producer'],
  [/消费者/g, 'Consumer'],
  [/事务/g, 'Transaction'],
  [/延时队列/g, 'Delay queue'],
  [/线程安全/g, 'Thread safety'],
  [/线程/g, 'Thread'],
  [/锁/g, 'Lock'],
  [/并发/g, 'Concurrency'],
  [/原子类/g, 'Atomic classes'],
  [/原子性/g, 'Atomicity'],
  [/可见性/g, 'Visibility'],
  [/有序性/g, 'Ordering'],
  [/弱引用/g, 'Weak references'],
  [/内存/g, 'Memory'],
  [/调优/g, 'Tuning'],
  [/微服务/g, 'Microservices'],
  [/拆分/g, 'Decomposition'],
  [/设计/g, 'Design'],
  [/问题/g, 'Problems'],
  [/好处/g, 'Benefits'],
  [/解决/g, 'Solve'],
  [/文档解析/g, 'Document parsing'],
  [/分块/g, 'Chunking'],
  [/向量化/g, 'Embedding'],
  [/检索/g, 'Retrieval'],
  [/排序/g, 'Ranking'],
  [/工作机制/g, 'Mechanism'],
  [/工作循环/g, 'Work loop'],
  [/构建模式/g, 'Construction patterns'],
  [/企业/g, 'Enterprise'],
  [/定位/g, 'Positioning'],
  [/工程规范/g, 'Engineering standards'],
  [/回答/g, 'Answering'],
  [/可控执行/g, 'Controlled execution'],
  [/调度/g, 'Scheduling'],
  [/任务/g, 'Tasks'],
  [/边界/g, 'Boundaries'],
  [/注解/g, 'Annotations'],
  [/自动/g, 'Automatic'],
  [/博客/g, 'Blog'],
  [/写作/g, 'Writing'],
  [/迁移/g, 'Migration'],
  [/独立/g, 'Independent'],
];

const technicalTerms = [
  'LangGraph',
  'LangChain',
  'RAG',
  'ReAct',
  'Agent',
  'Tools',
  'Memory',
  'LLM',
  'AQS',
  'CAS',
  'LockSupport',
  'ThreadLocal',
  'volatile',
  'JMM',
  'JUC',
  'JVM',
  'GC',
  'RocketMQ',
  'NameServer',
  'Broker',
  'Producer',
  'Consumer',
  'CommitLog',
  'ConsumeQueue',
  'IndexFile',
  'Elasticsearch',
  'Elastic Search',
  'Lucene',
  'Netty',
  'Kibana',
  'MySQL',
  'binlog',
  'Docker',
  'HashMap',
  'ArrayList',
  'LinkedList',
  'CopyOnWriteArrayList',
  'DelayQueue',
  'Spring Boot',
  'Firefly',
  'cron',
  'API',
  'SQL',
];

function hasUnsafeEnglishText(text) {
  return unsafeEnglishPattern.test(text);
}

function normalizeFenceLanguage(language, code = '') {
  const lang = (language || 'text').toLowerCase();
  if (lang === 'mysql') return 'sql';
  if (lang === 'powershell' && /\b(select|show|create|grant|flush|change\s+master|start\s+slave)\b/i.test(code)) {
    return 'sql';
  }
  return lang || 'text';
}

function stripMarkdownMarkup(text) {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/^\s*\d+(?:\.\d+)*[.)、]?\s*/, '')
    .trim();
}

function englishizeHeading(text) {
  let value = stripMarkdownMarkup(text)
    .replace(/[【】]/g, '')
    .replace(/[（）]/g, ' ')
    .replace(/[：，、。；？]/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/——/g, ' - ');

  for (const [pattern, replacement] of headingReplacements) {
    value = value.replace(pattern, ` ${replacement} `);
  }

  value = value
    .replace(/[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;)])/g, '$1')
    .replace(/([(])\s+/g, '$1')
    .trim();

  if (!value || value.length < 3 || hasUnsafeEnglishText(value)) return undefined;
  return value;
}

function extractHeadings(body) {
  const seen = new Set();
  const headings = [];
  for (const match of body.matchAll(/^#{2,4}\s+(.+)$/gm)) {
    const heading = englishizeHeading(match[1]);
    if (!heading || /^table of contents$/i.test(heading) || seen.has(heading.toLowerCase())) continue;
    seen.add(heading.toLowerCase());
    headings.push(heading);
    if (headings.length >= 8) break;
  }
  return headings;
}

function extractTerms(text) {
  const found = [];
  for (const term of technicalTerms) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_]|$)`, 'i');
    if (pattern.test(text) && !found.some((item) => item.toLowerCase() === term.toLowerCase())) {
      found.push(term);
    }
  }
  return found.slice(0, 10);
}

function localizeTitle(zhTitle, fallbackSlug) {
  const mapped = titleMap.get(zhTitle);
  if (mapped && !hasUnsafeEnglishText(mapped)) return mapped;

  const translated = englishizeHeading(zhTitle);
  if (translated && !hasUnsafeEnglishText(translated)) return translated;

  return `Engineering Note: ${fallbackSlug.replace(/^zhihu-/, '').replace(/-/g, ' ')}`;
}

function extractImages(body) {
  const seen = new Set();
  const images = [];
  for (const match of body.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
    const url = match[1].trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push(url);
  }
  return images.slice(0, 8);
}

function extractCodeBlocks(body) {
  const snippets = [];
  for (const match of body.matchAll(/```([A-Za-z0-9_-]*)\r?\n([\s\S]*?)```/g)) {
    const code = match[2]
      .replace(/\u3000/g, ' ')
      .trim();
    const language = normalizeFenceLanguage(match[1], code);
    if (!code || hasUnsafeEnglishText(code)) continue;
    if (/```/.test(code)) continue;
    if (code.length > 5000) continue;
    snippets.push({ language, code });
    if (snippets.length >= 3) break;
  }
  return snippets;
}

function buildArticleMapSection(body, topic) {
  const headings = extractHeadings(body);
  const terms = extractTerms(body);
  const parts = [];
  const topicLabel = /^[aeiou]/i.test(topic) ? `an ${topic}` : `a ${topic}`;

  if (headings.length) {
    parts.push('## What This Article Covers');
    parts.push('');
    parts.push('The article is organized around these technical checkpoints:');
    parts.push('');
    parts.push(...headings.map((heading) => `- ${heading}`));
    parts.push('');
  }

  if (terms.length) {
    parts.push('## Technical Signals to Watch');
    parts.push('');
    parts.push(`Key terms carried over from the source material: ${terms.join(', ')}.`);
    parts.push('');
    parts.push(`For ${topicLabel} article, these terms are not decorative keywords; they define the boundaries of the implementation model and the parts that deserve careful verification.`);
  }

  return parts.join('\n').trim();
}

function buildHowItWorksSection(title, topic, body) {
  const terms = extractTerms(`${title}\n${body}`);
  const termText = terms.length ? ` In this note, the concrete anchors are ${terms.join(', ')}.` : '';

  if (topic === 'AI & Agent') {
    return `## How It Works

Read the workflow as an engineering pipeline: input is collected, context is selected, the model reasons within a bounded state, tools are invoked through explicit interfaces, and the final answer is evaluated against the task rather than against fluency alone.${termText}

The important production question is not whether the demo can answer once. It is whether the system can explain what context it used, what tool it called, why it failed, and how a human can recover the workflow.`;
  }

  if (topic === 'JUC') {
    return `## How It Works

The article should be read through state transitions. A concurrency primitive is useful only when its ownership, visibility, ordering, blocking, and wake-up rules are clear.${termText}

When the implementation becomes hard to reason about, step back and draw the state machine: who changes the state, who observes it, and which happens-before relationship makes the observation legal.`;
  }

  if (topic === 'RocketMQ') {
    return `## How It Works

The reliable path runs from producer behavior to broker persistence, queue assignment, consumer acknowledgement, retry handling, and operational recovery.${termText}

Do not compress all delivery issues into one phrase. Loss prevention, duplicate handling, ordering, backlog recovery, and durability are separate constraints, and each one changes the design.`;
  }

  if (topic === 'Search Engine') {
    return `## How It Works

The useful mental model starts with indexing and ends with distributed query execution: documents become index structures, shards live on nodes, requests are routed through the cluster, and results are merged back for the caller.${termText}

This is why a search article should connect Lucene-level mechanics with Elasticsearch-level operations instead of treating the cluster as a black box.`;
  }

  if (topic === 'MySQL') {
    return `## How It Works

The database work should be evaluated from evidence: schema shape, predicates, indexes, execution plans, replication topology, and recovery behavior.${termText}

For local Docker-based experiments, the setup is valuable as a learning and verification environment, but production use still requires backups, durability planning, monitoring, and failure drills.`;
  }

  if (topic === 'JDK') {
    return `## How It Works

The public API is only the entry point. The practical behavior depends on storage layout, resizing, iteration rules, hashing, null handling, and mutation patterns.${termText}

The safest way to read this kind of article is to connect API choices with workload shape: reads, writes, ordering, memory overhead, and concurrency assumptions.`;
  }

  if (topic === 'JVM') {
    return `## How It Works

JVM analysis starts from runtime evidence: allocation rate, object lifetime, heap pressure, pause time, thread behavior, and workload shape.${termText}

Tuning without measurements is mostly superstition. A useful change should have a before/after signal and a reason that future maintainers can understand.`;
  }

  if (topic === 'Microservices') {
    return `## How It Works

The design should begin with ownership and data boundaries. Only after those are clear does it make sense to discuss repositories, deployment units, APIs, and runtime communication.${termText}

A service split is successful when it reduces coordination risk. If it only adds network calls and distributed failure modes, the system became more complex without becoming easier to evolve.`;
  }

  if (topic === 'Scheduling') {
    return `## How It Works

Scheduling is a lifecycle problem: define the task, persist the plan, select an executor, run with retry and timeout rules, record history, and expose enough state for operators.${termText}

The hard part is not writing a cron expression. The hard part is making missed runs, duplicate runs, executor failure, and time-zone behavior explicit.`;
  }

  if (topic === 'Blog') {
    return `## How It Works

The blog is designed as a Markdown-first publishing system: posts stay portable, assets live with the repository, routes remain stable, and the generated site adds search, reading layout, and bilingual navigation.${termText}

That makes migration less fragile because the content is no longer locked inside one platform's editor or image hosting behavior.`;
  }

  return `## How It Works

The article should be read as an engineering note: define the problem, identify the moving parts, preserve concrete evidence, and turn the conclusion into a checklist future readers can verify.${termText}`;
}

function extraFocus(title, topic) {
  if (/message loss|零丢失/i.test(title)) {
    return 'The central question is where loss can happen: producer send, broker persistence, replication, consumer acknowledgement, or retry exhaustion.';
  }
  if (/duplicate|重复消费/i.test(title)) {
    return 'The central question is idempotency: the consumer must tolerate retries, redelivery, and partial business-side success.';
  }
  if (/ordering|顺序/i.test(title)) {
    return 'The central question is ordering scope: preserve order only where the business key actually requires serialized consumption.';
  }
  if (/backlog|积压/i.test(title)) {
    return 'The central question is recovery under pressure: measure lag, protect downstream systems, and increase throughput without creating more failures.';
  }
  if (/persistence|持久化/i.test(title)) {
    return 'The central question is durability: understand how writes, flushes, commit logs, and broker recovery shape the reliability boundary.';
  }
  if (/producer/i.test(title)) {
    return 'The central question is producer behavior: routing, send mode, retry strategy, and broker acknowledgement all affect end-to-end reliability.';
  }
  if (/AQS/i.test(title)) {
    return 'The central question is how AQS turns state, CAS, wait queues, and LockSupport into reusable synchronizers.';
  }
  if (/LockSupport/i.test(title)) {
    return 'The central question is parking and unparking: understand permits, blocking state, interruption, and the relationship with higher-level locks.';
  }
  if (/volatile/i.test(title)) {
    return 'The central question is visibility and ordering: volatile is powerful, but it is not a replacement for atomic compound operations.';
  }
  if (/Thread|线程/i.test(title)) {
    return 'The central question is what a Java thread represents at runtime and how scheduling, lifecycle, and shared state interact.';
  }
  if (/\bGC\b|\bJVM\b/i.test(title)) {
    return 'The central question is observability-driven tuning: start from allocation behavior, pause targets, and measured runtime evidence.';
  }
  if (/LangGraph/i.test(title)) {
    return 'The central question is controllability: model calls become safer when the workflow state and transition graph are explicit.';
  }
  if (/LangChain/i.test(title)) {
    return 'The central question is abstraction cost: frameworks speed up prototypes, but production systems still need clear boundaries and observability.';
  }
  if (/RAG/i.test(title)) {
    return 'The central question is retrieval quality: useful answers depend on chunking, indexing, ranking, context assembly, and evaluation.';
  }
  if (/Firefly|Scheduling/i.test(title)) {
    return 'The central question is task governance: schedules, executors, retries, time zones, and history need to be explicit operational concepts.';
  }
  if (/Elasticsearch|Lucene/i.test(title)) {
    return 'The central question is how Lucene-level index mechanics become a distributed search service through Elasticsearch.';
  }
  if (/MySQL/i.test(title)) {
    return 'The central question is evidence-based database work: use execution plans, data volume, and topology constraints to guide decisions.';
  }
  return `The central question is how this ${topic} topic behaves in a real engineering setting, not only in isolated examples.`;
}

function renderList(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function renderProfileBody({
  articleProfile,
  topic,
  topicProfile,
  sourceUrl,
  sourcePublished,
  body,
}) {
  const evidence = buildEvidenceSection(body);
  const sourceLine = sourceUrl
    ? `[Original source](${sourceUrl})`
    : 'Original source: personal blog';
  const dateLine = sourcePublished
    ? `Original publication date: ${sourcePublished}`
    : 'Original publication date: available in the article metadata';

  return `> Summary: ${articleProfile.summary}

## Intended Reader

${articleProfile.audience}

## Why This Matters

${topicProfile.context}

${articleProfile.thesis}

## Mental Model

${topicProfile.core}

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

${renderList(articleProfile.walkthrough)}

## Pitfalls and Tradeoffs

${renderList(articleProfile.tradeoffs)}

## Verification Checklist

${renderList(articleProfile.validation)}

## Practical Takeaways

${renderList(topicProfile.takeaways)}

${evidence ? `${evidence}\n\n` : ''}## Source Notes

- Topic: ${topic}
- ${sourceLine}
- ${dateLine}
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.`;
}

function buildEvidenceSection(body) {
  const images = extractImages(body);
  const snippets = extractCodeBlocks(body);
  const parts = [];

  if (images.length) {
    parts.push('## Visual Evidence');
    parts.push('');
    parts.push('The migrated local images are preserved as supporting figures. They keep the English edition aligned with the same diagrams, screenshots, or console evidence used by the source article.');
    parts.push('');
    parts.push(...images.map((url, index) => `![Figure ${index + 1}: Supporting visual from the original technical note.](${url})`));
    parts.push('');
  }

  if (snippets.length) {
    parts.push('## Selected Technical Snippets');
    parts.push('');
    parts.push('The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.');
    parts.push('');
    for (const snippet of snippets) {
      parts.push(`\`\`\`${snippet.language}`);
      parts.push(snippet.code);
      parts.push('```');
      parts.push('');
    }
  }

  return parts.join('\n').trim();
}

function buildEnglishBody({ title, description, tags, sourceUrl, sourcePublished, body, articleProfile }) {
  const topic = tags[0] ?? 'Engineering';
  const profile = topicProfiles[topic] ?? topicProfiles.Engineering;

  if (articleProfile) {
    return renderProfileBody({
      articleProfile,
      topic,
      topicProfile: profile,
      sourceUrl,
      sourcePublished,
      body,
    });
  }

  const sourceLine = sourceUrl
    ? `[Original source](${sourceUrl})`
    : 'Original source: personal blog';
  const dateLine = sourcePublished
    ? `Original publication date: ${sourcePublished}`
    : 'Original publication date: available in the article metadata';
  const articleMap = buildArticleMapSection(body, topic);
  const howItWorks = buildHowItWorksSection(title, topic, body);
  const evidence = buildEvidenceSection(body);

  return `> Summary: ${description}

## Why This Matters

${profile.context}

${extraFocus(title, topic)}

## Core Idea

${profile.core}

${articleMap ? `${articleMap}\n\n` : ''}${howItWorks}

## Key Takeaways

${profile.takeaways.map((item) => `- ${item}`).join('\n')}

## Engineering Checklist

${profile.checklist.map((item) => `- ${item}`).join('\n')}

${evidence ? `${evidence}\n\n` : ''}## Source Notes

- Topic: ${topic}
- ${sourceLine}
- ${dateLine}
- This English edition is reconstructed from the migrated source metadata, heading structure, technical terms, local assets, and clean implementation snippets.

## Closing Thoughts

The useful habit behind this note is to keep technical reasoning inspectable. A good English edition should help future readers understand the model, the tradeoffs, and the signals worth checking in real systems without pretending that every exploratory detail is production guidance.`;
}
async function main() {
  const entries = await readdir(root, { withFileTypes: true });
  let written = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const postDir = path.join(root, entry.name);
    const sourceFile = path.join(postDir, 'index.md');
    const targetFile = path.join(postDir, 'en.md');

    let markdown;
    try {
      markdown = await readFile(sourceFile, 'utf8');
    } catch {
      continue;
    }

    const { raw, body } = parseFrontmatter(markdown);
    const zhTitle = valueOf(raw, 'title') ?? entry.name;
    const slug = valueOf(raw, 'slug') ?? entry.name;
    const articleProfile = englishArticleProfiles[slug];
    const title = articleProfile?.title ?? localizeTitle(zhTitle, slug);
    const tags = [articleProfile?.topic ?? pickTopic(zhTitle, listOf(raw, 'tags'))];
    const published = valueOf(raw, 'published');
    const updated = valueOf(raw, 'updated');
    const draft = valueOf(raw, 'draft') ?? 'false';
    const featured = valueOf(raw, 'featured') ?? 'false';
    const sourcePlatform = blockValue(raw, 'source', 'platform');
    const sourceUrl = blockValue(raw, 'source', 'url');
    const sourcePublished = blockValue(raw, 'source', 'published');
    const description = articleProfile?.description ?? describe(title, tags);
    const rawSeries = valueOf(raw, 'series');
    const series = rawSeries ? (seriesMap.get(rawSeries) ?? (/[\u3400-\u9fff]/.test(rawSeries) ? undefined : rawSeries)) : undefined;
    const cover = valueOf(raw, 'cover');

    const frontmatter = [
      '---',
      `title: ${quote(title)}`,
      `description: ${quote(description)}`,
      'lang: en',
      `translationKey: ${quote(slug)}`,
      `published: ${published}`,
      updated ? `updated: ${updated}` : undefined,
      `slug: ${slug}`,
      'tags:',
      ...tags.map((tag) => `  - ${quote(tag)}`),
      series ? `series: ${quote(series)}` : undefined,
      cover ? `cover: ${quote(cover)}` : undefined,
      `draft: ${draft}`,
      `featured: ${featured}`,
      sourceUrl ? 'source:' : undefined,
      sourceUrl ? `  platform: ${platformMap.get(sourcePlatform ?? '') ?? sourcePlatform ?? 'Original source'}` : undefined,
      sourceUrl ? `  url: ${sourceUrl}` : undefined,
      sourcePublished ? `  published: ${sourcePublished}` : undefined,
      '---',
    ].filter(Boolean).join('\n');

    const englishBody = buildEnglishBody({
      title,
      description,
      tags,
      sourceUrl,
      sourcePublished,
      body,
      articleProfile,
    });

    await writeFile(targetFile, `${frontmatter}\n\n${englishBody}\n`, 'utf8');
    written += 1;
  }

  console.log(`Generated ${written} English post files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
