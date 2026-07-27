---
title: "Debugging a Database Executor-Selector Issue"
description: "A debugging field note about using execution plans, metrics, and path comparison to diagnose a database executor-selector problem."
lang: en
translationKey: "zhihu-1994095384809714595"
published: 2026-01-12
slug: zhihu-1994095384809714595
tags:
  - "Database"
draft: false
featured: false
source:
  platform: Zhihu
  url: https://zhuanlan.zhihu.com/p/1994095384809714595
  published: 2026-01-12
---

> Summary: The article approaches a database incident through evidence instead of guessing: compare production behavior, execution plans, access paths, and runtime selection logic.

## Intended Reader

Backend engineers responsible for database performance and incident analysis.

## Why This Matters

Database debugging often involves more than SQL. Executors, selectors, connection management, and distributed runtime behavior can all affect what users see.

Executor or selector bugs often look like database slowness at first. The investigation should move from symptom to query plan, then to routing and execution path evidence.

## Mental Model

Work from observable symptoms back to the execution path, then isolate whether the problem belongs to query planning, runtime dispatch, connection state, or infrastructure.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Capture the problematic query, dataset size, latency, and environment before changing anything.
- Read the execution plan to understand access type, index usage, row estimates, and filtering behavior.
- Compare the healthy path and the failing path to isolate whether selection logic changes the query behavior.
- Use metrics and logs to decide whether the issue belongs to SQL, executor dispatch, or runtime resource pressure.

## Pitfalls and Tradeoffs

- Index changes can improve one query while hurting writes or other query shapes.
- Changing routing logic without understanding the execution plan can move the problem rather than fix it.
- Production-only symptoms require a careful reproduction strategy, not blind tuning.

## Verification Checklist

- Record the before and after execution plans.
- Validate latency on production-like data volume.
- Keep rollback steps ready when touching query routes or indexes.

## Practical Takeaways

- Start with concrete evidence: logs, metrics, query shape, connection state, and reproduction steps.
- Executor and selector issues often show up as latency, starvation, or uneven resource use.
- A fix should be validated against both correctness and operational stability.
- Keep the investigation trail clear enough for future incidents.

## Selected Technical Snippets

The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.

```sql
SELECT id
FROM rcp_device_event
WHERE eid > 2388
AND event IN ('PROFILE_INFO', 'INTERNAL_REQUEST', 'DEVICE_BOOT')
AND status NOT IN ('TO_BE_PROCESSED', 'PROCESSING')
AND create_time < CURDATE() - INTERVAL 14 DAY
ORDER BY id DESC
LIMIT 500;
```

```text
id	select_type	table	partitions	type	possible_keys	key	key_len	ref	rows	filtered	Extra
1	SIMPLE	event	-	range	rcp_device_event_create_time_index,status,event,idx_create_time	event	131	-	3	25.04	Using index condition; Using where; Using filesort
```

```text
id	select_type	table	partitions	type	possible_keys	key	key_len	ref	rows	filtered	Extra
1	SIMPLE	event	-	index	rcp_device_event_create_time_index,status,event,idx_create_time	PRIMARY	8	-	2468	6.75	Using where; Backward index scan
```

## Source Notes

- Topic: Database
- [Original source](https://zhuanlan.zhihu.com/p/1994095384809714595)
- Original publication date: 2026-01-12
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
