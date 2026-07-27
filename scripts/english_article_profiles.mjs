export const englishArticleProfiles = {
  'building-my-digital-garden': {
    title: 'Why I Rebuilt an Independent Blog',
    topic: 'Blog',
    description: 'A practical note on rebuilding a personal technical blog around Markdown, GitHub, local assets, and long-term ownership.',
    summary: 'This article explains why an independent blog is more than a visual site: it is a durable knowledge system where Markdown remains the source of truth and GitHub becomes the publishing backbone.',
    audience: 'Engineers who have written across multiple platforms and now want a stable personal knowledge base.',
    thesis: 'The core decision is to make the repository the canonical home of the content. The website should enhance reading, search, and navigation, but the Markdown files and local assets must remain portable.',
    walkthrough: [
      'Keep every article readable as plain Markdown before thinking about page effects.',
      'Store migrated images next to the post so the article does not depend on an external platform CDN.',
      'Use frontmatter for title, publication date, topic, source URL, language, and translation identity.',
      'Treat routing and RSS as long-term interfaces, because old links and subscribers are part of the knowledge system.'
    ],
    tradeoffs: [
      'A custom blog requires more maintenance than a hosted writing platform, but it avoids platform lock-in.',
      'A warm visual design is valuable only when it does not hide navigation, search, and reading clarity.',
      'Automated migration can move the archive quickly, but important posts still deserve editorial cleanup.'
    ],
    validation: [
      'Open the Markdown file directly and confirm that the article still makes sense without Astro.',
      'Build the site locally and verify post routes, images, search, RSS, and language switching.',
      'Check that future posts can be added by creating a new Markdown file, not by editing layout code.'
    ]
  },
  'markdown-writing-guide': {
    title: 'Markdown Writing Conventions for This Blog',
    topic: 'Blog',
    description: 'A writing convention for keeping technical posts consistent, portable, searchable, and easy to migrate.',
    summary: 'The article defines how posts should be structured so the blog remains comfortable to write in and safe to rebuild later.',
    audience: 'The future maintainer of the blog, including the author six months from now.',
    thesis: 'Good conventions reduce future migration cost. A post should have predictable frontmatter, clear headings, stable image paths, and code blocks that render correctly on GitHub and the generated site.',
    walkthrough: [
      'Use one folder per article when the post owns images or diagrams.',
      'Keep the title hierarchy simple: one article title, then meaningful second-level sections.',
      'Use fenced code blocks with accurate language identifiers such as `java`, `sql`, `bash`, or `text`.',
      'Separate drafts from published posts through metadata instead of moving files around.'
    ],
    tradeoffs: [
      'Too many rules make writing feel heavy; too few rules make migration and search messy.',
      'Pretty Markdown tricks should be avoided if they do not render consistently across platforms.',
      'Images should have local paths even when the original article used hosted URLs.'
    ],
    validation: [
      'Run the local build before publishing.',
      'Check that search indexes the title, description, and meaningful body text.',
      'Open both Chinese and English routes when the post has translations.'
    ]
  },
  'zhihu-1974794973481288478': {
    title: 'Elasticsearch Architecture and Lucene Basics',
    topic: 'Search Engine',
    description: 'A practical introduction to Elasticsearch architecture, node roles, Lucene, and the mental model behind distributed search.',
    summary: 'This article connects Elasticsearch concepts with the lower-level Lucene mechanics that make indexing and querying possible.',
    audience: 'Backend engineers who want to understand search infrastructure beyond basic API usage.',
    thesis: 'Elasticsearch should be understood as a distributed service built on top of Lucene. Lucene provides the index mechanics; Elasticsearch adds cluster coordination, node roles, APIs, and operational behavior.',
    walkthrough: [
      'Start with the search problem: documents must be indexed, segmented, queried, scored, and returned under latency constraints.',
      'Map Elasticsearch node roles to responsibilities such as data storage, master coordination, ingest processing, and request routing.',
      'Connect shards and replicas to availability and query parallelism instead of treating them as default settings.',
      'Use Lucene as the boundary for understanding inverted indexes, segments, and the cost of refresh and merge behavior.'
    ],
    tradeoffs: [
      'More shards can increase distribution but also increases coordination and memory overhead.',
      'Replicas improve availability and read capacity, but they raise storage and replication cost.',
      'Search relevance and cluster stability are related but should be tuned through different feedback loops.'
    ],
    validation: [
      'Check cluster health, shard allocation, node roles, and index mappings before loading large data.',
      'Use representative queries when evaluating index design.',
      'Watch slow queries, refresh pressure, and merge activity during write-heavy workloads.'
    ]
  },
  'zhihu-1975198896251758472': {
    title: 'Building and Visualizing an Elasticsearch Cluster',
    topic: 'Search Engine',
    description: 'A hands-on note about running an Elasticsearch cluster, observing JVM behavior, and using visualization tools to understand cluster state.',
    summary: 'The article turns cluster setup into an observability exercise: a search cluster is easier to reason about when nodes, heap, logs, and dashboards are visible.',
    audience: 'Engineers setting up Elasticsearch locally or preparing to troubleshoot a real cluster.',
    thesis: 'A cluster is not proven healthy just because the process starts. You need visibility into node discovery, heap configuration, GC logs, shard allocation, and dashboard-level cluster state.',
    walkthrough: [
      'Prepare the runtime environment and make JVM temporary directories, heap dumps, and GC logs easy to inspect.',
      'Start the cluster with a clear understanding of how nodes discover each other.',
      'Use Kibana or similar tooling to inspect index status, node health, and shard distribution.',
      'Treat visualization as a debugging surface, not as a replacement for understanding the underlying model.'
    ],
    tradeoffs: [
      'Local clusters are excellent for learning node behavior, but they do not reproduce production pressure by default.',
      'Increasing heap may hide symptoms temporarily while leaving mapping or query problems untouched.',
      'Dashboards summarize state; logs and metrics explain why that state changed.'
    ],
    validation: [
      'Confirm cluster health, node count, shard distribution, and replica assignment.',
      'Verify that heap dumps and GC logs are written to known locations.',
      'Create a small index and run sample queries before trusting the environment.'
    ]
  },
  'zhihu-1976319861740298575': {
    title: 'Elasticsearch Node Startup Flow',
    topic: 'Search Engine',
    description: 'A source-oriented walkthrough of how an Elasticsearch node loads components and moves through startup phases.',
    summary: 'This article follows node startup as a lifecycle: configuration, environment preparation, component construction, service initialization, and cluster participation.',
    audience: 'Engineers reading Elasticsearch internals or debugging node startup failures.',
    thesis: 'Node startup is best read as a staged composition process. Each phase prepares dependencies for the next one, and startup failures usually reveal which boundary was not satisfied.',
    walkthrough: [
      'Begin with configuration and environment preparation because later services depend on those resolved paths and settings.',
      'Identify the major node components and the order in which they are constructed.',
      'Follow initialization phases rather than jumping directly into request handling.',
      'Connect startup logs with lifecycle checkpoints so failures can be narrowed quickly.'
    ],
    tradeoffs: [
      'Source-level analysis is detailed, but it should still be tied to observable startup behavior.',
      'A missing setting, invalid path, or incompatible plugin can fail early before cluster logic is involved.',
      'Understanding construction order reduces guesswork when reading stack traces.'
    ],
    validation: [
      'Compare logs from a healthy startup and a failing startup.',
      'Check environment paths, plugin loading, JVM options, and cluster discovery settings.',
      'Use a minimal node configuration when isolating startup problems.'
    ]
  },
  'zhihu-1977040102321561948': {
    title: 'Core Registration and Communication Flow in Elasticsearch',
    topic: 'Search Engine',
    description: 'A walkthrough of Elasticsearch request routing, Netty communication, dispatching, and service registration boundaries.',
    summary: 'The article studies how external requests enter Elasticsearch, move through transport communication, and reach the dispatcher or service layer.',
    audience: 'Engineers interested in request lifecycle, network boundaries, and Elasticsearch internals.',
    thesis: 'Communication flow should be understood as a chain of boundaries: network transport, request decoding, dispatching, service lookup, execution, and response handling.',
    walkthrough: [
      'Start from the external request and identify how it enters the transport layer.',
      'Follow the Netty integration as the boundary between network IO and Elasticsearch request handling.',
      'Trace the dispatcher role that maps incoming work to the correct action or service.',
      'Relate registration to lifecycle so components are available before requests depend on them.'
    ],
    tradeoffs: [
      'Transport abstractions make request handling modular, but they can hide where latency or failures originate.',
      'A source walkthrough is useful only when paired with logs, metrics, and thread evidence.',
      'Network-level success does not guarantee application-level execution success.'
    ],
    validation: [
      'Trace a single request through logs or debugger checkpoints.',
      'Separate connection failures from dispatch failures and execution failures.',
      'Inspect thread pools and rejected execution metrics when request handling stalls.'
    ]
  },
  'zhihu-1994095384809714595': {
    title: 'Debugging a Database Executor-Selector Issue',
    topic: 'Database',
    description: 'A debugging field note about using execution plans, metrics, and path comparison to diagnose a database executor-selector problem.',
    summary: 'The article approaches a database incident through evidence instead of guessing: compare production behavior, execution plans, access paths, and runtime selection logic.',
    audience: 'Backend engineers responsible for database performance and incident analysis.',
    thesis: 'Executor or selector bugs often look like database slowness at first. The investigation should move from symptom to query plan, then to routing and execution path evidence.',
    walkthrough: [
      'Capture the problematic query, dataset size, latency, and environment before changing anything.',
      'Read the execution plan to understand access type, index usage, row estimates, and filtering behavior.',
      'Compare the healthy path and the failing path to isolate whether selection logic changes the query behavior.',
      'Use metrics and logs to decide whether the issue belongs to SQL, executor dispatch, or runtime resource pressure.'
    ],
    tradeoffs: [
      'Index changes can improve one query while hurting writes or other query shapes.',
      'Changing routing logic without understanding the execution plan can move the problem rather than fix it.',
      'Production-only symptoms require a careful reproduction strategy, not blind tuning.'
    ],
    validation: [
      'Record the before and after execution plans.',
      'Validate latency on production-like data volume.',
      'Keep rollback steps ready when touching query routes or indexes.'
    ]
  },
  'zhihu-1996349931254984734': {
    title: 'When AI Damages an Engineering Team',
    topic: 'AI & Agent',
    description: 'A reflective engineering article about how AI adoption can harm teams when it replaces thinking, ownership, and technical review.',
    summary: 'The article is not anti-AI. It argues that AI becomes dangerous when teams use it to skip understanding, architecture judgment, and code ownership.',
    audience: 'Engineers and team leads adopting AI tools in daily development.',
    thesis: 'AI should increase engineering leverage, not remove engineering responsibility. The failure mode is a team that ships plausible output without understanding the design or owning the consequences.',
    walkthrough: [
      'Separate useful AI assistance from outsourcing judgment.',
      'Watch for review decay: code appears faster, but fewer people understand why it works.',
      'Make AI-generated changes pass the same design, testing, and observability standards as human-written code.',
      'Treat prompts, assumptions, and generated diffs as artifacts that need review.'
    ],
    tradeoffs: [
      'AI can accelerate exploration, but it can also normalize shallow implementation.',
      'Junior engineers may learn faster with AI, or slower if they never debug the underlying model.',
      'Team productivity metrics can look better while long-term maintainability gets worse.'
    ],
    validation: [
      'Ask whether the author can explain the design without the model.',
      'Require tests and operational reasoning for AI-assisted changes.',
      'Track rework and incident patterns, not only code throughput.'
    ]
  },
  'zhihu-2042648559519003525': {
    title: 'How AI Models Work',
    topic: 'AI & Agent',
    description: 'A practical introduction to AI models, machine learning, large language models, datasets, and the role of messy real-world data.',
    summary: 'This article explains AI models from an engineering perspective: data, training, pattern learning, inference, and the limitations that appear when real input is messy.',
    audience: 'Developers who want a technical but approachable mental model for AI systems.',
    thesis: 'An AI model is not a magic knowledge store. It is a learned statistical system shaped by data quality, training objectives, architecture choices, and the inference context provided at runtime.',
    walkthrough: [
      'Start with machine learning as pattern learning from data rather than hand-coded rules.',
      'Connect datasets to model behavior: messy data leads to messy boundaries.',
      'Explain LLMs as systems that predict and compose language based on learned representations.',
      'Distinguish model capability from product reliability; reliable systems still need retrieval, tools, evaluation, and guardrails.'
    ],
    tradeoffs: [
      'A larger model may improve general reasoning but still fail on fresh or domain-specific facts.',
      'Fine-tuning changes behavior but does not remove the need for evaluation.',
      'RAG can provide external evidence, but retrieval quality becomes a new failure point.'
    ],
    validation: [
      'Test with examples from the actual domain, not only clean demos.',
      'Check failure cases and ambiguous prompts.',
      'Measure whether added context improves accuracy or merely increases confidence.'
    ]
  },
  'zhihu-2047757777276351389': {
    title: 'Agent Concepts, Principles, and Construction Patterns',
    topic: 'AI & Agent',
    description: 'A structured explanation of AI Agent concepts, ReAct-style loops, task decomposition, tool use, and construction patterns.',
    summary: 'The article presents agents as execution systems: they reason, act through tools, observe results, and continue until the task reaches a usable state.',
    audience: 'Developers moving from basic LLM calls to agent-style applications.',
    thesis: 'An Agent is useful when the task needs iterative reasoning and external action. The engineering challenge is to keep the loop bounded, observable, and recoverable.',
    walkthrough: [
      'Define the agent loop: reason, choose an action, call a tool, observe the result, and update state.',
      'Use examples such as question answering or planning to show why a single model call is not always enough.',
      'Treat tools as controlled interfaces with explicit inputs, outputs, and error behavior.',
      'Keep memory and state small enough to inspect and stable enough to continue a task.'
    ],
    tradeoffs: [
      'More autonomy increases flexibility but also increases failure surface.',
      'A powerful tool set can make agents useful, but each tool adds security and correctness risk.',
      'Natural language plans are easy to produce but hard to verify without structured state.'
    ],
    validation: [
      'Log the model decision, selected tool, tool arguments, and result.',
      'Replay failed tasks from stored state.',
      'Add stop conditions and human handoff for uncertain or destructive actions.'
    ]
  },
  'zhihu-2047758122572429078': {
    title: 'A Practical Guide to Building an AI Agent',
    topic: 'AI & Agent',
    description: 'A pragmatic guide to building agents without turning every LLM feature into unnecessary architecture.',
    summary: 'The article argues for disciplined agent design: choose agents only when the problem needs them, then make planning, execution, memory, and sub-agents explicit.',
    audience: 'Engineers designing AI-assisted workflows or internal agent tools.',
    thesis: 'An agent should be introduced because the task requires iterative execution, not because the word is fashionable. The design must clarify planning, execution, memory, and delegation boundaries.',
    walkthrough: [
      'Start from the task boundary and decide whether a workflow, a chain, or an agent is actually needed.',
      'Separate planning from execution so intermediate steps can be inspected.',
      'Use memory only for information that improves future decisions.',
      'Introduce sub-agents when responsibilities are truly separate, not as decoration.'
    ],
    tradeoffs: [
      'Agent frameworks can help prototypes, but unclear boundaries become production bugs.',
      'Memory can improve continuity, but stale memory can poison future decisions.',
      'Sub-agents can reduce complexity per role while increasing orchestration complexity.'
    ],
    validation: [
      'Define success criteria before building the agent loop.',
      'Test tool failures, malformed outputs, timeouts, and retries.',
      'Review traces to confirm the agent is solving the task, not just producing fluent steps.'
    ]
  },
  'zhihu-2047758376046797002': {
    title: 'How RAG Works: A Detailed Walkthrough',
    topic: 'AI & Agent',
    description: 'A detailed walkthrough of RAG, including document parsing, chunking, embedding, indexing, retrieval, reranking, context assembly, and evaluation.',
    summary: 'RAG is explained as a retrieval pipeline rather than a magic prompt trick. Each stage can improve or damage answer quality.',
    audience: 'Engineers implementing knowledge-base question answering or enterprise AI search.',
    thesis: 'The quality of a RAG system depends on the full pipeline: source documents, chunking, embeddings, index design, retrieval, ranking, prompt assembly, and evaluation.',
    walkthrough: [
      'Start offline with document parsing, cleanup, chunking, embedding, and index storage.',
      'At query time, convert the user question into a retrieval task and select candidate chunks.',
      'Use ranking or reranking to reduce irrelevant context before the model sees it.',
      'Assemble context with citations or source anchors so the answer can be inspected.'
    ],
    tradeoffs: [
      'Small chunks improve precision but can lose context; large chunks preserve context but add noise.',
      'Embedding search is not the same as factual verification.',
      'Adding more retrieved text can make answers worse if ranking is weak.'
    ],
    validation: [
      'Create a test set of real questions and expected evidence.',
      'Measure retrieval hit rate separately from answer quality.',
      'Inspect failed answers to decide whether the problem is parsing, chunking, ranking, or generation.'
    ]
  },
  'zhihu-2047758537632256246': {
    title: 'Why Consider Moving Away from LangChain',
    topic: 'AI & Agent',
    description: 'A critical engineering note on LangChain abstraction cost, black-box agent behavior, and when lower-level control is preferable.',
    summary: 'The article explains why a framework that accelerates early experiments can become a liability when production systems need clarity, traceability, and control.',
    audience: 'Engineers evaluating whether LangChain is still the right abstraction for a production AI system.',
    thesis: 'LangChain is useful when it matches the problem boundary. It becomes costly when abstractions hide control flow, make simple tasks complex, or obscure failure diagnosis.',
    walkthrough: [
      'Identify which part of the system LangChain is actually simplifying.',
      'Compare framework convenience with the cost of debugging hidden state and implicit chains.',
      'Keep tool calls, memory, prompts, and model IO visible even when using framework helpers.',
      'Be willing to replace a framework abstraction with a small explicit workflow when production control matters.'
    ],
    tradeoffs: [
      'Frameworks reduce boilerplate but can add conceptual overhead.',
      'A simple HTTP or model call may be easier to own than a generic chain abstraction.',
      'Leaving a framework too early can waste useful ecosystem integrations; leaving too late can trap the architecture.'
    ],
    validation: [
      'Trace a full request from input to model call to tool result to final output.',
      'Estimate how hard it is to debug a failed run.',
      'Keep migration paths open by isolating framework-specific code.'
    ]
  },
  'zhihu-2048906743363769607': {
    title: 'A Complete Guide to LangChain Core Components',
    topic: 'AI & Agent',
    description: 'A full technical guide to LangChain components, including models, prompts, chains, memory, tools, agents, retrieval, and application structure.',
    summary: 'This article turns LangChain from a list of APIs into a system map: components are useful only when their boundaries and data flow are understood.',
    audience: 'Developers building LLM applications and trying to understand the LangChain ecosystem.',
    thesis: 'LangChain should be learned as a set of composable boundaries: model IO, prompt construction, parsing, memory, retrieval, tools, and agent orchestration.',
    walkthrough: [
      'Start with the model call and prompt template because every higher-level abstraction eventually depends on them.',
      'Introduce output parsing so model responses can become structured data instead of free text.',
      'Use chains to express repeatable workflows, not to hide logic that should be visible.',
      'Add memory, tools, and retrieval only when the task requires external context or action.'
    ],
    tradeoffs: [
      'High-level abstractions speed up demos but can obscure execution order.',
      'Memory improves continuity but can introduce stale or irrelevant context.',
      'Agent flexibility is valuable only when tool boundaries and traces remain inspectable.'
    ],
    validation: [
      'Log prompt inputs, model outputs, parser results, and tool calls.',
      'Test each component independently before composing them.',
      'Use real task examples instead of only hello-world prompts.'
    ]
  },
  'zhihu-2048915219284603403': {
    title: 'LangChain Core Components: From Basics to Application Structure',
    topic: 'AI & Agent',
    description: 'A focused guide to the LangChain component model and the path from simple model calls to structured LLM applications.',
    summary: 'The article explains how LangChain components fit together and where engineers should draw boundaries when an LLM demo becomes an application.',
    audience: 'Engineers who want a practical overview before committing to a LangChain architecture.',
    thesis: 'The value of LangChain is composition. The risk is losing sight of what data enters and leaves each component.',
    walkthrough: [
      'Build from model access and prompt templates toward chains and parsing.',
      'Introduce memory only after the workflow has a clear state requirement.',
      'Use tools to cross the boundary from language generation into external action.',
      'Keep retrieval and agent logic observable because they are the most common failure points.'
    ],
    tradeoffs: [
      'The framework can reduce repetitive glue code while increasing debugging distance.',
      'Generic abstractions are helpful for learning but may need to be narrowed in production.',
      'A component diagram is often more useful than a long chain of helper calls.'
    ],
    validation: [
      'Document each component boundary.',
      'Capture traces for full requests.',
      'Replace weak abstractions with explicit code when ownership becomes unclear.'
    ]
  },
  'zhihu-2049924384266232895': {
    title: 'LangChain Agents, Tools, and Memory',
    topic: 'AI & Agent',
    description: 'A practitioner note on LangChain Agent design, tool contracts, memory boundaries, and enterprise AI workflow structure.',
    summary: 'The article frames an Agent as model plus harness: the model decides, but tools, memory, and execution boundaries determine whether the system is reliable.',
    audience: 'Engineers building tool-using LLM systems for internal or enterprise workflows.',
    thesis: 'Agents become production-ready only when tools are narrow, memory is intentional, and every action can be inspected.',
    walkthrough: [
      'Position the Agent as a coordination layer around the model rather than the whole system.',
      'Design tools with small responsibilities, clear parameters, and predictable error behavior.',
      'Use memory for durable task context, not for dumping every conversation token.',
      'Separate business actions from model reasoning so dangerous operations can be reviewed.'
    ],
    tradeoffs: [
      'A broader tool surface increases capability and risk at the same time.',
      'Memory improves continuity but raises privacy, correctness, and stale-state concerns.',
      'Enterprise agents need auditability more than clever prompt tricks.'
    ],
    validation: [
      'Review tool schemas and sample tool calls.',
      'Record agent traces with inputs, decisions, tool arguments, and outputs.',
      'Test permission failures, invalid arguments, and partial business success.'
    ]
  },
  'zhihu-2049924766493157219': {
    title: 'LangGraph: Moving Agents from Answering to Controlled Execution',
    topic: 'AI & Agent',
    description: 'An engineering guide to LangGraph as a stateful graph model for controllable, inspectable, and recoverable agent workflows.',
    summary: 'The article explains why enterprise agents need explicit state, nodes, edges, and checkpoints rather than a single opaque model call.',
    audience: 'Engineers designing multi-step AI workflows that must be controlled and debugged.',
    thesis: 'LangGraph is valuable because it turns agent execution into a graph with explicit state and transitions. That makes retries, branching, checkpoints, and human review easier to reason about.',
    walkthrough: [
      'Start with the problem: a single model call cannot safely represent a long-running workflow.',
      'Model State as the shared business context that moves through the graph.',
      'Model Nodes as executable steps and Edges as the control rules between them.',
      'Use checkpoints and interrupts when the workflow must be resumed or reviewed.'
    ],
    tradeoffs: [
      'Graphs add structure and control, but they require more upfront modeling.',
      'Explicit state improves debugging while forcing the team to define what state really matters.',
      'A graph should simplify operational behavior, not become a decorative diagram.'
    ],
    validation: [
      'Trace state changes across nodes.',
      'Test retry, resume, and human-in-the-loop paths.',
      'Inspect branch conditions with real failure cases.'
    ]
  },
  'zhihu-2064119996322730439': {
    title: 'Firefly: A Lightweight Distributed Scheduler for Java Business Systems',
    topic: 'Scheduling',
    description: 'A design note for Firefly, a lightweight distributed scheduling center for Java systems with task definitions, executors, annotations, and operational history.',
    summary: 'The article explains why business systems need scheduling as a governed runtime capability instead of scattered cron jobs.',
    audience: 'Java engineers designing internal scheduling infrastructure.',
    thesis: 'A scheduler should make task ownership, executor registration, dispatch, retry behavior, timeout rules, and execution history explicit.',
    walkthrough: [
      'Start from the business problem: scattered cron jobs are hard to observe, retry, and govern.',
      'Define task metadata separately from runtime execution so schedules can be managed centrally.',
      'Use Spring Boot annotations to reduce integration cost while still registering tasks explicitly.',
      'Track executor heartbeat and execution history so operators can debug missed or failed runs.'
    ],
    tradeoffs: [
      'A lightweight scheduler should avoid overbuilding features before execution semantics are clear.',
      'Distributed dispatch requires idempotency and executor state awareness.',
      'Annotation convenience should not hide operational behavior.'
    ],
    validation: [
      'Test missed runs, retries, timeouts, duplicate dispatch, and executor restarts.',
      'Verify task history and failure reasons in the management view.',
      'Document timezone and schedule interpretation rules.'
    ]
  },
  'zhihu-675926646': {
    title: 'Notes on Using DelayQueue',
    topic: 'Java',
    description: 'A Java note about DelayQueue usage, delayed task semantics, source-level behavior, and simple Spring Boot integration.',
    summary: 'The article explains DelayQueue as a delayed scheduling primitive and shows how it can be used for local delayed execution.',
    audience: 'Java developers who need a simple delay mechanism inside an application process.',
    thesis: 'DelayQueue is useful for in-process delayed work, but it should not be confused with durable distributed scheduling or message delay infrastructure.',
    walkthrough: [
      'Define the delayed task object and the time comparison rule.',
      'Understand that elements become available only after their delay has expired.',
      'Use a consumer thread or executor to take expired elements and perform work.',
      'Keep Spring Boot integration simple and explicit so shutdown and error handling are visible.'
    ],
    tradeoffs: [
      'DelayQueue is simple, but it is memory-based and process-local.',
      'It is not appropriate when delayed tasks must survive process crashes.',
      'Consumer failure handling must be designed by the application.'
    ],
    validation: [
      'Test ordering for tasks with different delays.',
      'Test interruption and application shutdown.',
      'Add logging around enqueue time, trigger time, and execution result.'
    ]
  },
  'zhihu-675930230': {
    title: 'Optimizing Large MySQL Queries with Indexes',
    topic: 'MySQL',
    description: 'A practical MySQL indexing article about large-query latency, index benefits, index cost, test data, and common index invalidation cases.',
    summary: 'The article explains why indexes help large queries and why index design must be verified with execution plans instead of assumptions.',
    audience: 'Backend developers working with million-row MySQL tables.',
    thesis: 'An index is an access path. It improves a query only when the index matches the predicate, ordering, cardinality, and data distribution of the workload.',
    walkthrough: [
      'Start with the query shape and the columns used in filtering, sorting, and joining.',
      'Use test data to compare query behavior before and after adding an index.',
      'Read the execution plan to confirm whether MySQL uses the intended index.',
      'Study invalidation cases such as functions on indexed columns, leading wildcards, implicit conversions, and poor composite index order.'
    ],
    tradeoffs: [
      'Indexes speed up reads but add write cost and storage overhead.',
      'Too many indexes can make maintenance and optimizer choices worse.',
      'A benchmark on small data may not predict behavior on large tables.'
    ],
    validation: [
      'Run `EXPLAIN` before and after index changes.',
      'Record row estimates, access type, key, and extra information.',
      'Measure write impact when adding indexes to hot tables.'
    ]
  },
  'zhihu-675930535': {
    title: 'Building a MySQL Cluster with Docker',
    topic: 'MySQL',
    description: 'A hands-on note about using Docker to learn MySQL primary-replica replication, binlog configuration, and cluster verification.',
    summary: 'The article uses Docker to build a learning environment for MySQL replication and explains what should and should not be inferred from that environment.',
    audience: 'Developers learning MySQL replication through local experiments.',
    thesis: 'Docker is a good way to learn replication mechanics, but primary-replica topology still needs careful configuration of server IDs, binlog behavior, users, and replication state.',
    walkthrough: [
      'Start a primary MySQL instance and expose the necessary ports for local testing.',
      'Configure binlog settings and unique server IDs before expecting replication to work.',
      'Create a replication user with the required permissions.',
      'Start the replica and verify status rather than assuming the topology is healthy.'
    ],
    tradeoffs: [
      'Local Docker makes experimentation cheap but does not represent production durability.',
      'Hard-coded passwords and local IPs are acceptable in a lab only when they are clearly marked as examples.',
      'Replication lag and failover behavior need separate testing.'
    ],
    validation: [
      'Check master status and replica status after configuration.',
      'Write test data on the primary and verify it appears on the replica.',
      'Record binlog file, position, and error fields when replication fails.'
    ]
  },
  'zhihu-675931603': {
    title: 'The Subtleties of volatile',
    topic: 'JUC',
    description: 'A Java concurrency article about volatile, visibility, ordering, and why volatile is not a replacement for atomic compound operations.',
    summary: 'The article explains volatile as a visibility and ordering tool, not a general-purpose lock or atomicity mechanism.',
    audience: 'Java developers learning memory visibility and concurrency correctness.',
    thesis: 'volatile makes writes visible and constrains certain reorderings, but it does not make compound operations atomic.',
    walkthrough: [
      'Define the visibility problem: one thread writes state and another thread needs to observe it reliably.',
      'Explain how volatile affects read and write visibility under the Java Memory Model.',
      'Separate visibility from atomicity using examples such as counters or check-then-act logic.',
      'Use volatile for flags and publication patterns only when the invariant is simple enough.'
    ],
    tradeoffs: [
      'volatile is lighter than a lock but provides fewer guarantees.',
      'It can make a state flag safe while leaving related mutable state unsafe.',
      'If multiple fields must change together, a lock or atomic abstraction is usually clearer.'
    ],
    validation: [
      'Identify the exact happens-before relationship being relied on.',
      'Avoid using volatile to protect multi-step updates.',
      'Stress-test visibility assumptions with repeated concurrent runs.'
    ]
  },
  'zhihu-675932219': {
    title: 'RocketMQ Architecture Basics',
    topic: 'RocketMQ',
    description: 'A foundational RocketMQ article about producers, consumers, brokers, NameServer, cluster models, and the capabilities a message queue should provide.',
    summary: 'The article explains RocketMQ as a distributed messaging system with clear roles and operational requirements.',
    audience: 'Backend engineers getting started with RocketMQ architecture.',
    thesis: 'A message queue is not only a buffer. It is a delivery system with routing, persistence, retry, ordering, consumption, and operational visibility concerns.',
    walkthrough: [
      'Introduce RocketMQ roles: Producer, Consumer, Broker, and NameServer.',
      'Map the cluster model to routing and availability.',
      'Explain how topics, queues, and consumer groups shape message distribution.',
      'List the capabilities expected from a production MQ: durability, retry, ordering, load balancing, and observability.'
    ],
    tradeoffs: [
      'Decoupling producers and consumers improves resilience but introduces delivery semantics.',
      'Cluster topology affects both availability and operational complexity.',
      'Message queues reduce synchronous pressure but do not remove business consistency concerns.'
    ],
    validation: [
      'Confirm that producers can discover brokers through NameServer.',
      'Verify consumer group behavior with multiple consumers.',
      'Monitor broker health, retry messages, and queue lag.'
    ]
  },
  'zhihu-675933161': {
    title: 'RocketMQ: How to Prevent Message Loss',
    topic: 'RocketMQ',
    description: 'A reliability-focused RocketMQ article about where messages can be lost and how producer confirmation, broker durability, and consumer acknowledgement reduce loss risk.',
    summary: 'The article treats message loss as an end-to-end problem across producer, broker, storage, replication, and consumer acknowledgement.',
    audience: 'Engineers designing reliable messaging flows with RocketMQ.',
    thesis: 'Preventing message loss requires identifying every boundary where a message can disappear or become unobservable.',
    walkthrough: [
      'Start at the producer: send mode, retry behavior, and acknowledgement determine whether the producer knows the broker accepted the message.',
      'Move to the broker: persistence and flush strategy define how durable accepted messages are.',
      'Consider replication and broker failure because a single broker acknowledgement may not equal cross-node durability.',
      'Finish at the consumer: acknowledgement timing determines whether business processing and message progress stay consistent.'
    ],
    tradeoffs: [
      'Synchronous confirmation improves safety but adds latency.',
      'Stronger flush or replication settings improve durability but reduce throughput.',
      'Transaction messages help some business consistency cases but add state management complexity.'
    ],
    validation: [
      'Test producer retry and send failure behavior.',
      'Simulate broker restart during message flow.',
      'Check consumer acknowledgement after business-side failure.'
    ]
  },
  'zhihu-675933519': {
    title: 'RocketMQ: How to Avoid Duplicate Consumption',
    topic: 'RocketMQ',
    description: 'A RocketMQ article about duplicate delivery, consumer lifecycle, broker pulling behavior, rebalance effects, and business-level idempotency.',
    summary: 'The article explains that duplicate consumption is normal in reliable messaging systems and must be handled through idempotent business design.',
    audience: 'Engineers implementing RocketMQ consumers for real business operations.',
    thesis: 'The queue can reduce duplicate delivery, but the business consumer must tolerate redelivery, retry, rebalance, and partial success.',
    walkthrough: [
      'Define what counts as duplicate consumption from the business perspective.',
      'Follow the consumer lifecycle from pulling messages to processing and committing progress.',
      'Understand how broker behavior, retries, and rebalance can cause the same message to be seen again.',
      'Design idempotency using business keys, state checks, or deduplication records.'
    ],
    tradeoffs: [
      'Strict deduplication can add database writes and contention.',
      'Idempotency logic must match the business action, not only the message ID.',
      'Rebalance improves load distribution but can expose poorly designed consumers.'
    ],
    validation: [
      'Replay the same message and verify the business result is unchanged.',
      'Test consumer crash after business success but before acknowledgement.',
      'Monitor retry counts and duplicate business keys.'
    ]
  },
  'zhihu-675934781': {
    title: 'RocketMQ: How to Preserve Message Ordering',
    topic: 'RocketMQ',
    description: 'A RocketMQ article about ordered consumption, queue assignment, ordering scope, and the cost of serializing message flow.',
    summary: 'The article explains that ordering should be scoped to the business key that needs it, not applied globally by default.',
    audience: 'Engineers designing order-sensitive message flows.',
    thesis: 'Message ordering is a constraint on concurrency. It should be preserved only where the business invariant requires serialized processing.',
    walkthrough: [
      'Define the ordering scope first: global, topic-level, queue-level, or business-key-level.',
      'Route related messages to the same queue when they must be consumed in order.',
      'Use sequential consumption for that queue while keeping unrelated keys parallel when possible.',
      'Handle failure carefully because retry behavior can block later messages in the same ordered stream.'
    ],
    tradeoffs: [
      'Global ordering is simple conceptually but expensive operationally.',
      'Per-key ordering preserves more throughput but requires stable routing.',
      'Retry and poison messages are more disruptive in ordered flows.'
    ],
    validation: [
      'Send messages for the same business key and verify processing order.',
      'Test failure of one message and observe later messages in the same queue.',
      'Monitor lag for ordered queues separately from normal queues.'
    ]
  },
  'zhihu-675935289': {
    title: 'RocketMQ: How to Handle Message Backlog',
    topic: 'RocketMQ',
    description: 'A RocketMQ operations note about backlog causes, consumer capacity, scaling, downstream pressure, and safe recovery.',
    summary: 'The article explains backlog handling as a recovery problem: increase throughput without overwhelming downstream systems or creating duplicate failures.',
    audience: 'Engineers operating RocketMQ consumers under traffic spikes or stalled processing.',
    thesis: 'A backlog is a symptom. The fix depends on whether the bottleneck is consumer code, downstream dependency, broker pressure, retry storms, or insufficient parallelism.',
    walkthrough: [
      'Measure lag, consume rate, retry count, and downstream latency before scaling.',
      'Identify whether consumers are slow, blocked, failing, or under-provisioned.',
      'Increase parallelism only when business ordering and downstream capacity allow it.',
      'Use temporary recovery consumers or batching carefully when backlog is large.'
    ],
    tradeoffs: [
      'Scaling consumers can reduce lag but can also overload databases or remote services.',
      'Skipping or dead-lettering messages may restore flow while requiring business compensation.',
      'Ordered queues make backlog recovery slower because concurrency is constrained.'
    ],
    validation: [
      'Track lag reduction rate after each change.',
      'Watch downstream error rate while increasing consumption.',
      'Verify dead-letter and retry handling after recovery.'
    ]
  },
  'zhihu-675935650': {
    title: 'RocketMQ Persistence Internals',
    topic: 'RocketMQ',
    description: 'A source-oriented RocketMQ article about store directories, CommitLog, ConsumeQueue, IndexFile, producer-to-disk flow, and consumer read paths.',
    summary: 'The article studies how RocketMQ persists messages and how storage structures support writes, reads, and recovery.',
    audience: 'Engineers interested in RocketMQ internals and durability behavior.',
    thesis: 'RocketMQ durability depends on understanding the storage path: messages are appended, indexed, made consumable, and recovered through coordinated storage structures.',
    walkthrough: [
      'Start with the store directory layout so each file type has a clear purpose.',
      'Follow the producer write path into CommitLog and related dispatch structures.',
      'Understand how ConsumeQueue and IndexFile support consumption and lookup.',
      'Connect flush strategy and recovery behavior to durability guarantees.'
    ],
    tradeoffs: [
      'Append-oriented storage improves throughput but requires careful indexing and recovery.',
      'Synchronous flush improves safety while reducing write throughput.',
      'Storage internals are useful for debugging but should not leak into normal business code.'
    ],
    validation: [
      'Inspect store files in a local broker after sending messages.',
      'Restart the broker and verify message recovery.',
      'Measure write latency under different flush strategies if configuration changes are tested.'
    ]
  },
  'zhihu-675936893': {
    title: 'RocketMQ Producer Source Code Analysis',
    topic: 'RocketMQ',
    description: 'A source-code walkthrough of RocketMQ producer startup, DefaultMQProducer, transaction producer behavior, and sendMessage execution.',
    summary: 'The article follows the producer from configuration and startup to message sending and transaction message handling.',
    audience: 'Engineers reading RocketMQ producer internals or debugging send behavior.',
    thesis: 'Producer behavior shapes reliability before the message ever reaches the broker. Routing, send mode, retry strategy, and transaction handling all matter.',
    walkthrough: [
      'Start with producer initialization and the responsibilities of DefaultMQProducer.',
      'Trace how routing information is discovered and used for message sending.',
      'Follow sendMessage behavior through validation, queue selection, broker interaction, and acknowledgement.',
      'Compare normal sending with transaction message flow and local transaction checks.'
    ],
    tradeoffs: [
      'Retry improves reliability but can create duplicate messages.',
      'Transaction messages improve business consistency but add state transitions and checkback complexity.',
      'Source analysis should be tied to observable producer logs and broker responses.'
    ],
    validation: [
      'Test synchronous, asynchronous, and one-way sending if the article uses them.',
      'Simulate broker unavailability and observe retry behavior.',
      'Verify transaction message status transitions with controlled local transaction outcomes.'
    ]
  },
  'zhihu-675938211': {
    title: 'JUC: Understanding the AQS Model',
    topic: 'JUC',
    description: 'A Java concurrency article about AQS state, exclusive and shared acquisition, queues, templates, and source-level synchronizer design.',
    summary: 'The article explains AQS as a reusable framework for building synchronizers from state, CAS, wait queues, and LockSupport.',
    audience: 'Java developers who want to understand how locks and synchronizers work internally.',
    thesis: 'AQS turns synchronization into a template: subclasses define state transitions, while AQS manages queueing, parking, unparking, and acquisition flow.',
    walkthrough: [
      'Understand the state field and the CAS operations that protect it.',
      'Separate exclusive acquisition from shared acquisition because their propagation rules differ.',
      'Follow the queue path when acquisition fails and a thread must wait.',
      'Read release logic together with wake-up behavior so ownership transfer is clear.'
    ],
    tradeoffs: [
      'AQS is powerful but easy to misuse when state semantics are unclear.',
      'Fairness can improve predictability while reducing throughput.',
      'Low-level synchronizer code should be avoided unless standard JUC classes cannot express the need.'
    ],
    validation: [
      'Draw the state transition table before implementing a synchronizer.',
      'Test cancellation, interruption, timeout, and release paths.',
      'Use thread dumps or traces to confirm queue behavior under contention.'
    ]
  },
  'zhihu-675939389': {
    title: 'JUC: Understanding LockSupport',
    topic: 'JUC',
    description: 'A Java concurrency note about thread signals, lost signals, spurious wakeups, wait/notify pitfalls, and LockSupport permits.',
    summary: 'The article explains LockSupport as a permit-based blocking primitive and contrasts it with fragile wait/notify patterns.',
    audience: 'Java developers learning low-level blocking and wake-up semantics.',
    thesis: 'LockSupport is easier to compose than raw wait/notify because it uses permits, but correct blocking still requires explicit state checks.',
    walkthrough: [
      'Start with the signal problem: a waiting thread needs a reliable condition and a wake-up mechanism.',
      'Explain lost signals and why state must be checked around blocking operations.',
      'Compare wait/notify pitfalls with LockSupport park and unpark.',
      'Relate LockSupport to higher-level synchronizers such as AQS.'
    ],
    tradeoffs: [
      'LockSupport avoids some wait/notify ordering problems but does not replace condition design.',
      'Spurious wakeups still require loops around blocking conditions.',
      'Parking threads directly should be reserved for infrastructure code.'
    ],
    validation: [
      'Test unpark-before-park behavior.',
      'Test interruption while parked.',
      'Always pair blocking with a visible state condition.'
    ]
  },
  'zhihu-675940036': {
    title: 'JDK: Understanding List',
    topic: 'JDK',
    description: 'A JDK collections article about ArrayList, LinkedList, CopyOnWriteArrayList, and choosing a List implementation by access and mutation pattern.',
    summary: 'The article explains why List implementations have different performance and concurrency behavior even when their API looks similar.',
    audience: 'Java developers choosing collection implementations in service code.',
    thesis: 'Choose a List implementation by workload shape: random access, insertion pattern, iteration frequency, mutation frequency, and concurrency assumptions.',
    walkthrough: [
      'Use ArrayList when indexed access and append-heavy workloads dominate.',
      'Use LinkedList only when its node-based behavior actually matches the operation pattern.',
      'Use CopyOnWriteArrayList for read-heavy concurrent scenarios with rare writes.',
      'Consider resizing, memory overhead, iterator behavior, and thread safety before choosing.'
    ],
    tradeoffs: [
      'ArrayList is usually cache-friendly but resizing and shifting can matter.',
      'LinkedList has pointer overhead and poor locality despite cheap node insertion in theory.',
      'CopyOnWriteArrayList makes reads simple but writes are expensive.'
    ],
    validation: [
      'Benchmark representative read and write ratios.',
      'Check whether iteration or random access dominates.',
      'Avoid assuming List implementations are thread-safe.'
    ]
  },
  'zhihu-675940342': {
    title: 'JVM Memory Model and GC Tuning',
    topic: 'JVM',
    description: 'A JVM article about runtime memory areas, heap, stack, method area, GC behavior, and evidence-based tuning.',
    summary: 'The article connects JVM memory structure with practical GC tuning and runtime observability.',
    audience: 'Java engineers diagnosing memory pressure, latency spikes, or GC behavior.',
    thesis: 'GC tuning starts with runtime evidence. You need to know where memory is allocated, how objects live and die, and which pause or throughput goal matters.',
    walkthrough: [
      'Map JVM runtime areas such as heap, stack, native method stack, and method area.',
      'Relate object allocation and object lifetime to GC pressure.',
      'Use GC logs, heap usage, allocation rate, and pause time to identify the real problem.',
      'Tune flags only after the workload and service-level goals are clear.'
    ],
    tradeoffs: [
      'Reducing pause time may reduce throughput or increase CPU cost.',
      'Increasing heap can reduce GC frequency while increasing worst-case pause or memory footprint.',
      'A tuning change without a before/after measurement is not a reliable improvement.'
    ],
    validation: [
      'Capture GC logs before and after changes.',
      'Measure allocation rate, pause percentiles, and throughput.',
      'Test under production-like traffic and data size.'
    ]
  },
  'zhihu-675941184': {
    title: 'A Practical Discussion on Microservice Decomposition',
    topic: 'Microservices',
    description: 'A design article about microservice decomposition, benefits, costs, data boundaries, distributed problems, and operational ownership.',
    summary: 'The article argues that microservices are a boundary decision, not a repository-count decision.',
    audience: 'Backend engineers and tech leads evaluating service splits.',
    thesis: 'A service should be split when the boundary improves ownership, change safety, and runtime independence. Splitting without data and operational boundaries only adds distributed complexity.',
    walkthrough: [
      'Start with business capability and ownership rather than technology preference.',
      'Define data ownership before defining service APIs.',
      'Plan observability, deployment, rollback, and compatibility before the split.',
      'Use modularity first when the team is not ready for distributed ownership.'
    ],
    tradeoffs: [
      'Microservices improve independent evolution but introduce network failures and coordination cost.',
      'Shared databases reduce migration pain but weaken service boundaries.',
      'Distributed transactions and reporting requirements often reveal poor decomposition choices.'
    ],
    validation: [
      'Write the ownership boundary in one paragraph.',
      'List data that cannot cross the boundary without an API.',
      'Measure whether deployment and incident response become simpler after the split.'
    ]
  },
  'zhihu-675941543': {
    title: 'JDK: Understanding Map',
    topic: 'JDK',
    description: 'A JDK collections article about HashMap construction, resizing, insertion, deletion, clearing, and practical Map behavior.',
    summary: 'The article explains HashMap as a data structure with hashing, buckets, resizing, collision handling, and iteration behavior.',
    audience: 'Java developers who use Map heavily and want to understand performance and correctness details.',
    thesis: 'Map performance depends on hash quality, capacity, load factor, resizing behavior, collision handling, and concurrency assumptions.',
    walkthrough: [
      'Start with construction parameters such as initial capacity and load factor.',
      'Follow put behavior through hashing, bucket selection, collision handling, and update logic.',
      'Understand resize behavior because it affects latency and memory during growth.',
      'Read deletion and clear behavior as part of lifecycle and memory management.'
    ],
    tradeoffs: [
      'A low load factor reduces collisions but increases memory use.',
      'A poor initial capacity can trigger repeated resizing under large inserts.',
      'HashMap is not safe for concurrent mutation without external protection.'
    ],
    validation: [
      'Choose capacity based on expected size when loading large maps.',
      'Avoid mutable keys that change hash behavior.',
      'Use ConcurrentHashMap or synchronization for concurrent updates.'
    ]
  },
  'zhihu-675942290': {
    title: 'Concurrent Programming: Preface',
    topic: 'JUC',
    description: 'A preface to Java concurrency that frames the main problems: atomicity, visibility, ordering, locks, threads, and the Java Memory Model.',
    summary: 'The article sets up a concurrency series by explaining why shared state is difficult and why correct mental models matter.',
    audience: 'Java developers beginning a deeper concurrency study path.',
    thesis: 'Concurrency is not primarily about using more threads. It is about controlling shared state under atomicity, visibility, ordering, scheduling, and failure constraints.',
    walkthrough: [
      'Start with why concurrent programs fail: multiple threads observe and mutate shared state.',
      'Separate atomicity, visibility, and ordering as different correctness dimensions.',
      'Introduce locks, CAS, volatile, AQS, and JMM as tools that address different parts of the problem.',
      'Treat examples as a way to build a mental model before reading low-level source code.'
    ],
    tradeoffs: [
      'Adding threads can increase throughput or increase contention and bugs.',
      'Low-level primitives are powerful but easy to misuse.',
      'Correctness must come before performance in concurrency design.'
    ],
    validation: [
      'State which shared data is mutable.',
      'Identify the synchronization mechanism protecting it.',
      'Test with contention, cancellation, and failure paths.'
    ]
  },
  'zhihu-675942439': {
    title: 'The Nature of Threads',
    topic: 'JUC',
    description: 'A Java concurrency article about thread creation, lifecycle, core operations, sleep, interruption, and runtime behavior.',
    summary: 'The article explains threads as runtime execution units with lifecycle, scheduling, interruption, and shared-state implications.',
    audience: 'Java developers who want a grounded understanding of thread behavior.',
    thesis: 'A thread is not just a convenient API. It is a scheduled execution path that interacts with CPU time, blocking operations, lifecycle state, and shared memory.',
    walkthrough: [
      'Understand thread creation and what starts executing when `start()` is called.',
      'Map lifecycle states such as runnable, blocked, waiting, timed waiting, and terminated.',
      'Explain sleep and interruption as coordination signals rather than business logic.',
      'Relate thread behavior to shared-state design and resource ownership.'
    ],
    tradeoffs: [
      'Creating raw threads is simple but hard to manage at scale.',
      'Thread pools improve control but require queue, rejection, and shutdown policies.',
      'Ignoring interruption makes services harder to stop and recover.'
    ],
    validation: [
      'Name threads and inspect thread dumps during blocking scenarios.',
      'Test interruption and shutdown paths.',
      'Prefer executor services for managed concurrent work.'
    ]
  },
  'zhihu-675943628': {
    title: 'Locks and Concurrency',
    topic: 'JUC',
    description: 'A Java concurrency article about ThreadLocal, weak references, lock design, thread safety, unsafe increments, and critical sections.',
    summary: 'The article studies several concurrency mechanisms through the shared-state problems they solve and the failure modes they introduce.',
    audience: 'Java developers debugging thread safety issues in service code.',
    thesis: 'Locks, ThreadLocal, and atomic operations are not interchangeable. Each one controls a different relationship between state, ownership, and visibility.',
    walkthrough: [
      'Use ThreadLocal when state should be isolated per thread, and understand cleanup requirements.',
      'Use weak-reference behavior to reason about memory retention and ThreadLocalMap cleanup.',
      'Explain why increments are unsafe when read-modify-write is not atomic.',
      'Define critical sections around the smallest state transition that must be protected.'
    ],
    tradeoffs: [
      'ThreadLocal avoids sharing but can leak memory in pooled threads if not removed.',
      'Locks protect invariants but can introduce contention and deadlocks.',
      'Atomic operations are efficient for simple state updates but not for complex invariants.'
    ],
    validation: [
      'Remove ThreadLocal values in finally blocks when using thread pools.',
      'Test concurrent increments under contention.',
      'Inspect lock scope and avoid blocking IO while holding locks.'
    ]
  },
  'zhihu-676290217': {
    title: 'JUC: Atomic Classes and CAS Principles',
    topic: 'JUC',
    description: 'A Java concurrency article about CAS, offsets, lock-free updates, Atomic classes, ABA concerns, and practical usage boundaries.',
    summary: 'The article explains CAS as the foundation of many atomic classes and lock-free state transitions in Java.',
    audience: 'Java developers learning atomic operations and lock-free concurrency.',
    thesis: 'CAS enables optimistic state updates: compare the expected value with the current value, then update only if the state has not changed.',
    walkthrough: [
      'Start with the read-modify-write race that makes normal increments unsafe.',
      'Explain CAS as compare-and-set and connect it to memory offsets or low-level field access.',
      'Study Atomic classes as reusable wrappers around CAS-based updates.',
      'Discuss ABA and why versioning or stamped references may be needed in some designs.'
    ],
    tradeoffs: [
      'CAS avoids blocking but can spin under high contention.',
      'Atomic classes work well for simple variables but not for multi-field invariants.',
      'Lock-free code can be faster and harder to reason about at the same time.'
    ],
    validation: [
      'Benchmark under realistic contention rather than single-thread tests.',
      'Check whether the invariant spans more than one field.',
      'Document retry loops and failure behavior.'
    ]
  },
  'zhihu-676373529': {
    title: 'The Well-Known Java Memory Model',
    topic: 'JUC',
    description: 'A Java Memory Model article about atomicity, visibility, ordering, CPU caches, MESI, and why concurrency bugs appear despite simple code.',
    summary: 'The article connects CPU and JVM memory behavior with Java-level correctness concepts such as visibility and ordering.',
    audience: 'Java developers who want to understand the memory model behind volatile, locks, and atomic classes.',
    thesis: 'The Java Memory Model defines the rules that make cross-thread communication meaningful. Without a happens-before relationship, code that looks obvious may still be incorrect.',
    walkthrough: [
      'Separate atomicity, visibility, and ordering as three independent failure modes.',
      'Use CPU cache and cache coherence as background for why visibility is not automatic.',
      'Introduce happens-before as the language-level way to reason about observation order.',
      'Connect volatile, locks, and thread lifecycle rules to memory model guarantees.'
    ],
    tradeoffs: [
      'Hardware explanations help intuition but Java correctness must be reasoned through JMM rules.',
      'volatile provides visibility and ordering constraints but not compound atomicity.',
      'Over-synchronization can hurt performance, but under-synchronization breaks correctness.'
    ],
    validation: [
      'Write down the happens-before relationship for every shared-state handoff.',
      'Avoid relying on timing or sleep to fix visibility problems.',
      'Use stress tests to expose missing synchronization.'
    ]
  },
  'zhihu-677750590': {
    title: 'Dissecting the Principles of AQS',
    topic: 'JUC',
    description: 'A deeper AQS article about the CLH-style queue, acquisition templates, state transitions, shared and exclusive modes, and synchronizer internals.',
    summary: 'The article dives into AQS queue mechanics and explains how synchronizers coordinate contention, waiting, and wake-up.',
    audience: 'Java developers reading JUC source code or implementing advanced synchronization behavior.',
    thesis: 'AQS is a queue plus a state machine. Once you understand the queue and state transitions, locks and synchronizers become much easier to analyze.',
    walkthrough: [
      'Read the AQS queue as a CLH-style waiting structure that orders contending threads.',
      'Follow exclusive acquisition from fast-path CAS to enqueue, park, and retry.',
      'Follow shared acquisition and propagation because it differs from exclusive ownership.',
      'Treat template methods as the subclass boundary where synchronizer semantics are defined.'
    ],
    tradeoffs: [
      'AQS hides much of the hard queue management but requires precise state semantics from subclasses.',
      'Fair and non-fair modes change contention behavior and throughput.',
      'Understanding cancellation and interruption is essential for production-grade synchronizers.'
    ],
    validation: [
      'Trace a contended acquisition with at least three threads.',
      'Test release and wake-up behavior under cancellation.',
      'Prefer proven JUC synchronizers unless a custom one is clearly justified.'
    ]
  }
};
