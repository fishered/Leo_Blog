---
title: "Firefly 边界治理"
description: "从条件分支到显式契约，分析声明式 Admin RBAC、Jackson wire model、有界持久化重试、跨进程 JDBC fencing、插件 API level 与受控 reshard。"
lang: zh
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

> 摘要：分布式系统最危险的规则，往往不是没有实现，而是实现了却没有名字：权限藏在路径判断里，协议等同于某个 Java 对象，重试等同于“再塞一次线程池”，跨进程所有权只靠一个 token 字符串。Firefly 的边界治理，是把这些隐式规则提升为可以测试、迁移和运维的显式契约。

## 这不是一次“多加几个类”的重构

调度系统横跨控制面、数据面和状态面。Admin API 修改任务与集群状态；Netty Gateway 承担高频长连接；JDBC 保存任务游标、execution、Outbox、lease 和业务幂等 claim。任何一层把边界写成局部条件分支，都会在另一层形成不可见的耦合。

例如，授权代码可以通过 `path.startsWith(...)` 暂时工作，但路由重命名会隐式改变权限；直接序列化领域 record 看起来省事，却把 Java 构造器和网络兼容绑定起来；数据库更新前先在 JVM 加锁，也不能阻止另一台 Executor 提交旧 claim。

因此，这次边界治理的判断标准不是类数量，而是每条关键规则是否拥有明确的 owner、输入、失败结果和测试位置。

![Firefly 的控制面、数据面与状态面边界](./assets/diagrams/01-explicit-boundaries.svg)

图 1：Admin policy、Netty wire contract 和 JDBC fencing 分别守住控制面、数据面与状态面；调度核心只接收已经通过边界校验的输入。

## 1. Admin 权限应绑定路由，不应猜测路径

旧式授权通常长这样：先判断 HTTP method，再通过路径前缀或后缀推断需要的角色。代码并不一定“不能用”，问题是它把路由定义与安全策略放在两个不同位置：增加 `/cancel` 端点的人未必会发现另一处授权分支，重构 URL 的人也可能无意改变访问级别。

当前实现将 Admin HTTP 拆成几类清楚的职责：

| 组件 | 责任 |
|---|---|
| `AdminHttpPlugin` | 依赖装配、启动、关闭 |
| `AdminHttpRouter` | 请求目标与路由匹配 |
| `AdminRouteRegistration` | Controller 和 policy 绑定 |
| `AdminAuthorizationService` | 身份解析与角色判定 |
| `AdminRequestReader` | 请求体、JSON、分页与批量边界 |
| `Admin*Controller` | 任务、执行、集群、认证等业务动作 |

`AdminRoutePolicy` 是这里的关键。它不是为了制造一层抽象，而是让安全声明靠近路由注册。`READER`、`OPERATOR`、`ADMIN` 和匿名访问都成为可单测的 policy；授权服务只消费匹配结果，不再认识 `/api/users` 或 `/trigger` 这样的业务字符串。

这个设计仍然使用 JDK `HttpServer`。Router、Policy、Controller 是内部结构，不需要为了获得分层就引入 Spring MVC 或 WebFlux。对一个轻量调度中心而言，这种克制也降低了依赖升级、启动时间和攻击面的成本。

安全边界还包括输入容量。请求体、分页和批量数量必须在 Controller 之前统一校验，否则攻击者不需要绕过 RBAC，也能用一个合法的大请求消耗内存或数据库资源。UI 隐藏按钮从来不是授权，服务端 policy 和 limit 才是。

## 2. Java record 不是 wire contract

Java `record` 很适合表达不可变消息，但它只解决进程内数据形状，不自动定义跨版本协议。直接使用 JDK native serialization 会引入类名、`serialVersionUID`、JVM 类型图和反序列化安全风险；直接把领域 record 交给 Jackson，也会让领域重构意外变成协议变更。

Firefly 将协议拆到独立的 `transports/netty-protocol` 模块：

```text
domain message
    -> NettyExecutorWireMessage
    -> Jackson JSON codec
    -> newline-delimited frame
```

wire record 只包含稳定字段：`messageId`、`type` 和字符串 payload。Gateway 与 Executor Client 依赖同一协议模块，但 Gateway 的连接、路由和派发实现留在 `transports/netty`。这样，发布坐标、依赖方向和兼容测试都有明确位置。

选择 Jackson 并不意味着“JSON 天然兼容”。兼容仍需要规则：旧端缺失新字段时如何解释，未知消息类型是拒绝还是降级，能力协商结果是否允许发送 `CANCEL_JOB`。序列化库负责字节与对象之间的转换，协议设计负责版本语义，两者不能混为一谈。

## 3. 有界重试不是把拒绝吞掉

Gateway 收到 ACK 或执行结果后需要写数据库。如果直接在 Netty EventLoop 执行 JDBC，连接抖动会拖住同一 EventLoop 上的其他连接；如果扔进无界队列，数据库变慢会把故障转化为堆内存增长；如果使用 `AbortPolicy` 后直接失败，又会放大短暂抖动。

Firefly 使用独立的 `NettyResultPersistenceExecutor`：一个有界工作队列、一个有界重试区和一个只负责延迟调度的线程。工作队列饱和后，任务以固定的有限间隔重新尝试；重试槽位和最大尝试次数耗尽时调用最终拒绝处理。整个等待过程不占用 EventLoop。

![Firefly 结果持久化的有界重试与反压流程](./assets/diagrams/02-bounded-result-persistence.svg)

图 2：`ACCEPTED`、`RETRYING` 和 `REJECTED` 是三种可观察提交结果。低水位恢复读取，关闭与耗尽都有确定出口。

这和消息队列式拒绝策略相似，但不是一个新的持久化 MQ：进程崩溃仍可能丢失内存重试项。因此它只吸收短暂压力，不承担 durable delivery 的语义。Firefly 已有 Outbox 负责派发可靠性；在没有定义登记对象、去重键、重放方和保留期之前，不应再创建一个模糊的“失败注册表”。

## 4. JUC 能协调线程，不能 fence 另一台机器

业务幂等的典型流程是 `tryAcquire -> execute -> markCompleted`。如果 claim 超时后被新实例接管，旧实例稍后恢复，就可能提交一个已经失去所有权的完成状态。`ReentrantLock`、`Semaphore` 或 JVM 内 CAS 无法解决这个问题，因为两个 Executor 进程根本不共享同一个 JUC 状态。

这次改造将 `JdbcBusinessIdempotencyStore` 拆成状态机、`JdbcIdempotencyClaimDao` 和 `JdbcTransactionTemplate`。SQL 并没有消失，它被放回负责持久化条件更新的 DAO；事务边界也不再和业务状态判断混在一个大方法里。

claim 的正确性依赖四件事：

1. 使用数据库时间判断过期，避免节点时钟漂移决定所有权。
2. 在事务中锁定记录，串行化接管决策。
3. 每次接管递增 generation；表中的 `attempt` 保存这一代次，`claim_token` 编码同一个 generation。
4. `markCompleted` 和 `release` 同时匹配 key、状态与 claim token。

这就是 fencing：旧 owner 即使仍持有旧 token，也无法更新 token 已随 generation 变化的新 claim。它比“先查再更新”多出的条件不是冗余，而是跨进程所有权证明。

仍需承认一个边界：如果业务副作用已经提交，而完成标记尚未提交时进程崩溃，调度系统不能凭空还原原子性。Handler 应使用同库唯一键、业务事务或可重复操作实现 effectively-once，而不是宣称绝对 exactly-once。

## 5. 插件兼容不能只比较产品版本

插件是否兼容，取决于 SPI 契约，不取决于产品版本字符串。Firefly 为 `FireflyPlugin` 增加默认的 `compatibility()`，返回支持的 Plugin API level 范围。当前 level 为 `1`，旧插件通过默认方法继续声明 level 1，不需要仅因补丁版本变化而重新编译。

宿主在启动任何插件前，先校验所有启用插件。这样，一个不兼容插件会阻止节点加入，而不是让前几个插件已经启动、后一个失败，留下部分可用状态。API level 只有在 SPI 二进制或行为契约破坏时才提升，这比把产品版本当作兼容协议更稳定。

同一原则也解释了清理策略。没有被引用的 `admin-model` 和不可执行的 process-fault benchmark scaffold 被删除；`compatibility/spring-boot-consumer` 则保留，因为 CI 用它真实构建 Spring Boot 3.3、3.4、3.5 和 4.0 消费者。判断“无用”应该看可执行证据，不是看目录名字。

## 6. Reshard 的“在线”必须说明谁在线

把 shard count 从 32 改成 64 会改变 `jobId -> shardId` 映射。若旧 Scheduler 仍按 32 计算、新 Scheduler 已按 64 计算，同一个 job 可能在两个 ownership 体系中出现。没有双版本路由和迁移 epoch 时，宣称全角色零停机会掩盖真正的重复触发风险。

Firefly 的第一阶段方案因此叫“受控在线扩容”：

- 只允许增加 shard count；缩容需要全停机。
- Scheduler、Standby 和 API 必须 drain 并下线。
- 纯 Gateway/Executor 数据面可以继续维持连接。
- 操作拒绝活跃 execution 和未完成 Outbox。
- 迁移锁与单事务覆盖 job shard 重算、metadata revision 更新和旧 lease 清理。

![Firefly 受控在线分片扩容的操作时序](./assets/diagrams/03-controlled-reshard.svg)

图 3：“在线”指数据面可在线，不代表控制面无感。失败时数据库事务回滚，控制面保持下线，并以数据库中的实际 shard count 决定重试或恢复。

这种命名看起来保守，却给运维留下了可验证的前置条件和回滚点。真正的全在线 reshard 需要双路由、迁移 epoch、进度持久化、读写兼容窗口和旧映射回收协议，那应当是另一个完整设计，而不是在一次维护命令上换个名字。

## 如何评审类似改造

面对“代码里 if 太多”“SQL 太直接”“线程池还不够可靠”这类反馈，可以用下面五个问题把审美争论变成工程判断：

1. **规则属于谁？** 路由权限属于注册 policy，不属于通用授权器；状态转换属于领域状态机，不属于 SQL 字符串调用者。
2. **边界跨不跨进程？** 跨 JVM 所有权必须依赖数据库 CAS、lease 或 fencing，JUC 只适合本进程。
3. **等待是否有上限？** 队列、重试次数、延迟、关闭和最终拒绝都必须可观察。
4. **兼容单位是什么？** 产品版本、Plugin API level、wire protocol version 和数据库 schema version 应分别演进。
5. **失败后从哪里恢复？** 内存重试、持久化 Outbox 和维护事务拥有不同 durability，不能互相冒充。

## 结语

好的架构治理不是把每段代码包装成模式，而是让真正会变化、会失败、会跨团队协作的规则拥有名字。Firefly 仍然使用 JDK `HttpServer`、Netty、Jackson 和 JDBC 这些直接工具，但把它们之间的契约变得更明确：权限随路由声明，协议与领域模型分开，有界重试不阻塞 EventLoop，数据库 generation 阻止旧 owner，插件按 API level 校验，reshard 对“谁可以在线”给出诚实答案。

这些变化不会消除分布式系统的失败，却能让失败发生在预先定义的位置，并留下可以测试、观察和恢复的结果。

## 延伸阅读

- [本文对应的 Firefly 源码快照](https://github.com/fishered/Firefly/tree/v1.0.2)
- [相关版本说明](https://fishered.github.io/firefly-home/releases/v1.0.2)
- [AdminRoutePolicy](https://github.com/fishered/Firefly/blob/v1.0.2/apis/admin-http/src/main/java/com/firefly/api/admin/http/routing/AdminRoutePolicy.java)
- [NettyResultPersistenceExecutor](https://github.com/fishered/Firefly/blob/v1.0.2/transports/netty/src/main/java/com/firefly/executor/netty/NettyResultPersistenceExecutor.java)
- [JdbcReshardTool](https://github.com/fishered/Firefly/blob/v1.0.2/stores/jdbc/src/main/java/com/firefly/store/jdbc/JdbcReshardTool.java)
