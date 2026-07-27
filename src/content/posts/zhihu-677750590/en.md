---
title: "Dissecting the Principles of AQS"
description: "A deeper AQS article about the CLH-style queue, acquisition templates, state transitions, shared and exclusive modes, and synchronizer internals."
lang: en
translationKey: "zhihu-677750590"
published: 2024-01-17
slug: zhihu-677750590
tags:
  - "JUC"
draft: false
featured: false
source:
  platform: Zhihu
  url: https://zhuanlan.zhihu.com/p/677750590
  published: 2024-01-17
---

> Summary: The article dives into AQS queue mechanics and explains how synchronizers coordinate contention, waiting, and wake-up.

## Intended Reader

Java developers reading JUC source code or implementing advanced synchronization behavior.

## Why This Matters

Java concurrency is where language semantics, JVM memory visibility, OS scheduling, and data-structure design meet. Small misunderstandings often become production-only bugs.

AQS is a queue plus a state machine. Once you understand the queue and state transitions, locks and synchronizers become much easier to analyze.

## Mental Model

Think in terms of state ownership, visibility, ordering, blocking, and wake-up semantics. APIs such as AQS, CAS, LockSupport, volatile, and ThreadLocal are tools for shaping those guarantees.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Read the AQS queue as a CLH-style waiting structure that orders contending threads.
- Follow exclusive acquisition from fast-path CAS to enqueue, park, and retry.
- Follow shared acquisition and propagation because it differs from exclusive ownership.
- Treat template methods as the subclass boundary where synchronizer semantics are defined.

## Pitfalls and Tradeoffs

- AQS hides much of the hard queue management but requires precise state semantics from subclasses.
- Fair and non-fair modes change contention behavior and throughput.
- Understanding cancellation and interruption is essential for production-grade synchronizers.

## Verification Checklist

- Trace a contended acquisition with at least three threads.
- Test release and wake-up behavior under cancellation.
- Prefer proven JUC synchronizers unless a custom one is clearly justified.

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

## Selected Technical Snippets

The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.

```text
Wait queue node class.
The wait queue is a variant of a "CLH" (Craig, Landin, and Hagersten) lock queue. CLH locks are normally used for spinlocks. We instead use them for blocking synchronizers, but use the same basic tactic of holding some of the control information about a thread in the predecessor of its node. A "status" field in each node keeps track of whether a thread should block. A node is signalled when its predecessor releases. Each node of the queue otherwise serves as a specific-notification-style monitor holding a single waiting thread. The status field does NOT control whether threads are granted locks etc though. A thread may try to acquire if it is first in the queue. But being first does not guarantee success; it only gives the right to contend. So the currently released contender thread may need to rewait.
To enqueue into a CLH lock, you atomically splice it in as new tail. To dequeue, you just set the head field.
+------+  prev +-----+       +-----+
head |      | <---- |     | <---- |     |  tail
+------+       +-----+       +-----+

Insertion into a CLH queue requires only a single atomic operation on "tail", so there is a simple atomic point of demarcation from unqueued to queued. Similarly, dequeuing involves only updating the "head". However, it takes a bit more work for nodes to determine who their successors are, in part to deal with possible cancellation due to timeouts and interrupts.
The "prev" links (not used in original CLH locks), are mainly needed to handle cancellation. If a node is cancelled, its successor is (normally) relinked to a non-cancelled predecessor. For explanation of similar mechanics in the case of spin locks, see the papers by Scott and Scherer at http://www.cs.rochester.edu/u/scott/synchronization/
We also use "next" links to implement blocking mechanics. The thread id for each node is kept in its own node, so a predecessor signals the next node to wake up by traversing next link to determine which thread it is. Determination of successor must avoid races with newly queued nodes to set the "next" fields of their predecessors. This is solved when necessary by checking backwards from the atomically updated "tail" when a node's successor appears to be null. (Or, said differently, the next-links are an optimization so that we don't usually need a backward scan.)
Cancellation introduces some conservatism to the basic algorithms. Since we must poll for cancellation of other nodes, we can miss noticing whether a cancelled node is ahead or behind us. This is dealt with by always unparking successors upon cancellation, allowing them to stabilize on a new predecessor, unless we can identify an uncancelled predecessor who will carry this responsibility.
CLH queues need a dummy header node to get started. But we don't create them on construction, because it would be wasted effort if there is never contention. Instead, the node is constructed and head and tail pointers are set upon first contention.
Threads waiting on Conditions use the same nodes, but use an additional link. Conditions only need to link nodes in simple (non-concurrent) linked queues because they are only accessed when exclusively held. Upon await, a node is inserted into a condition queue. Upon signal, the node is transferred to the main queue. A special value of status field is used to mark which queue a node is on.
Thanks go to Dave Dice, Mark Moir, Victor Luchangco, Bill Scherer and Michael Scott, along with members of JSR-166 expert group, for helpful ideas, discussions, and critiques on the design of this class.
```

```java
/**
* Head of the wait queue, lazily initialized.  Except for
* initialization, it is modified only via method setHead.  Note:
* If head exists, its waitStatus is guaranteed not to be
* CANCELLED.
*/
private transient volatile Node head;

/**
* Tail of the wait queue, lazily initialized.  Modified only via
* method enq to add new wait node.
*/
private transient volatile Node tail;

/**
* The synchronization state.
*/
private volatile int state;

/**
* Returns the current value of synchronization state.
* This operation has memory semantics of a {@code volatile} read.
* @return current state value
*/
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
/**
* The current owner of exclusive mode synchronization.
*/
private transient Thread exclusiveOwnerThread;
```

## Source Notes

- Topic: JUC
- [Original source](https://zhuanlan.zhihu.com/p/677750590)
- Original publication date: 2024-01-17
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
