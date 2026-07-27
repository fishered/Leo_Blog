---
title: "Elastic Search初步架构与Lucence（一）"
description: "Elastic Search 背景es 主要为了解决 lucence 单节点存储压力问题，支持多节点集群/分离存储与实时检索性能场景 lucence：本身是一个单节点的文档检索存储库，主要负责： 倒排索引构建分词器实现文本检索/匹配/而 es 中主要的实现为： 多分片拆分nodes 集群…"
published: 2025-11-20
slug: zhihu-1974794973481288478
tags:
  - "Search Engine"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/1974794973481288478
  published: 2025-11-20
---

## Elastic Search 背景

es 主要为了解决 lucence 单节点存储压力问题，支持多节点集群/分离存储与实时检索性能场景

lucence：本身是一个单节点的文档检索存储库，主要负责：

1. 倒排索引构建
2. 分词器实现
3. 文本检索/匹配/

而 es 中主要的实现为：

1. 多分片拆分
2. nodes 集群，高可用与分布式搜索
3. 提供集群管理能力
4. 动态组件化适配

## Elastic Search 生态

![image](./image-01.jpg)

*官方Elastic 生态*

- **Elasticsearch（核心）**
说明：分布式搜索/时序/分析引擎；负责索引、查询、聚合、副本与分片管理。
设计要点：索引策略（shard size）、ILM（hot/warm/cold）、副本策略、translog/refresh 调优、堆与 page cache 配置。
何时选：作为数据存储与检索中心（日志检索、时序、指标、企业搜索等）。（官方 Stack 概览）
- **Kibana（可视化与交互）**
说明：Dashboard、Discover、Lens、可视化编辑、管理界面（security、fleet、APM UI）。
设计要点：Kibana 与 Elasticsearch 版本一至性、权限与空间（spaces）管理、仪表盘权限控制。
- **Beats（边缘采集） —— Filebeat / Metricbeat / Heartbeat / Packetbeat / Winlogbeat**
说明：轻量 agent，适合海量主机/设备边缘采集。
设计要点：采集拓扑（直接写 ES or 先写 Logstash）、backpressure（输出缓冲）、monitoring（Metricbeat 监控 Beats 本身）。适合高并发时用 Filebeat+Logstash 做预处理再入 ES。
- **Logstash（可选的中间处理/转化）**
说明：强力的 pipeline，适合复杂 grok/aggregate/transform 场景。
设计要点：CPU 密集、易成为瓶颈时考虑用 Elastic Agent 或将部分逻辑下沉到 Kafka/流处理再入 ES。 （Logstash + Beats 的常见架构在官方与社区示例中频繁出现）
- **Elastic Agent + Fleet（统一管理）**
说明：替代单独 Beats 的推荐方式（集中管理策略、security integration、政策下发）。
何时选：规模化主机管理、需要统一策略与安全能力时优先使用。
- **APM Server / Elastic APM（应用性能监控）**
说明：收集应用性能/事务/错误，便于端到端链路与慢查询分析。
设计要点：APM 数据量与索引策略单独规划（高基数字段注意 mapping）。
- **Elastic Security（SIEM / Endpoint / Threat Detection）**
说明：集成 SIEM、Detection Rules、Endpoint 数据源与自动化响应能力。适合安全监控场景。
- **Elastic Enterprise Search / App Search / Workplace Search**
说明：面向应用搜索的高层体验与配置封装（若是搜索产品化场景，可直接采用）。
- **ECK / ECE / Elastic Cloud（部署选择）**
说明：Elastic Cloud（SaaS）：弹性、托管、快速上手，适合不想运维集群的团队。
- **ECK（K8s Operator）：在 Kubernetes 平台上以 CRD 管理 Elastic 应用，支持证书、滚动升级、策略与 CR。**
- **ECE（企业自管平台）：用于大规模多集群管理。**
- **Supporting patterns（配套组件 / 操作实践）**
- **Kafka / Redis / NGINX：用于缓冲、平滑峰值、反向代理与负载均衡。**
- **Snapshot to S3（searchable snapshots）：冷数据归档与冻结层策略（在 ILM 中使用）。**
- **Monitoring（Metricbeat + Stack monitoring）：将 Elasticsearch / Kibana / Logstash 等统计写回 ES 便于可视化与告警。**

> 摘要自[Elastic Stack](https://link.zhihu.com/?target=https%3A//www.elastic.co/docs/get-started/the-stack)
> 摘要自[Elastic](https://link.zhihu.com/?target=https%3A//www.elastic.co/docs)
> 摘要自[边缘采集工具（Beats）介绍](https://link.zhihu.com/?target=https%3A//www.elastic.co/beats)

## Elastic Node 节点

ES 集群由多个 Node 组成，每个 Node 具有唯一名称，并承担不同角色。Node 的角色决定其在集群中的责任。一个节点可以同时承担多个角色（默认承担所有角色），也可以根据业务场景拆分为专用节点，例如：

- 独立 master 节点
- 独立 ingest 节点
- 热/温/冷/冻 数据节点（Hot/Warm/Cold/Frozen）
- ML 节点
- Transform 节点（聚合视图生成）

es 中节点状态分为三种：

- Green：绿色，表示节点运行状态为健康状态。所有的主分片和副本分片都可以正常工作，集群 100% 健康
- Yellow：黄色，表示节点的运行状态为预警状态。所有的主分片都可以正常工作，但至少有一个副本分片是不能正常工作的。此时集群依然可以正常工作，但集群的高可用性在某种程度上被弱化。
- Red：红色，表示集群无法正常使用。此时，集群中至少有一个分片的主分片及它的全部副本分片都不可正常工作。虽然集群的查询操作还可以进行，但是也只能返回部分数据（其他正常分片的数据可以返回），而分配到这个有问题分片上的写入请求将会报错，最终导致数据丢失。

es 中包含的节点角色（节点类型）：

「data」, 「data_cold」, 「data_content」, 「data_frozen」, 「data_hot」, 「data_warm」, 「ingest」, 「master」, 「ml」, 「remote_cluster_client」, 「transform」

- data - 数据存储节点，包含了分片（primary replica 主分片和副本）
- data_cold - 冷数据存储节点，基本上构建和写入均不路由到当前数据，仅提供冷数据存储，通常采用大存储设备
- data_content - 特定存储节点，一般用于存储大量文本
- data_frozen - 冻结节点，不参与内存索引构建与检索
- data_hot - 热数据节点，主要用于频繁写入和检索的数据
- data_warm - 温数据节点，存储不常更新的节点数据

| 节点角色 | 说明 | 特点 | 典型硬件配置 |
| --- | --- | --- | --- |
| **data** | 通用数据节点（默认） | 同时负责写入、索引构建、查询、聚合 | SSD / 64GB~256GB RAM |
| **data_hot** | 热数据节点（高写入、高查询） | 适合实时数据，如监控、交易日志 | 高性能 NVMe SSD、较多 CPU、较大内存 |
| **data_warm** | 温数据节点（更新少、偶尔查询） | 存放 3-30 天中间活跃度的数据 | 普通 SSD、大容量存储 |
| **data_cold** | 冷数据节点（长期存储） | 很少写入，主要用于低频查询归档 | 大容量 HDD 或低成本 SSD |
| **data_frozen** | 冻结节点（搜索即拉取） | 不参与索引构建，按需读取，极省内存 | 极低成本 HDFS/S3 存储 |
| **data_content** | 大量文本内容场景 | 多用于大规模全文搜索 | 大容量 SSD / 文本型数据 |

- ingest - pre process预处理节点，当数据写入时指定pipeline，则会按照pre process进行数据处理后写入
- ml - 机器学习/数据分析节点，类似aws lambda或一些流式作业处理
- master - 主节点，一般在es中，主节点不参与索引构建，写入，检索，而是集群节点间协调者
- remote_cluster_client - 远程客户端的集群节点，主要用于通信，检查节点状态
- transform - 类似于动态视图的场景，将数据聚合整理到新索引（视图/临时表），并实现高效聚合检索

默认情况下，一个默认节点承担了 data/master/cluster/ml相关的全部节点，对于特定场景，可以在节点配置中设置节点的具体职责

如果是集群模式下，我们可以定义不同节点所属权限，这也是es高可用的核心概念-分而治之

一般來说，集群通常都具备以下几种特性：

- ![\color{#FF5733}{高可用性 （HA）}](./image-02.svg)
- ![\color{#FF5733}{易拓展性}](./image-03.svg)
- ![\color{#FF5733}{负载均衡（Load Balance）}](./image-04.svg)

es集群最少需要3个节点组成，这主要是为了解决选主和脑裂问题，当一个集群内节点运行时，我们可以指定它成为master，master的信息存储在node中clouster-status中，当主节点失效后，会重新投票选举

同时，在indices中，创建的索引会被水平拆分在不同节点下存储-primary（分片存储，存储文件是隔离的），并同步至shard（副本，主从复制）

### **Data 节点关键职责**

```java
保存 primary shard 和 replica shard
构建倒排索引（Lucene）
执行查询（Search Phase / Query+Fetch）
执行写入（Indexing）
聚合（Aggregation）
Rebalance、Replicate、Recovery
```

### **Master 节点关键职责**

```text
维护集群状态（cluster state）
选主（Master Election）
管理索引创建/删除
管理节点加入/退出
分片分配（Routing）
容灾恢复协调
```

### **Ingest 节点（预处理节点）**

```text
GeoIP 解析
字段提取（grok）
字段处理（rename、remove、convert）
文本处理
JSON 解码、url decode
```

### **ml 节点（机器学习节点）(es8新特性)**

```text
类似 AWS Lambda + 分析作业，适用于：
Metric Anomaly Detection
Log Anomaly Detection
分布式数据建模
```

### **transform 节点（视图生成节点）**

```text
构建用户行为聚合表
构建时间序列聚合索引
构建宽表以提升检索性能
```

## Elastic Node 存储模型

![image](./image-05.jpg)

*Elastic Node存储模型*

### Primary Shard/Replica（分片/副本）

多分片/多副本机制其实是es的高可用核心体现，合理利用索引的分片/副本，主要为了提高两点：

1.水平的存储隔离与横向拓展，往往对于大数据场景，和一些高效数据存储模型，都在保证数据分布上做了额外保证，在es中也不例外，es支持将同一索引数据，按照不同share进行分离存储与检索

2.多Replica设计，可以有效提高es检索的能力，可以通过拓展Replica提供检索并行能力，但是多Replica会带来数据开销和维护开销

**primary shard 与副本的区别：**

在es的存储方案中，所有的存储都是通过document_ 进行存储，所以意味存储数据均由index来构建并声明，同时会携带mapping（类似与传统数据库中表的概念），mapping决定了存储的数据规范/格式；

在es中，shard（分片）即为es支持横向拓展的最小单位；在创建index时，可以指定索引的分片和副本数，即：在es中，shard（分片）即为es支持横向拓展的最小单位

在创建index时，可以指定索引的分片和副本数，即：

```text
For Example：

如果单节点：
primary shard可设置多个
Replica 设置默认为UNASSIGNED（副本无法分配）

如果多节点（cluster）：
number_of_shards ：3 （3个主节点）
number_of_replicas ：1 （每个主分片一个副本）
会产生6个分片，3主+3副本
```

**Replica副本数，可动态调整，es会自动创建或删除副本分片；primary shard主分片数不可修改**

### **Index索引**

在es中，所有的document都有索引来管理，换言之，es中index就相当于rds示例中的table-表级

index-与其他存储表级模型一致，应该在维护创建时就根据数据约束/数据量设计完备，维护修改一个现有多分片的index不是一个简易的事儿

在es中，支持对index设置水平分布分片数（shard）和高可用副本（replica），但是要注意，对于单节点示例，即使设置为多副本，实际是无法存储的，因为副本不能和主分片放在同一节点，会显示UNASSIGNED

索引一旦创建，并设置mapping.text，不能强制修改mapping field类型，只能创建新index/mapping，然后使用_reindex将老数据迁移过去，通过alias访问

可以设置index 副本数，如果设置更多副本，仅仅是在新的节点创建一个replica-node，并且通过主从同步的方式将数据同步到副本节点，副本可支持读取能力

**Index Setting核心参数**

| Properties Key | Description |
| --- | --- |
| mappings | 定义 document 和其 field，如何存储和被搜索 |
| settings | 定义和控制所有与 index 相关的內容 |
| number_of_shards | 定义主分片数量-实际每个index的水平拓展能力 |
| number_of_replicas | 定义副本数量-支持动态修改，用于高可用场景 |

其中，在Setting中会维护一些Index的核心配置

| Setting Key | Properties Key |
| --- | --- |
| setting-> allocation.include | 上文中定义Data Tiers的类型 |
| setting-> refresh_interval | 代表当前索引数据可见性区间，默认1s刷新到translog，在写入后未refresh前，当前文档是不可见的；一般来说，如果存在大批量写入，可适当增加该值，以确保最终一致性 |
| setting-> mapper.dynamic | 当写入document出现新field时，是否自动创建 |
| setting-> mapping.source.mode | 是否存储原始文档内容 |
| setting-> translog.durability | 是否每次请求写入后强制写入translog |
| setting-> translog.sync_interval | 每次translog刷盘的间隔 |
| setting-> translog.flush_threshold_size | translog缓冲池阈值，超过阈值后进行flush |

### Index索引-ILM

在ES 8.X及以上，ES支持ILM，即可以通过生命周期将索引设计为不同生命周期

- Hot 阶段：活跃写入，分配到 data_hot 节点
- Warm 阶段：写入减少，分配到 data_warm 节点，可进行 forcemerge
- Cold 阶段：长期存储，分配到 data_cold 节点
- Delete 阶段：达到保留策略自动删除索引

ES不同节点的生命周期可以随着配置进行切换

| Data Tiers-节点类型 | Tier 说明 |
| --- | --- |
| hot | 接收写入、查询最频繁、性能最好 |
| warm | 写入减少、查询降低，用于中期保存 |
| cold | 长期存储、较少查询，但仍需可查询 |
| frozen | 近乎归档，按需加载 segment，极低成本 |
| content | 常规数据，如 Kibana 的索引，仅存储，不参与 ILM |

### Shard-分片

es中的数据分片，指的是Primary Shard，每个分片是数据存储水平拆分的最小单元

当某一index中数据量过大，为了保证水平拓展存储，才有了分片的概念，例如：

```text
_index1 中存储5T原文档，
每台机器最大支持1T文档存储，那么它

shard_0	~1 TB	Node A
shard_1	~1 TB	Node B
shard_2	~1 TB	Node C
shard_3	~1 TB	Node D
shard_4	~1 TB	Node E

可将数据平均分配在不同的分片中
```

Shard 可以实现：

在多台服务器上分布式执行搜索和分析等操作，以此提高性能和流量。

快速横向扩展（scale），灵活满足使用需求。

***补充：在创建 index 时，可以同时定义 primary_shard 数量，一旦设置完成并且创建 index 后，便无法再修改。若未指定，默认的 shard 数量为 1。***

### Replica-副本

一个Replica副本，一定是数据某一个Shard分片的同步节点；

Replica的作用主要是提供高可用节点和分散索引带来的压力，

高可用：当主分片短暂不可用时，可以利用Replica分片提供就检索能力，所以Shard和Replica不能设置在同一node节点。

所以，假设当某个_index存在5T数据，我们在设置index时设置number_of_shards = 5，且es包含5个节点：nodeA/B/C/D/E，那么，每个node server挂载1T的data 节点，并且设置number_of_replicas = 1，那么一共存在：

```text
| Shard 类型 | 数量 | 总 Shard 数 |
| -------- | -- | --------- |
| Primary  | 5  | 5         |
| Replica  | 5  | 5         |
| **合计**   | 10 | 10        |

| Shard   | Primary 所在节点 | Replica 所在节点 |
| ------- | ------------ | ------------ |
| shard_0 | Node A       | Node B       |
| shard_1 | Node B       | Node C       |
| shard_2 | Node C       | Node D       |
| shard_3 | Node D       | Node E       |
| shard_4 | Node E       | Node A       |
```

### Document-文档

Document文档是es存储数据的最小单元，通常以json格式存储，一个document对象通常都包含以下基本属性：

```text
例：
{
"_index": "my-index",
"_id": "_-AGlZoBexXccx3jNsCw",
"_version": 1,
"_seq_no": 1,
"_primary_term": 1,
"_score": 1,
"_source": {
"id": "park_rocky-mountain",
"title": "Rocky Mountain",
"description": "Bisected north to south by the Continental Divide, this portion of the Rockies has ecosystems varying from over 150 riparian lakes to montane and subalpine forests to treeless alpine tundra."
}
}
```

| key | description |
| --- | --- |
| _index | document 所属的 index 名称 |
| _type | document 类型（在es7.17以上版本中，已经被废弃了，默认都是_doc） |
| _id document | 当前文档编号 |
| _version | 版本信息，每进行一次更新、刪除，都会增加 version 的值 |
| _seq_no [3] | sequence number 就是序列号，避免更新后的 document 被旧版本覆盖，Elasticsearch 由追踪序列号來判断 document 的新旧 |
| _primary_term [3] | 当主分片有变动時，其值会增加 |
| _source | document 的原始 json 数据 |
