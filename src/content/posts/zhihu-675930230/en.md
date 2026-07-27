---
title: "Optimizing Large MySQL Queries with Indexes"
description: "A practical MySQL indexing article about large-query latency, index benefits, index cost, test data, and common index invalidation cases."
lang: en
translationKey: "zhihu-675930230"
published: 2024-01-03
slug: zhihu-675930230
tags:
  - "MySQL"
draft: false
featured: false
source:
  platform: Zhihu
  url: https://zhuanlan.zhihu.com/p/675930230
  published: 2024-01-03
---

> Summary: The article explains why indexes help large queries and why index design must be verified with execution plans instead of assumptions.

## Intended Reader

Backend developers working with million-row MySQL tables.

## Why This Matters

MySQL performance and deployment work is usually about data shape, access paths, indexes, transactions, and operational topology.

An index is an access path. It improves a query only when the index matches the predicate, ordering, cardinality, and data distribution of the workload.

## Mental Model

The key is to understand how the database chooses an execution path and how deployment choices change availability, maintenance, and failure recovery.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Start with the query shape and the columns used in filtering, sorting, and joining.
- Use test data to compare query behavior before and after adding an index.
- Read the execution plan to confirm whether MySQL uses the intended index.
- Study invalidation cases such as functions on indexed columns, leading wildcards, implicit conversions, and poor composite index order.

## Pitfalls and Tradeoffs

- Indexes speed up reads but add write cost and storage overhead.
- Too many indexes can make maintenance and optimizer choices worse.
- A benchmark on small data may not predict behavior on large tables.

## Verification Checklist

- Run `EXPLAIN` before and after index changes.
- Record row estimates, access type, key, and extra information.
- Measure write impact when adding indexes to hot tables.

## Practical Takeaways

- Index design should start from predicates, sorting, cardinality, and result size.
- Large queries need execution-plan evidence, not guesswork.
- Docker-based clusters are useful for learning and local verification, but production topology requires stricter durability and backup planning.
- Optimization should preserve correctness first, then reduce latency and resource cost.

## Visual Evidence

The migrated local images are preserved as supporting figures. They keep the English edition aligned with the same diagrams, screenshots, or console evidence used by the source article.

![Figure 1: Supporting visual from the original technical note.](./image-01.jpg)
![Figure 2: Supporting visual from the original technical note.](./image-02.jpg)

## Selected Technical Snippets

The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.

```abap
CREATE TABLE `sd_user`  (
`ID` int(11) NOT NULL AUTO_INCREMENT,
`DEPTID` int(11) NULL DEFAULT NULL,
`USERNAME` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
`IDENTIFIER` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
`SERIALNUMBER` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
`LOGINNAME` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
`LOGINPASSWORD` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
`STATE` smallint(6) NOT NULL,
`PHONE` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
`EMAIL` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
`ISDEPTSEC` smallint(6) NOT NULL,
`HOLDERID` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
`CERT` varchar(4000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
`LOCKEDTIME` timestamp(0) NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP(0),
`LOCKEDSTATE` smallint(6) NOT NULL,
`ERRORCOUNT` int(11) NOT NULL,
`CONFIGDENTIAL` smallint(6) NOT NULL,
`USERFROM` smallint(6) NOT NULL,
`MANAGEDEPTID` varchar(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
`MSGSYNTIME` bigint(20) NOT NULL,
`LASTUPDATE` bigint(20) NOT NULL,   PRIMARY KEY (`ID`) USING BTREE,
CONSTRAINT `FK_RELATIONSHIP_4` FOREIGN KEY (`DEPTID`) REFERENCES `sd_dept` (`ID`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 2562028 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

INDEX `FK_RELATIONSHIP_4`(`DEPTID`) USING BTREE,
INDEX `FK_RELATIONSHIP_sd_55`(`ID`) USING BTREE,
INDEX `FK_RELATIONSHIP_sd_56`(`IDENTIFIER`) USING BTREE,
INDEX `FK_RELATIONSHIP_sd_57`(`SERIALNUMBER`) USING BTREE,
INDEX `FK_RELATIONSHIP_sd_58`(`LOGINNAME`) USING BTREE,
INDEX `FK_RELATIONSHIP_sd_59`(`STATE`) USING BTREE,
INDEX `FK_RELATIONSHIP_sd_60`(`USERNAME`) USING BTREE,
```

## Source Notes

- Topic: MySQL
- [Original source](https://zhuanlan.zhihu.com/p/675930230)
- Original publication date: 2024-01-03
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
