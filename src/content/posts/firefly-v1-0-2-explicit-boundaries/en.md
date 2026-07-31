---
title: "From Conditionals to Contracts: Boundary Governance in Firefly v1.0.2"
description: "A design review of declarative Admin RBAC, Jackson wire models, bounded persistence retries, cross-process JDBC fencing, plugin API levels, and controlled resharding in Firefly v1.0.2."
lang: en
translationKey: "firefly-v1-0-2-explicit-boundaries"
published: 2026-07-31
slug: firefly-v1-0-2-explicit-boundaries
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

> Summary: The most dangerous rule in a distributed system is often not an unimplemented one. It is an implemented rule with no name: permissions buried in path checks, a protocol equated with a Java object, retries reduced to another executor submission, or cross-process ownership represented by one token string. Firefly v1.0.2 turns those implicit rules into contracts that can be tested, migrated, and operated.

## This is not a refactor measured by class count

A scheduler spans a control plane, data plane, and state plane. Admin API changes jobs and cluster state. Netty Gateway owns high-frequency, long-lived connections. JDBC stores runtime cursors, executions, Outbox records, leases, and business-idempotency claims. A boundary expressed as a local conditional in one layer creates invisible coupling in another.

Path-prefix authorization can work until a route rename silently changes access. Serializing a domain record directly can seem efficient until a Java constructor change becomes a wire incompatibility. A JVM lock around a database update cannot stop a different Executor process from committing an obsolete claim.

The useful measure for v1.0.2 is therefore not how many components were introduced. It is whether each critical rule has an explicit owner, input, failure result, and test location.

![Control-plane, data-plane, and state-plane boundaries in Firefly v1.0.2](./assets/diagrams/01-explicit-boundaries.svg)

Figure 1: Admin policy, the Netty wire contract, and JDBC fencing protect separate boundaries. Scheduler core receives inputs only after those boundary checks succeed.

## 1. Admin permissions belong to routes, not path guesses

A common authorization function checks the HTTP method and then infers the required role from path prefixes or suffixes. The code is not automatically broken, but route declarations and security rules now live in separate locations. Someone adding a `/cancel` endpoint may not discover the authorization branch, and someone reorganizing URLs can unintentionally change access.

Firefly v1.0.2 separates Admin HTTP responsibilities:

| Component | Responsibility |
|---|---|
| `AdminHttpPlugin` | dependency assembly, startup, shutdown |
| `AdminHttpRouter` | request-target and route matching |
| `AdminRouteRegistration` | controller and policy binding |
| `AdminAuthorizationService` | identity resolution and role decisions |
| `AdminRequestReader` | body, JSON, pagination, and batch limits |
| `Admin*Controller` | job, execution, cluster, and authentication operations |

`AdminRoutePolicy` is the important abstraction because it moves the security declaration next to route registration. `READER`, `OPERATOR`, `ADMIN`, and anonymous access become independently testable policies. The authorization service consumes a matched policy and does not know business strings such as `/api/users` or `/trigger`.

The implementation still uses JDK `HttpServer`. Router, Policy, and Controller are internal boundaries; layering does not require Spring MVC or WebFlux. For a lightweight scheduler center, keeping the runtime small also reduces dependency upgrades, startup cost, and attack surface.

Input capacity is part of the same security boundary. Body size, page size, and batch count must be validated before a Controller allocates objects or calls JDBC. A client does not need to bypass RBAC if one authorized request can exhaust memory or database capacity. Hidden UI buttons are never authorization; server-side policies and limits are.

## 2. A Java record is not a wire contract

Java `record` is useful for immutable messages, but it defines an in-process shape, not a cross-version protocol. JDK native serialization imports class names, `serialVersionUID`, JVM object graphs, and deserialization risk. Passing a domain record directly to Jackson avoids native serialization but still lets domain refactoring become an accidental protocol change.

Firefly moves the contract into a separate `transports/netty-protocol` module:

```text
domain message
    -> NettyExecutorWireMessage
    -> Jackson JSON codec
    -> newline-delimited frame
```

The wire record has a deliberately small shape: `messageId`, `type`, and a string payload map. Gateway and Executor Client share the protocol module, while connection management, routing, and dispatch stay in `transports/netty`. Publication coordinates, dependency direction, and compatibility tests now have an explicit home.

Choosing Jackson does not make JSON automatically compatible. The protocol still needs rules for missing fields on older peers, unknown message types, and whether negotiated capabilities permit `CANCEL_JOB`. A serializer translates between objects and bytes. Protocol design assigns version semantics. Those are separate responsibilities.

## 3. Bounded retry must not hide rejection

Gateway persists ACKs and execution results. Running JDBC on a Netty EventLoop lets a database disruption stall unrelated connections. Sending everything to an unbounded queue converts database latency into heap growth. Failing immediately under `AbortPolicy` can amplify a short transient outage.

v1.0.2 adds `NettyResultPersistenceExecutor`: one bounded worker queue, one bounded retry area, and one scheduler thread used only for delay. A saturated worker retries after a finite interval. When retry slots or maximum attempts are exhausted, an explicit final-rejection callback runs. EventLoop threads never wait for that process.

![Bounded retry and backpressure for Firefly result persistence](./assets/diagrams/02-bounded-result-persistence.svg)

Figure 2: `ACCEPTED`, `RETRYING`, and `REJECTED` are observable submission outcomes. Low-watermark recovery, shutdown, and exhaustion all have deterministic exits.

This resembles queue-oriented retry behavior but is not a new durable message broker. A process crash can still lose an in-memory retry. The component absorbs transient pressure; it does not claim durable delivery. Firefly's Outbox already owns dispatch durability. A second “failure registry” should not exist until its record identity, deduplication key, replay owner, retention, and cleanup lifecycle are defined.

## 4. JUC coordinates threads, not another machine

Business idempotency often follows `tryAcquire -> execute -> markCompleted`. If a claim expires and a new instance takes it over, the old instance can recover later and try to commit a completion it no longer owns. `ReentrantLock`, `Semaphore`, and JVM-local CAS cannot solve this because two Executor processes do not share JUC state.

v1.0.2 separates `JdbcBusinessIdempotencyStore` into a state machine, `JdbcIdempotencyClaimDao`, and `JdbcTransactionTemplate`. SQL does not disappear; it moves into the DAO that owns persistent conditional updates. Transaction boundaries no longer compete with business-state decisions inside one large method.

Claim correctness depends on four properties:

1. Database time decides expiry, so node clock drift does not decide ownership.
2. The record is locked in a transaction to serialize takeover decisions.
3. Each takeover increments a generation. The table's `attempt` stores it, and `claim_token` encodes the same generation.
4. `markCompleted` and `release` match the key, state, and claim token together.

That last condition is fencing. An old owner may still possess its token, but it cannot update a claim whose token changed with the newer generation. The extra predicates are not ornamental SQL; they are proof of cross-process ownership.

One boundary remains unavoidable. If a business side effect commits and the process crashes before its completion marker commits, the scheduler cannot manufacture atomicity. A handler still needs a business unique key, same-database transaction, or naturally repeatable operation to achieve effectively-once behavior. Absolute exactly-once is not promised.

## 5. Plugin compatibility is not product-version ordering

A plugin is compatible when its SPI contract matches the host, not when `1.0.2` is numerically close to `1.0.1`. Firefly adds a default `compatibility()` method to `FireflyPlugin`, returning a supported Plugin API-level range. The current level remains `1`, so older 1.x plugins inherit level-1 compatibility and do not require recompilation for a patch release.

The host validates every enabled plugin before starting any plugin. One incompatible extension stops the node before it joins instead of producing a partially active set after earlier plugins have started. API level advances only for a breaking binary or behavioral SPI change, making it a more stable compatibility unit than product version.

The same evidence-based rule applies to cleanup. The unused `admin-model` and non-executable process-fault benchmark scaffold were removed. `compatibility/spring-boot-consumer` remains because CI builds real consumers against Spring Boot 3.3, 3.4, 3.5, and 4.0. A directory is useful when an executable quality gate depends on it, not when its name merely sounds important.

## 6. “Online” resharding must say who stays online

Changing shard count from 32 to 64 changes the `jobId -> shardId` mapping. If an old Scheduler computes with 32 while a new Scheduler computes with 64, the same job can appear in two ownership systems. Without dual-version routing and a migration epoch, calling this zero-downtime for every role hides a duplicate-trigger risk.

Firefly's first-stage design is therefore a controlled online expansion:

- Shard count can only increase; contraction requires a full outage.
- Scheduler, Standby, and API nodes must drain and stop.
- Data-plane-only Gateway and Executor nodes may keep their connections.
- The operation rejects active executions and unfinished Outbox records.
- A migration lock and one transaction cover job-shard recomputation, metadata revision, and old-lease removal.

![Operational sequence for controlled Firefly shard expansion](./assets/diagrams/03-controlled-reshard.svg)

Figure 3: “Online” means the data plane may remain online, not that the control plane is unaware. A failure rolls back the database transaction. Control-plane nodes remain stopped and use the actual database shard count to choose retry or restoration.

The wording is conservative, but it gives operators verifiable prerequisites and a rollback point. Fully online resharding would require dual routing, migration epochs, durable progress, a read/write compatibility window, and retirement of the old mapping. That deserves a separate design rather than a more ambitious name for one maintenance command.

## A review framework for similar changes

Feedback such as “too many conditionals,” “the SQL is too direct,” or “the executor policy is insufficient” becomes actionable through five questions:

1. **Who owns the rule?** Route access belongs to registration policy. State transitions belong to a domain state machine, not a caller holding an SQL string.
2. **Does the boundary cross processes?** Cross-JVM ownership needs database CAS, leases, or fencing. JUC is local to one process.
3. **Is waiting bounded?** Queue size, retries, delay, shutdown, and final rejection must all be observable.
4. **What is the compatibility unit?** Product version, Plugin API level, wire protocol version, and database schema version should evolve independently.
5. **Where does recovery start?** In-memory retries, a durable Outbox, and a maintenance transaction provide different durability and must not impersonate one another.

## Conclusion

Architecture governance is not wrapping every method in a pattern. It is naming the rules that genuinely change, fail, or cross team boundaries. Firefly v1.0.2 still uses direct tools: JDK `HttpServer`, Netty, Jackson, and JDBC. The contracts between them are now clearer. Permissions travel with route registration. Wire models are separate from domain models. Bounded retries do not block EventLoops. Database generations reject stale owners. Plugins declare API-level compatibility. Resharding answers honestly which roles stay online.

These changes do not remove distributed-system failure. They make failure happen at defined points and leave outcomes that can be tested, observed, and recovered.

## Further reading

- [Firefly v1.0.2 source](https://github.com/fishered/Firefly/tree/v1.0.2)
- [Firefly v1.0.2 release notes](https://fishered.github.io/firefly-home/en/releases/v1.0.2)
- [AdminRoutePolicy](https://github.com/fishered/Firefly/blob/v1.0.2/apis/admin-http/src/main/java/com/firefly/api/admin/http/routing/AdminRoutePolicy.java)
- [NettyResultPersistenceExecutor](https://github.com/fishered/Firefly/blob/v1.0.2/transports/netty/src/main/java/com/firefly/executor/netty/NettyResultPersistenceExecutor.java)
- [JdbcReshardTool](https://github.com/fishered/Firefly/blob/v1.0.2/stores/jdbc/src/main/java/com/firefly/store/jdbc/JdbcReshardTool.java)
