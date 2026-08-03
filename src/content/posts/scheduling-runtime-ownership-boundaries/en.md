---
title: "Designing Runtime Ownership in Scheduling Systems: Execution, Outbox, and Shutdown Boundaries"
description: "Three concrete scheduling tasks reveal when runtime ownership, transactional cancellation, strict inputs, and bounded shutdown are necessary."
lang: en
translationKey: scheduling-runtime-ownership-boundaries
published: 2026-08-02
slug: scheduling-runtime-ownership-boundaries
tags:
  - "Scheduling"
  - "Distributed Systems"
  - "Java"
  - "Reliability"
  - "Architecture"
series: "Architecture Notes"
draft: false
featured: true
source:
  platform: GitHub
  url: https://github.com/fishered/Firefly
---

# Designing Runtime Ownership in Scheduling Systems: Execution, Outbox, and Shutdown Boundaries

> Summary: Not every scheduler needs executions, an Outbox, or remote acknowledgements. The deciding factor is the business cost of a missed run, duplicate execution, or a stale node continuing to dispatch work. This article starts with three concrete tasks, uses a cancellation after a lost ACK to expose the ownership problem, and then shows how Firefly introduces the resulting boundaries incrementally.

## Start with what happens when three real tasks fail

Persistent execution records, an Outbox, and leases are justified by failure cost, not by architecture labels.

### Local cache cleanup: one missed run is acceptable

An application clears its local cache every ten minutes. The timer and task share one process, and a restart removes the cache anyway. If one run is missed, the next run can continue the cleanup. The actual requirements are preventing concurrent runs in that process and stopping new work during shutdown. An execution table and durable dispatch queue would usually cost more than they provide.

### Remote reconciliation: duplicate execution can cause business loss

At midnight, a scheduler tells a Worker to reconcile one merchant's accounts. The Worker receives the job and starts processing, but its ACK is lost in transit. If the scheduler interprets “no ACK” as “not executed” and retries blindly, the merchant may be processed twice. The system must persist which run this is, whether dispatch has been attempted, and whether retry is currently allowed. The Worker must also use the execution ID as an idempotency key.

### HA takeover: a stale node can dispatch after releasing its lease

Node A owns a partition lease and reads a batch of due jobs. Shutdown starts and A releases the lease, allowing node B to take over. If A's worker thread ignores interruption, it may still dispatch the jobs it already read, so A and B both send them. A lease table alone is insufficient. Shutdown must stop admission, wait for in-flight work, and only then release ownership. Stronger consistency may also require a fencing token that rejects writes from stale lease holders.

| Task | Acceptable failure | Unacceptable failure | Minimum design |
| --- | --- | --- | --- |
| Local cache cleanup | Occasionally miss one run | Unbounded overlap inside one process | Local exclusion, idempotency, and awaitable worker shutdown |
| Remote merchant reconciliation | Wait or require review after a delayed ACK | Process the same merchant twice through blind retry | Persistent execution, reliable dispatch, Worker idempotency, and transactional cancellation/timeout |
| HA partition scheduling | Brief takeover delay | Old and new nodes dispatch concurrently | Lease, stop-before-release ordering, timeout signal, and fencing where required |

This article focuses on the latter two tasks because their correctness depends on state that crosses process boundaries, not merely on whether a timer fires on schedule.

## Dissect ownership through cancellation after a lost ACK

Assume a remote reconciliation run has execution ID `exec-2048`. The following events can occur within a few seconds:

| Time | Event | Fact the system must preserve |
| --- | --- | --- |
| 00:00.000 | The schedule becomes due | Advancing the cursor, creating `exec-2048`, and recording dispatch intent must be one commit; otherwise the cursor can move without leaving work to send |
| 00:00.120 | The Worker receives the job, but the ACK is lost | The scheduler knows only “not acknowledged”; it cannot conclude that execution never started, and any retry must reuse the same idempotency identity |
| 00:05.000 | An operator cancels the job | The execution, targets, and unfinished dispatch records must become non-runnable together; changing only the execution shown in the UI is insufficient |
| 00:05.010 | The Outbox retry scan attempts to claim work | The scanner must not claim cancelled dispatch; cancellation and claim need a database predicate or lock that selects one winner |
| 00:08.000 | The original Worker reports a late result | The terminal-state policy must be explicit: retain `CANCELLED` and record the late result, or allow a specific transition; the last request to arrive must not overwrite terminal state arbitrarily |

Suppose Admin cancellation calls the Execution Repository first and the Outbox Repository second. If the second call fails, the database contains `execution=CANCELLED` and `outbox=RETRYABLE`. The UI tells the operator that cancellation succeeded while the background worker dispatches the job again. Cancelling only the Outbox has the opposite failure mode: an execution may remain `RUNNING` forever. The fix is not another repository. It is one lifecycle entry point that owns cancellation semantics and one database transaction spanning execution, targets, and dispatch.

Input errors enter the same state chain. Consider an enablement endpoint receiving:

```json
{"enabled":"treu"}
```

If the request layer first converts every value to a string and then calls `Boolean.parseBoolean`, this typo becomes a valid `false` and disables the job. A controlled API preserves the JSON type, rejects the request record with HTTP 400, and identifies `enabled` as requiring a boolean. Batch cancellation IDs should likewise bind directly to `List<String>` rather than being joined and split on commas.

This timeline yields component boundaries directly, without designing a class diagram first:

| Business operation | Changes that must be atomic or mutually exclusive | Responsibility of the single entry point |
| --- | --- | --- |
| Trigger work | Cursor, execution, dispatch intent | Advance and enqueue atomically; roll everything back on failure |
| Cancel or expire | Execution, targets, pending dispatch | Lock current state and converge it in one transaction |
| Retry dispatch | Claim, retry, dead, requeue | Enforce an explicit Outbox state machine with conditional updates |
| Receive ACK/result | Protocol fields, current execution state, terminal-state policy | Validate the typed frame, then perform only an allowed transition |
| Shut down a node | Admission, in-flight workers, lease | Stop new work, wait with a bound, then release ownership |

## What clear boundaries buy you

The goal is not a cleaner class diagram. These boundaries change failure behavior directly:

- **State consistency**: cancellation and timeout no longer depend on repository call order; cross-table changes commit or roll back together.
- **Visible failures**: malformed booleans, missing fields, and unsupported capabilities fail immediately instead of masquerading as successful state changes.
- **Discoverable capabilities**: consumers depend on narrow contracts such as `JobCatalog` or `DispatchOutboxStore`, making required store behavior visible in the type system.
- **Upgrade compatibility**: typed frames and a schema envelope let old and new messages or snapshots coexist behind an explicit compatibility boundary.
- **Operational diagnosis**: shutdown has a fixed await limit and a timeout warning, so node-offline transitions no longer confuse an interruption request with proven task termination.

Together, these properties move concurrency and failure handling from caller discipline into enforceable system boundaries.

The rest of the article uses Firefly's incremental refactoring to show how these scenario-derived boundaries can be introduced into an existing codebase. Its class and interface names are implementation choices, not a component checklist every scheduler must copy.

## One entry point coordinates Execution and Outbox

![Execution and Outbox lifecycle boundary](assets/diagrams/01-execution-outbox-lifecycle.svg)

Caption: The lifecycle service provides one call boundary, while a JDBC transaction updates execution, targets, and dispatch outbox together. Compatibility calls can still adapt through the Execution Repository.

`ExecutionLifecycleService` is the application entry point. It can use the new `ExecutionLifecycleStore` or wrap a compatible `ExecutionRepository`:

```java
public boolean cancel(String executionId, Instant cancelledAt, String reason) {
    return lifecycleStore != null
            ? lifecycleStore.cancel(executionId, cancelledAt, reason)
            : executions.cancelExecution(executionId, cancelledAt, reason);
}
```

`JdbcExecutionLifecycleStore` is currently a thin adapter. `JdbcExecutionRepository` still performs the transaction: lock the execution, update `firefly_execution`, `firefly_execution_target`, and `firefly_dispatch_outbox`, then commit. Any SQL or runtime failure rolls the transaction back. Timeout expiry converges the same three state groups in one transaction as well.

This resolves orchestration and atomicity without pretending the lower-level DAO split is complete. Admin no longer coordinates two repositories itself, and maintenance paths can reuse the same lifecycle semantics.

## Make store capabilities explicit before removing the facade

`JobRepository` historically combined catalog operations, cursor advancement, Outbox handling, and execution retry. Default methods returning empty collections or `false` allowed incomplete stores to compile and silently lose behavior at runtime.

The capability split can be expressed through four interfaces:

- `JobCatalog` for job definition persistence, lookup, enablement, and deletion.
- `SchedulingStore` for due-job queries, cursor updates, and atomic `advanceAndEnqueue`.
- `DispatchOutboxStore` for claim, ACK, retry, completion, and cancellation.
- `ExecutionRetryStore` for manual dispatch and execution retry scheduling.

`JdbcJobRepository` explicitly implements all four. The compatible `JobRepository` still exists. Most unsupported Outbox methods now throw `UnsupportedOperationException`, but compatibility defaults such as `advanceAndEnqueue` have not all disappeared. This establishes a capability migration path; it does not claim that the broad interface is already gone.

## Preserve JSON types for critical Admin writes

Admin continues to use JDK `HttpServer` and Jackson. No web framework was added. Three high-risk writes now bind directly to records:

- `BatchCancelRequest`
- `BatchRequeueRequest`
- `SetJobEnabledRequest`

Jackson rejects unknown properties for these records and refuses string-to-boolean coercion. Arrays bind directly to `List<String>`, so the following remains two IDs rather than being split on the embedded comma:

```json
{
  "executionIds": ["tenant,blue", "tenant-red"],
  "reason": "operator request"
}
```

```text
{"enabled": true}   -> accepted
{"enabled": "treu"} -> 400
```

The generic `AdminRequestReader.object()` still turns scalar values into strings and serializes arrays or nested objects back into JSON text for compatible routes. The precise claim is therefore that critical writes are typed, not that the entire Admin API now has request records.

## Shutdown now waits, but the wait is bounded

![Bounded worker shutdown sequence](assets/diagrams/02-worker-shutdown.svg)

Caption: The coordinator closes new reconcile admission, executors receive interruption and wait for up to five seconds, and the release callback runs after either termination or timeout.

`shutdownNow()` requests interruption; it does not prove a task has exited. `ManagedWorker` centralizes this sequence:

```java
executor.shutdownNow();
stopped = executor.awaitTermination(timeout.toMillis(), TimeUnit.MILLISECONDS);
// timeout -> warning
releaseOwnership.run(); // also runs after timeout or interruption
```

Scheduler, Dispatch Outbox Worker, Execution Maintenance Worker, Node Drain Monitor, and the node coordinator use this utility. The coordinator also sets `accepting` to `false` when `close()` begins, blocking new reconcile entry. It releases current leases and marks the node offline after the await phase.

There is an important operational boundary: the await limit is five seconds and `releaseOwnership` runs in `finally`. If a task ignores interruption and exceeds the limit, Firefly logs a warning and still runs the release callback. This materially narrows the old race, but it does not prove that every old task has terminated. Operators should treat the timeout warning as a fault signal.

## Netty typing begins with body validation

`NettyExecutorMessage` remains the compatible envelope and its payload is still `Map<String, String>`. The protocol module adds:

- `RegisterExecutorFrame`
- `AckJobFrame`
- `ReportResultFrame`
- `NettyExecutorFrameMapper`

The Gateway Handler invokes the mapper before entering Register, ACK, or Result branches. Missing required fields now fail before business state transitions, moving protocol validation out of scattered Map reads and into unit-testable message models.

The case study does not yet extract the business responsibilities from `NettyExecutorGatewayHandler`, nor does it implement a protocol-version upcaster registry. The immediate gain is validation and a model boundary; command handlers and version mappers remain future refactoring work.

## Version the envelope before replacing the payload

New Outbox snapshots use this shape:

```json
{"schemaVersion":1,"payload":"<base64url>"}
```

`schemaVersion` selects the decode path, while historical v0 Map strings remain readable. The inner payload is the legacy Map encoding represented as Base64URL. This first solves the decoder-selection problem without making queued historical Outbox rows unreadable during an upgrade.

The decoder now treats `enabled`, `retryOnFailure`, and `retryOnTimeout` as strict booleans. Missing or invalid values throw instead of silently becoming `false`.

This is not yet a complete `DispatchSnapshotV1` JSON record. The inner fields still depend on the existing Map and the envelope is not modeled as a general Jackson DTO. Safely adding future required fields will still benefit from a versioned payload schema and historical fixtures.

## Configuration errors fail during startup

All server boolean options now reuse `OptionSpec.strictBoolean`, so `firefly.security.jwt.enabled=treu` fails startup. `OptionSchema` initially registers core JWT settings and rejects unknown names below `firefly.security.jwt.*`; JWT client entries, client lists, and plugin configuration remain extension spaces.

This is also incremental. Strict boolean parsing applies to the common boolean option path, but the full Option Schema registry currently covers the core JWT namespace rather than every Server option.

## Verification and known boundaries

The case-study code is verified with strict Admin booleans and comma-containing IDs, JDBC cancellation transactions, v0/v1 snapshot reads, Scheduler shutdown waiting, Netty frame mapping, and startup failure for malformed JWT settings.

Recovery from a failed MySQL initialization migration is outside this runtime-boundary design. It has no migration journal or real-MySQL test that injects failure after DDL and reruns initialization; database initialization needs a separate recovery protocol.

## Closing perspective

The value of this design is not the number of new classes. It moves several high-risk paths from shared, implicit ownership toward explicit entry points, transactions, and validation. It is equally important to acknowledge what remains: a broad `JobRepository`, a centralized Netty Handler, a Map snapshot payload, and bounded rather than absolute shutdown guarantees.

Reliability improvements do not have to begin with a rewrite. Make failures explicit, keep state transitions atomic, and let interfaces declare their real capabilities; the system becomes easier to verify and easier to evolve.
