---
title: "Notes on Using DelayQueue"
description: "A Java note about DelayQueue usage, delayed task semantics, source-level behavior, and simple Spring Boot integration."
lang: en
translationKey: "zhihu-675926646"
published: 2024-01-03
slug: zhihu-675926646
tags:
  - "Java"
draft: false
featured: false
source:
  platform: Zhihu
  url: https://zhuanlan.zhihu.com/p/675926646
  published: 2024-01-03
---

> Summary: The article explains DelayQueue as a delayed scheduling primitive and shows how it can be used for local delayed execution.

## Intended Reader

Java developers who need a simple delay mechanism inside an application process.

## Why This Matters

Java engineering notes often sit between language features, runtime behavior, and practical service implementation.

DelayQueue is useful for in-process delayed work, but it should not be confused with durable distributed scheduling or message delay infrastructure.

## Mental Model

The goal is to connect the API-level usage with the runtime behavior and the production tradeoff behind it.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Define the delayed task object and the time comparison rule.
- Understand that elements become available only after their delay has expired.
- Use a consumer thread or executor to take expired elements and perform work.
- Keep Spring Boot integration simple and explicit so shutdown and error handling are visible.

## Pitfalls and Tradeoffs

- DelayQueue is simple, but it is memory-based and process-local.
- It is not appropriate when delayed tasks must survive process crashes.
- Consumer failure handling must be designed by the application.

## Verification Checklist

- Test ordering for tasks with different delays.
- Test interruption and application shutdown.
- Add logging around enqueue time, trigger time, and execution result.

## Practical Takeaways

- Understand the abstraction before relying on it in a critical path.
- Prefer simple, observable designs unless the problem clearly requires more machinery.
- Keep examples close to real service constraints.
- Document edge cases, not only the happy path.

## Visual Evidence

The migrated local images are preserved as supporting figures. They keep the English edition aligned with the same diagrams, screenshots, or console evidence used by the source article.

![Figure 1: Supporting visual from the original technical note.](./image-01.jpg)

## Selected Technical Snippets

The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.

```java
// An highlighted block
public class DelayQueue<E extends Delayed> extends AbstractQueue<E>
implements BlockingQueue<E>
```

```java
@Override
public long getDelay(TimeUnit unit) {
//        return unit.convert(this.expire - System.currentTimeMillis(),unit);
return unit.convert(this.expire - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
}

@Override
public int compareTo(Delayed o) {
//        long delta = getDelay(TimeUnit.NANOSECONDS) - o.getDelay(TimeUnit.NANOSECONDS);
//        return (int) delta;
return (int)(this.getDelay(TimeUnit.MILLISECONDS) - o.getDelay(TimeUnit.MILLISECONDS));
}

@Override
public boolean equals(Object o) {
if (o instanceof DelayTask){
return String.valueOf(this.data.getIdentifier()).equals(String.valueOf(((DelayTask) o).getData().getIdentifier()));
}
return false;
}
```

```text
public E take() throws InterruptedException {
final ReentrantLock lock = this.lock;
lock.lockInterruptibly();
try {
for (;;) {
E first = q.peek();
if (first == null)
available.await();
else {
long delay = first.getDelay(NANOSECONDS);
if (delay <= 0)
return q.poll();
first = null; // don't retain ref while waiting
if (leader != null)
available.await();
else {
Thread thisThread = Thread.currentThread();
leader = thisThread;
try {
available.awaitNanos(delay);
} finally {
if (leader == thisThread)
leader = null;
}
}
}
}
} finally {
if (leader == null && q.peek() != null)
available.signal();
lock.unlock();
}
}

public E poll(long timeout, TimeUnit unit) throws InterruptedException {
long nanos = unit.toNanos(timeout);
final ReentrantLock lock = this.lock;
lock.lockInterruptibly();
try {
for (;;) {
E first = q.peek();
if (first == null) {
if (nanos <= 0)
return null;
else
nanos = available.awaitNanos(nanos);
} else {
long delay = first.getDelay(NANOSECONDS);
if (delay <= 0)
return q.poll();
if (nanos <= 0)
return null;
first = null; // don't retain ref while waiting
if (nanos < delay || leader != null)
nanos = available.awaitNanos(nanos);
else {
Thread thisThread = Thread.currentThread();
leader = thisThread;
try {
long timeLeft = available.awaitNanos(delay);
nanos -= delay - timeLeft;
} finally {
if (leader == thisThread)
leader = null;
}
}
}
}
} finally {
if (leader == null && q.peek() != null)
available.signal();
lock.unlock();
}
}
```

## Source Notes

- Topic: Java
- [Original source](https://zhuanlan.zhihu.com/p/675926646)
- Original publication date: 2024-01-03
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
