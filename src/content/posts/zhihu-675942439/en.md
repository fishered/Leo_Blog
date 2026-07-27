---
title: "The Nature of Threads"
description: "A Java concurrency article about thread creation, lifecycle, core operations, sleep, interruption, and runtime behavior."
lang: en
translationKey: "zhihu-675942439"
published: 2024-01-03
slug: zhihu-675942439
tags:
  - "JUC"
draft: false
featured: false
source:
  platform: Zhihu
  url: https://zhuanlan.zhihu.com/p/675942439
  published: 2024-01-03
---

> Summary: The article explains threads as runtime execution units with lifecycle, scheduling, interruption, and shared-state implications.

## Intended Reader

Java developers who want a grounded understanding of thread behavior.

## Why This Matters

Java concurrency is where language semantics, JVM memory visibility, OS scheduling, and data-structure design meet. Small misunderstandings often become production-only bugs.

A thread is not just a convenient API. It is a scheduled execution path that interacts with CPU time, blocking operations, lifecycle state, and shared memory.

## Mental Model

Think in terms of state ownership, visibility, ordering, blocking, and wake-up semantics. APIs such as AQS, CAS, LockSupport, volatile, and ThreadLocal are tools for shaping those guarantees.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Understand thread creation and what starts executing when `start()` is called.
- Map lifecycle states such as runnable, blocked, waiting, timed waiting, and terminated.
- Explain sleep and interruption as coordination signals rather than business logic.
- Relate thread behavior to shared-state design and resource ownership.

## Pitfalls and Tradeoffs

- Creating raw threads is simple but hard to manage at scale.
- Thread pools improve control but require queue, rejection, and shutdown policies.
- Ignoring interruption makes services harder to stop and recover.

## Verification Checklist

- Name threads and inspect thread dumps during blocking scenarios.
- Test interruption and shutdown paths.
- Prefer executor services for managed concurrent work.

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
![Figure 4: Supporting visual from the original technical note.](./image-04.jpg)
![Figure 5: Supporting visual from the original technical note.](./image-05.jpg)
![Figure 6: Supporting visual from the original technical note.](./image-06.jpg)
![Figure 7: Supporting visual from the original technical note.](./image-07.jpg)

## Selected Technical Snippets

The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.

```java
/* Make sure registerNatives is the first thing <clinit> does. */
private static native void registerNatives();
static {
registerNatives();
}
```

```java
@FunctionalInterface
public interface Callable<V> {
/**
* Computes a result, or throws an exception if unable to do so.
*
* @return computed result
* @throws Exception if unable to compute a result
*/
V call() throws Exception;
}
```

```java
public interface Future<V> {

/**
* Attempts to cancel execution of this task.  This attempt will
* fail if the task has already completed, has already been cancelled,
* or could not be cancelled for some other reason. If successful,
* and this task has not started when {@code cancel} is called,
* this task should never run.  If the task has already started,
* then the {@code mayInterruptIfRunning} parameter determines
* whether the thread executing this task should be interrupted in
* an attempt to stop the task.
*
* <p>After this method returns, subsequent calls to {@link #isDone} will
* always return {@code true}.  Subsequent calls to {@link #isCancelled}
* will always return {@code true} if this method returned {@code true}.
*
* @param mayInterruptIfRunning {@code true} if the thread executing this
* task should be interrupted; otherwise, in-progress tasks are allowed
* to complete
* @return {@code false} if the task could not be cancelled,
* typically because it has already completed normally;
* {@code true} otherwise
*/
boolean cancel(boolean mayInterruptIfRunning);

/**
* Returns {@code true} if this task was cancelled before it completed
* normally.
*
* @return {@code true} if this task was cancelled before it completed
*/
boolean isCancelled();

/**
* Returns {@code true} if this task completed.
*
* Completion may be due to normal termination, an exception, or
* cancellation -- in all of these cases, this method will return
* {@code true}.
*
* @return {@code true} if this task completed
*/
boolean isDone();

/**
* Waits if necessary for the computation to complete, and then
* retrieves its result.
*
* @return the computed result
* @throws CancellationException if the computation was cancelled
* @throws ExecutionException if the computation threw an
* exception
* @throws InterruptedException if the current thread was interrupted
* while waiting
*/
V get() throws InterruptedException, ExecutionException;

/**
* Waits if necessary for at most the given time for the computation
* to complete, and then retrieves its result, if available.
*
* @param timeout the maximum time to wait
* @param unit the time unit of the timeout argument
* @return the computed result
* @throws CancellationException if the computation was cancelled
* @throws ExecutionException if the computation threw an
* exception
* @throws InterruptedException if the current thread was interrupted
* while waiting
* @throws TimeoutException if the wait timed out
*/
V get(long timeout, TimeUnit unit)
throws InterruptedException, ExecutionException, TimeoutException;
}
```

## Source Notes

- Topic: JUC
- [Original source](https://zhuanlan.zhihu.com/p/675942439)
- Original publication date: 2024-01-03
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
