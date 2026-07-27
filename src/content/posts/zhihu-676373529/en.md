---
title: "The Well-Known Java Memory Model"
description: "A Java Memory Model article about atomicity, visibility, ordering, CPU caches, MESI, and why concurrency bugs appear despite simple code."
lang: en
translationKey: "zhihu-676373529"
published: 2024-01-06
slug: zhihu-676373529
tags:
  - "JUC"
draft: false
featured: false
source:
  platform: Zhihu
  url: https://zhuanlan.zhihu.com/p/676373529
  published: 2024-01-06
---

> Summary: The article connects CPU and JVM memory behavior with Java-level correctness concepts such as visibility and ordering.

## Intended Reader

Java developers who want to understand the memory model behind volatile, locks, and atomic classes.

## Why This Matters

Java concurrency is where language semantics, JVM memory visibility, OS scheduling, and data-structure design meet. Small misunderstandings often become production-only bugs.

The Java Memory Model defines the rules that make cross-thread communication meaningful. Without a happens-before relationship, code that looks obvious may still be incorrect.

## Mental Model

Think in terms of state ownership, visibility, ordering, blocking, and wake-up semantics. APIs such as AQS, CAS, LockSupport, volatile, and ThreadLocal are tools for shaping those guarantees.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Separate atomicity, visibility, and ordering as three independent failure modes.
- Use CPU cache and cache coherence as background for why visibility is not automatic.
- Introduce happens-before as the language-level way to reason about observation order.
- Connect volatile, locks, and thread lifecycle rules to memory model guarantees.

## Pitfalls and Tradeoffs

- Hardware explanations help intuition but Java correctness must be reasoned through JMM rules.
- volatile provides visibility and ordering constraints but not compound atomicity.
- Over-synchronization can hurt performance, but under-synchronization breaks correctness.

## Verification Checklist

- Write down the happens-before relationship for every shared-state handoff.
- Avoid relying on timing or sleep to fix visibility problems.
- Use stress tests to expose missing synchronization.

## Practical Takeaways

- Distinguish atomicity, visibility, and ordering; they solve different classes of concurrency bugs.
- Do not treat locks as a single concept. Lock acquisition, queueing, parking, interruption, and fairness all affect behavior.
- Use low-level primitives only when the higher-level abstraction cannot express the requirement clearly.
- Concurrency bugs need evidence: thread dumps, state transitions, queue length, contention, and timeout signals.

## Visual Evidence

The migrated local images are preserved as supporting figures. They keep the English edition aligned with the same diagrams, screenshots, or console evidence used by the source article.

![Figure 1: Supporting visual from the original technical note.](./image-01.jpg)
![Figure 2: Supporting visual from the original technical note.](./image-02.jpg)
![Figure 3: Supporting visual from the original technical note.](./image-03.jpg)

## Selected Technical Snippets

The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.

```java
public static void main(String[] args) {
int a = 0;
int b = 0;
int c = a + b;
}
```

## Source Notes

- Topic: JUC
- [Original source](https://zhuanlan.zhihu.com/p/676373529)
- Original publication date: 2024-01-06
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
