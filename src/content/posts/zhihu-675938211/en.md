---
title: "JUC: Understanding the AQS Model"
description: "A Java concurrency article about AQS state, exclusive and shared acquisition, queues, templates, and source-level synchronizer design."
lang: en
translationKey: "zhihu-675938211"
published: 2024-01-03
slug: zhihu-675938211
tags:
  - "JUC"
draft: false
featured: false
source:
  platform: Zhihu
  url: https://zhuanlan.zhihu.com/p/675938211
  published: 2024-01-03
---

> Summary: The article explains AQS as a reusable framework for building synchronizers from state, CAS, wait queues, and LockSupport.

## Intended Reader

Java developers who want to understand how locks and synchronizers work internally.

## Why This Matters

Java concurrency is where language semantics, JVM memory visibility, OS scheduling, and data-structure design meet. Small misunderstandings often become production-only bugs.

AQS turns synchronization into a template: subclasses define state transitions, while AQS manages queueing, parking, unparking, and acquisition flow.

## Mental Model

Think in terms of state ownership, visibility, ordering, blocking, and wake-up semantics. APIs such as AQS, CAS, LockSupport, volatile, and ThreadLocal are tools for shaping those guarantees.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Understand the state field and the CAS operations that protect it.
- Separate exclusive acquisition from shared acquisition because their propagation rules differ.
- Follow the queue path when acquisition fails and a thread must wait.
- Read release logic together with wake-up behavior so ownership transfer is clear.

## Pitfalls and Tradeoffs

- AQS is powerful but easy to misuse when state semantics are unclear.
- Fairness can improve predictability while reducing throughput.
- Low-level synchronizer code should be avoided unless standard JUC classes cannot express the need.

## Verification Checklist

- Draw the state transition table before implementing a synchronizer.
- Test cancellation, interruption, timeout, and release paths.
- Use thread dumps or traces to confirm queue behavior under contention.

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

## Selected Technical Snippets

The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.

```java
protected final int getState() {
return state;
}

/**
* Sets the value of synchronization state.
* This operation has memory semantics of a {@code volatile} write.
* @param newState the new state value
*/
protected final void setState(int newState) {
state = newState;
}

/**
* Atomically sets synchronization state to the given updated
* value if the current state value equals the expected value.
* This operation has memory semantics of a {@code volatile} read
* and write.
*
* @param expect the expected value
* @param update the new value
* @return {@code true} if successful. False return indicates that the actual
*         value was not equal to the expected value.
*/
protected final boolean compareAndSetState(int expect, int update) {
// See below for intrinsics setup to support this
return unsafe.compareAndSwapInt(this, stateOffset, expect, update);
}
```

```java
public final void acquire(int arg) {
if (!tryAcquire(arg) &&
acquireQueued(addWaiter(Node.EXCLUSIVE), arg))
selfInterrupt();
}
public final boolean release(int arg) {
if (tryRelease(arg)) {
Node h = head;
if (h != null && h.waitStatus != 0)
unparkSuccessor(h);
return true;
}
return false;
}
```

```java
private Node enq(final Node node) {
for (;;) {
Node t = tail;
if (t == null) { // Must initialize
if (compareAndSetHead(new Node()))
tail = head;
} else {
node.prev = t;
if (compareAndSetTail(t, node)) {
t.next = node;
return t;
}
}
}
}
```

## Source Notes

- Topic: JUC
- [Original source](https://zhuanlan.zhihu.com/p/675938211)
- Original publication date: 2024-01-03
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
