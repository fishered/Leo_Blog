---
title: "Boundary Governance in Firefly"
description: "Firefly uses declarative Admin RBAC, an independent wire contract, bounded backpressure, JDBC fencing, plugin API levels, and controlled resharding to contain scheduling risk at explicit boundaries."
lang: en
translationKey: "firefly-boundary-governance"
published: 2026-07-31
slug: firefly-boundary-governance
tags:
  - "Scheduling"
  - "Distributed Systems"
  - "Java"
draft: false
featured: false
source:
  platform: GitHub
  url: https://github.com/fishered/Firefly/tree/v1.0.2
  published: 2026-07-31
---

> Summary: Firefly does more than trigger work on time. It must control who can change scheduling state, how different versions communicate, where pressure stops when the database slows down, whether an expired owner can still write, and how shard mappings change safely. Explicit control-plane, data-plane, and state-plane boundaries give those risks stable entry points, failure outcomes, and recovery paths.

## Scheduler risk begins when boundaries lose control

A scheduler's happy path is simple: calculate a fire time, locate an Executor, run a handler, and persist the result. Production failures usually begin between those steps. An Admin route change can alter access, a domain-object edit can break wire compatibility, database latency can block a Netty EventLoop, an expired Executor can commit after claim takeover, or old and new Scheduler nodes can calculate ownership with different shard counts.

Successful task completion does not prove these boundaries are safe. Firefly separates them into three responsibilities: the control plane decides who may change state, the data plane constrains how messages and pressure propagate, and the state plane proves who still owns a write.

| Capability | Design reason | Risk contained |
|---|---|---|
| Declarative Admin RBAC | Route registration and authorization share one source | Privilege drift, missing policy, and UI-only authorization |
| Independent Netty wire contract | Network protocol does not depend on domain-object shape | JDK serialization risk, uncontrolled field evolution, and rolling-upgrade incompatibility |
| Bounded result-persistence backpressure | JDBC is isolated from EventLoops and all waiting is finite | I/O-thread blocking, unbounded accumulation, and silent loss |
| JDBC generation fencing | Shared database facts prove cross-process ownership | Stale-owner commits, repeated side effects, and state regression |
| Plugin API level | SPI compatibility is checked before startup | Partially started plugin sets and product-version guesswork |
| Controlled shard expansion | One control-plane mapping remains authoritative | Mixed mappings, duplicate triggers, and invalid leases |

![Control-plane, data-plane, and state-plane boundaries in Firefly](./assets/diagrams/01-explicit-boundaries.svg)

Figure 1: Admin policy, the Netty wire contract, and JDBC fencing protect separate boundaries. Scheduler core receives inputs only after those boundary checks succeed.

## 1. Declarative Admin RBAC keeps permissions with routes

Firefly Admin API is the scheduling control plane. Creating jobs, triggering work, cancelling executions, replaying Outbox records, and managing users carry different risk, so access cannot be inferred by a distant function that guesses from path prefixes and suffixes.

Each route group receives an `AdminRoutePolicy` during registration, declaring `READER`, `OPERATOR`, `ADMIN`, or anonymous access at the route boundary. Runtime responsibilities remain explicit:

| Component | Responsibility |
|---|---|
| `AdminHttpPlugin` | dependency assembly, startup, shutdown |
| `AdminHttpRouter` | request-target and route matching |
| `AdminRouteRegistration` | controller and policy binding |
| `AdminAuthorizationService` | identity resolution and role decisions |
| `AdminRequestReader` | body, JSON, pagination, and batch limits |
| `Admin*Controller` | job, execution, cluster, and authentication operations |

The authorization service only consumes a matched policy; it does not know business strings such as `/api/users` or `/trigger`. Adding a route requires registering its Controller and access role together, while URL changes cannot bypass a hidden path rule elsewhere.

Admin HTTP still uses JDK `HttpServer`. Router, Policy, and Controller define responsibilities without bringing a large web runtime into scheduler core. The result remains lightweight while keeping framework lifecycle outside scheduling semantics.

Input capacity is part of the same security boundary. Body size, page size, and batch count are validated before a Controller allocates objects or calls JDBC. This prevents one authorized but oversized request from exhausting memory or database capacity. Hidden UI buttons are never authorization; server-side policies and limits are the real control-plane defense.

## 2. An independent wire contract prevents domain drift from becoming protocol drift

Java `record` is useful for immutable messages, but it defines an in-process shape, not a cross-version protocol. JDK native serialization imports class names, `serialVersionUID`, JVM object graphs, and deserialization risk. Passing a domain record directly to Jackson avoids native serialization but still lets domain refactoring become an accidental protocol change.

Firefly defines the on-wire contract in a separate `transports/netty-protocol` module:

```text
domain message
    -> NettyExecutorWireMessage
    -> Jackson JSON codec
    -> newline-delimited frame
```

The wire record has a deliberately small shape: `messageId`, `type`, and a string payload map. Gateway and Executor Client share the protocol module, while connection management, routing, and dispatch stay in `transports/netty`. Protocol models, codecs, and runtime behavior can therefore evolve and be tested independently.

Choosing Jackson does not make JSON automatically compatible. The protocol still needs rules for missing fields on older peers, unknown message types, and whether negotiated capabilities permit `CANCEL_JOB`. A serializer translates between objects and bytes. Protocol design assigns version semantics. Those are separate responsibilities.

## 3. Bounded persistence backpressure contains database disruption in the data plane

Gateway persists ACKs and execution results. Running JDBC on a Netty EventLoop lets a database disruption stall unrelated connections. Sending everything to an unbounded queue converts database latency into heap growth. Failing immediately under `AbortPolicy` can amplify a short transient outage.

Firefly uses `NettyResultPersistenceExecutor`: one bounded worker queue, one bounded retry area, and one scheduler thread used only for delay. A saturated worker retries after a finite interval. Exhausted retry slots or attempts enter an explicit final-rejection path. EventLoop threads never wait for that process.

![Bounded retry and backpressure for Firefly result persistence](./assets/diagrams/02-bounded-result-persistence.svg)

Figure 2: `ACCEPTED`, `RETRYING`, and `REJECTED` are observable submission outcomes. Low-watermark recovery, shutdown, and exhaustion all have deterministic exits.

This capability absorbs transient database pressure but does not impersonate a durable broker. A process crash can still lose an in-memory retry. Outbox owns dispatch recovery; a second failure registry does not exist until record identity, deduplication, replay ownership, retention, and cleanup are defined. That separation prevents one failure from entering multiple recovery systems with no authoritative replay path.

## 4. JDBC generation fencing rejects stale-owner writes

Business idempotency often follows `tryAcquire -> execute -> markCompleted`. If a claim expires and a new instance takes it over, the old instance can recover later and try to commit a completion it no longer owns. `ReentrantLock`, `Semaphore`, and JVM-local CAS cannot solve this because two Executor processes do not share JUC state.

`JdbcBusinessIdempotencyStore` expresses acquire, complete, and release as a state machine. `JdbcIdempotencyClaimDao` owns conditional updates, while `JdbcTransactionTemplate` owns transaction boundaries. SQL remains in the DAO because the database is the shared source of truth for cross-process claims.

Claim correctness depends on four properties:

1. Database time decides expiry, so node clock drift does not decide ownership.
2. The record is locked in a transaction to serialize takeover decisions.
3. Each takeover increments a generation. The table's `attempt` stores it, and `claim_token` encodes the same generation.
4. `markCompleted` and `release` match the key, state, and claim token together.

That last condition is fencing. An old owner may still possess its token, but it cannot update a claim whose token changed with the newer generation. The extra predicates are not ornamental SQL; they are proof of cross-process ownership.

One boundary remains unavoidable. If a business side effect commits and the process crashes before its completion marker commits, the scheduler cannot manufacture atomicity. A handler still needs a business unique key, same-database transaction, or naturally repeatable operation to achieve effectively-once behavior. Absolute exactly-once is not promised.

## 5. Plugin API levels make extension compatibility a startup precondition

A plugin is compatible when its SPI contract matches the host, not when product-version strings are numerically close. `FireflyPlugin.compatibility()` returns the supported Plugin API-level range. The current level is `1`, and older plugins that do not override the method inherit a level-1 declaration.

The host validates every enabled plugin before starting any plugin. One incompatible extension stops the node before it joins instead of producing a partially active set after earlier plugins have started. API level advances only for a breaking binary or behavioral SPI change, making it a more stable compatibility unit than product version.

Compatibility is also verified through executable evidence. `compatibility/spring-boot-consumer` builds real consumers against Spring Boot 3.3, 3.4, 3.5, and 4.0. Plugin API levels protect the extension SPI, while the consumer matrix protects the Starter ecosystem; together they catch runtime and build-time incompatibility at different boundaries.

## 6. Controlled shard expansion keeps one mapping authoritative

Changing shard count from 32 to 64 changes the `jobId -> shardId` mapping. If an old Scheduler computes with 32 while a new Scheduler computes with 64, the same job can appear in two ownership systems. Without dual-version routing and a migration epoch, calling this zero-downtime for every role hides a duplicate-trigger risk.

Firefly defines this capability as controlled online expansion:

- Shard count can only increase; contraction requires a full outage.
- Scheduler, Standby, and API nodes must drain and stop.
- Data-plane-only Gateway and Executor nodes may keep their connections.
- The operation rejects active executions and unfinished Outbox records.
- A migration lock and one transaction cover job-shard recomputation, metadata revision, and old-lease removal.

![Operational sequence for controlled Firefly shard expansion](./assets/diagrams/03-controlled-reshard.svg)

Figure 3: “Online” means the data plane may remain online, not that the control plane is unaware. A failure rolls back the database transaction. Control-plane nodes remain stopped and use the actual database shard count to choose retry or restoration.

This boundary gives operators verifiable prerequisites and a rollback point. Fully online resharding would require dual routing, migration epochs, durable progress, a read/write compatibility window, and retirement of the old mapping. Until those capabilities exist, briefly stopping the control plane is safer than allowing two mappings to create executions concurrently.

## How the six capabilities form one defense

The capabilities act at different failure stages but share the same boundary principles:

1. **Rules stay with their entry points.** Route registration carries access, the wire module carries protocol, and DAO predicates carry ownership proof.
2. **Cross-process state uses shared facts.** JUC constrains threads; database time, leases, generations, and fencing constrain nodes.
3. **Every wait is finite.** Queue size, retries, delay, shutdown, and final rejection are observable.
4. **Compatibility units evolve independently.** Product version, Plugin API level, wire protocol version, and database schema version are separate contracts.
5. **Every failure has one recovery owner.** In-memory retry handles transient pressure, Outbox handles dispatch recovery, and maintenance transactions handle mapping changes.

## Conclusion

The value of Firefly boundary governance is not structural complexity. It is identifying and containing risk before it reaches core scheduling semantics: permissions travel with route registration, wire models remain separate from domain models, bounded backpressure avoids EventLoop blocking, database generations reject stale owners, plugins are checked by API level, and shard expansion preserves one control-plane mapping.

These changes do not remove distributed-system failure. They make failure happen at defined points and leave outcomes that can be tested, observed, and recovered.

## Further reading

- [Firefly source snapshot used by this article](https://github.com/fishered/Firefly/tree/v1.0.2)
- [Related release notes](https://fishered.github.io/firefly-home/en/releases/v1.0.2)
- [AdminRoutePolicy](https://github.com/fishered/Firefly/blob/v1.0.2/apis/admin-http/src/main/java/com/firefly/api/admin/http/routing/AdminRoutePolicy.java)
- [NettyResultPersistenceExecutor](https://github.com/fishered/Firefly/blob/v1.0.2/transports/netty/src/main/java/com/firefly/executor/netty/NettyResultPersistenceExecutor.java)
- [JdbcReshardTool](https://github.com/fishered/Firefly/blob/v1.0.2/stores/jdbc/src/main/java/com/firefly/store/jdbc/JdbcReshardTool.java)
