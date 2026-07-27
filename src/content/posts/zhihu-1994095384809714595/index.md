---
title: "数据库Executor-Selector排查实践"
description: "背景在K8s集群上，有一些Old Server，在执行一些任务时发现严重的超时，通过Prometheus监控，发现某些任务执行时，DB压力将近90%，IO大耗时，长时间未响应 相关SQL解析 SELECT id FROM rcp_device_event WHERE eid > 2388 AND event IN ('PROFILE_INFO', 'I…"
published: 2026-01-12
slug: zhihu-1994095384809714595
tags:
  - "Database"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/1994095384809714595
  published: 2026-01-12
---

## 背景

在K8s集群上，有一些Old Server，在执行一些任务时发现严重的超时，通过Prometheus监控，发现某些任务执行时，DB压力将近90%，IO大耗时，长时间未响应

相关SQL解析

```mysql
SELECT id
FROM rcp_device_event
WHERE eid > 2388
AND event IN ('PROFILE_INFO', 'INTERNAL_REQUEST', 'DEVICE_BOOT')
AND status NOT IN ('TO_BE_PROCESSED', 'PROCESSING')
AND create_time < CURDATE() - INTERVAL 14 DAY
ORDER BY id DESC
LIMIT 500;
```

老服务数据库还采用MySql-5.7， 数据库未升级

## 数据指标

K8s上有两套服务集群，在`stag`环境（40万数据）运行正常，但在`prod`环境（1000万+数据）执行极慢，通过执行计划发现，两套数据检索在不同环境命中数据扫描明显异常

### 分析指标

```text
id	select_type	table	partitions	type	possible_keys	key	key_len	ref	rows	filtered	Extra
1	SIMPLE	event	-	range	rcp_device_event_create_time_index,status,event,idx_create_time	event	131	-	3	25.04	Using index condition; Using where; Using filesort
```

分析：

- **type = range**：使用了范围扫描
- **key = event**：使用了 `event` 索引
- **Using filesort**：需要额外的排序操作
- **rows = 3**：扫描行数很少

### **Prod 环境执行计划（900万+数据）**

**EXPLAIN 结果**：

```text
id	select_type	table	partitions	type	possible_keys	key	key_len	ref	rows	filtered	Extra
1	SIMPLE	event	-	index	rcp_device_event_create_time_index,status,event,idx_create_time	PRIMARY	8	-	2468	6.75	Using where; Backward index scan
```

分析：

- **type = index**：使用了索引扫描（全索引扫描）
- **key = PRIMARY**：使用了主键索引（而非业务索引）
- **Backward index scan**：倒排扫描（从最大 id 开始）
- **rows = 2468**：扫描行数多
- **filtered = 6.75%**：过滤效率低

详细执行计划：

```text
{
"query_block": {
"select_id": 1,
"cost_info": {
"query_cost": "793719.26"
},
"ordering_operation": {
"using_filesort": false,
"table": {
"table_name": "event",
"access_type": "index",
"possible_keys": [
"eid",
"event_create_time_index",
"status",
"event",
"eid_imei_event_IDX",
"event_status_create_time",
"idx_combo",
"idx_create_time"
],
"key": "PRIMARY",
"used_key_parts": ["id"],
"key_length": "8",
"rows_examined_per_scan": 2546,
"rows_produced_per_join": 194088,
"filtered": "2.16",
"backward_index_scan": true,
"cost_info": {
"read_cost": "774310.40",
"eval_cost": "19408.86",
"prefix_cost": "793719.26",
"data_read_per_join": "189M"
},
"used_columns": [
"id",
"eid",
"event",
"status",
"create_time"
],
"attached_condition": "((`event`.`eid` > 0) and (`event`.`event` in ('PROFILE_INFO','INTERNAL_REQUEST','DEVICE_BOOT')) and (`event`.`status` not in ('TO_BE_PROCESSED','PROCESSING')) and (`event`.`create_time` < <cache>((curdate() - interval 14 day))))"
}
}
}
}
```

关键指标：

| 指标 | 值 | 说明 |
| --- | --- | --- |
| query_cost | 793719.26 | 查询成本极高 |
| access_type | index | 索引扫描（全索引扫描） |
| key | PRIMARY | 使用主键索引 |
| backward_index_scan | true | 倒排扫描 |
| rows_examined_per_scan | 2546 | 每次扫描行数 |
| rows_produced_per_join | 194088 | 产生行数 |
| filtered | 2.16% | 过滤效率极低 |
| data_read_per_join | 189M | 读取数据量巨大 |

**问题根源**：

1. **执行器选择了主键索引**：因为 `ORDER BY id DESC`，执行器认为使用主键倒排扫描更高效
2. **数据分散**：满足条件的记录分散在整个表中，需要扫描大量数据才能找到匹配的记录
3. **过滤效率低**：只有 2.16% 的数据满足条件，意味着需要扫描大量不满足条件的数据

## 执行计划

### **access_type（访问类型）**

| 类型 | 说明 | 性能 | 示例 |
| --- | --- | --- | --- |
| ALL | 全表扫描 | 最慢 | SELECT * FROM table |
| index | 全索引扫描 | 慢 | SELECT id FROM table ORDER BY id |
| range | 范围扫描 | 较快 | WHERE id > 100 AND id < 200 |
| ref | 索引查找 | 快 | WHERE id = 100 |
| eq_ref | 唯一索引查找 | 最快 | JOIN ON primary_key |
| const | 常量查找 | 最快 | WHERE id = 1 |

**当前问题**：`access_type = index`（全索引扫描），性能较差。

### **key（使用的索引）**

| 索引类型 | 说明 | 性能 |
| --- | --- | --- |
| PRIMARY | 主键索引 | 如果用于全扫描，性能差 |
| 业务索引 | 如 event, status | 如果命中，性能好 |
| 复合索引 | 如 idx_event_status_create_time | 如果命中，性能最好 |

**当前问题**：使用了 `PRIMARY` 而非业务索引。

### **filtered（过滤效率）**

| filtered 值 | 说明 | 性能影响 |
| --- | --- | --- |
| 100% | 所有扫描的行都满足条件 | 最佳 |
| 50% | 一半扫描的行满足条件 | 一般 |
| 10% | 只有 10% 满足条件 | 较差 |
| < 5% | 只有很少满足条件 | 极差 |

**当前问题**：`filtered = 2.16%`，过滤效率极低。

### **Extra（额外信息）**

| Extra 值 | 说明 | 性能影响 |
| --- | --- | --- |
| Using index | 覆盖索引，无需回表 | 最佳 |
| Using where | 需要过滤条件 | 一般 |
| Using filesort | 需要额外排序 | 较差 |
| Backward index scan | 倒排扫描 | 可能较慢 |
| Using temporary | 需要临时表 | 最差 |

**当前问题**：`Backward index scan` + `Using where`，性能较差。

## 索引失效

很明显，当前查询索引失效了，即使有匹配的索引，对于执行器来说，也并没有通过索引进行扫描

### **原因 1：数据分散度高**

**问题**：满足 `event IN (...)` 和 `status NOT IN (...)` 的数据分散在整个表中。

**示例**：

```text
Id      event            status      create_time
1       PROFILE_INFO     SUCCESS     2024-01-01
2       Download         FAILED      2024-01-02
3       PROFILE_INFO     PENDING     2024-01-03
...
80000   Download         SUCCESS     2024-06-01
5000000  PROFILE_INFO     FAILED     2024-12-01
```

**影响**：即使使用`event`索引，也需要扫描大量不满足其他条件的数据。

### **原因 2：ORDER BY id DESC 导致执行器选择主键索引**

**问题**：`ORDER BY id DESC` 要求按主键倒排，执行器认为使用主键索引倒排扫描更高效。

**执行器逻辑**：

1. 如果使用 `event` 索引：

- 先通过 `event` 索引找到匹配的记录
- 然后需要排序（`ORDER BY id DESC`）
- 成本：索引查找 + 排序

1. 如果使用主键索引：

- 直接从最大 `id` 开始倒排扫描
- 逐条检查是否满足条件
- 成本：全索引扫描 + 过滤

**执行器选择**：在数据量大的情况下，执行器认为方案 2 更高效（但实际上不是）。

### **原因 3：复合索引未命中**

**尝试使用复合索引**：

```text
-- 尝试使用复合索引
CREATE INDEX idx_event_status_createtime_eid
ON rcp_device_event(event, status, create_time, eid);
```

**执行计划**：

```text
{
"query_block": {
"select_id": 1,
"cost_info": {
"query_cost": "1406235.86"
},
"table": {
"table_name": "rcp_device_event",
"access_type": "range",
"possible_keys": [...],
"key": "idx_event_status_createtime_eid",
"used_key_parts": ["event", "status"],
"key_length": "198",
"rows_examined_per_scan": 5818903,
"rows_produced_per_join": 355323,
"filtered": "6.11",
"using_index": true,
"cost_info": {
"read_cost": "1370703.52",
"eval_cost": "35532.34",
"prefix_cost": "1406235.86",
"data_read_per_join": "346M"
}
}
}
}
```

**分析**：

- **使用了复合索引**：`key = idx_event_status_createtime_eid`
- **扫描行数巨大**：`rows_examined_per_scan = 5818903`（580万行）
- **过滤效率低**：`filtered = 6.11%`
- **查询成本高**：`query_cost = 1406235.86`（比主键扫描还高）

**结论**：即使命中索引，由于数据量太大，性能仍然很差。

## 优化方案：

**方案 1：基于 create_time 的索引（尝试）**

**执行计划**：

```text
{
"query_block": {
"select_id": 1,
"cost_info": {
"query_cost": "620576.36"
},
"table": {
"table_name": "rcp_device_event",
"access_type": "range",
"possible_keys": [
"rcp_device_event_create_time_index",
"status",
"event",
"idx_create_time"
],
"key": "idx_create_time",
"used_key_parts": ["create_time"],
"key_length": "8",
"rows_examined_per_scan": 1379058,
"rows_produced_per_join": 453231,
"filtered": "32.87",
"index_condition": "(`rcp`.`rcp_device_event`.`create_time` < TIMESTAMP'2025-12-31 00:00:00')",
"cost_info": {
"read_cost": "575253.21",
"eval_cost": "45323.15",
"prefix_cost": "620576.36",
"data_read_per_join": "442M"
}
}
}
}
```

**分析**：

- **使用了 create_time 索引**：`key = idx_create_time`
- **扫描行数仍然很大**：`rows_examined_per_scan = 1379058`（138万行）
- **过滤效率提升**：`filtered = 32.87%`（比之前的 2.16% 好）
- **查询成本仍然高**：`query_cost = 620576.36`
- **执行时间**：约 3 秒

**结论**：虽然比主键扫描好，但仍然不够快。

### **方案 2：放弃 ORDER BY id，使用分页查询（不推荐）**

**问题**：如果放弃 `ORDER BY id DESC`，改为使用 `LIMIT OFFSET` 分页：

```text
SELECT id
FROM rcp_device_event
WHERE create_time < CURDATE() - INTERVAL 14 DAY
AND event IN ('PROFILE_INFO', 'INTERNAL_REQUEST', 'DEVICE_BOOT')
AND status NOT IN ('TO_BE_PROCESSED', 'PROCESSING')
LIMIT 500 OFFSET 0;
```

**问题**：

1. **OFFSET 越大越慢**：需要扫描并跳过 `OFFSET` 条记录
2. **无法保证顺序**：没有 `ORDER BY`，结果顺序不确定
3. **不适合批量处理**：无法使用游标分页

**结论**：不推荐。

## 最终优化方案

### **核心思路**

1. **初始化游标**：查询 `create_time < expiredDate - 1天` 的最大 `id`，作为初始游标
2. **限制查询范围**：只查询 `id < cursorId` 的数据（避免扫描新数据）
3. **游标分页**：使用 `id < lastId` 进行游标分页，每次只查询 500 条

### **4.2.3 生成的 SQL**

**初始化游标**：

```text
-- 查询 create_time < expiredDate - 1天 的最大 id
SELECT id
FROM event
WHERE create_time < '2025-12-25 00:00:00'
ORDER BY id DESC
LIMIT 1;
```

**查询数据**：

```text
-- 第 1 次查询
SELECT id
FROM event
WHERE id < 483868724  -- cursorId
AND event IN ('PROFILE_INFO', 'INTERNAL_REQUEST', 'DEVICE_BOOT')
AND status NOT IN ('TO_BE_PROCESSED', 'PROCESSING')
ORDER BY id DESC
LIMIT 500;

-- 第 2 次查询（假设上一页最后一条 id = 483868000）
SELECT id
FROM event
WHERE id < 483868000  -- lastId
AND event IN ('PROFILE_INFO', 'INTERNAL_REQUEST', 'DEVICE_BOOT')
AND status NOT IN ('TO_BE_PROCESSED', 'PROCESSING')
ORDER BY id DESC
LIMIT 500;
```

**优化后的执行计划**：

| id | select_type | table | type | key | rows | filtered | Extra |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SIMPLE | rcp_device_event | range | PRIMARY | 500 | 50% | Using where |

- **type = range**：范围扫描（比 `index` 好）
- **key = PRIMARY**：使用主键索引（但范围有限）
- **rows = 500**：扫描行数少（只扫描 500 条）
- **filtered = 50%**：过滤效率提升

**性能**：**0.5 秒/次**（比之前的 15 秒快 30 倍）

结论：尤其对于小型关系型数据库-MySql/ 关系型数据库- Postgres 等等，更多是存储 > 计算

我们采用关系型数据库，目的是采用存储/事务能力；对于检索，计算资源相对来说会比较薄弱

所有的执行，都要交由执行器进行调度，执行器往往会以“抽象”的行为进行动作，然后将执行行为解析为:

1. 分析查询条件
2. 检查可用索引
3. 估算成本（Cost）
4. 选择最优执行计划

对于多条件聚合/数据离散过大导致数据扫描过程庞大的情况下，往往会出现索引失效的问题，通过解析条件排查即可分析
