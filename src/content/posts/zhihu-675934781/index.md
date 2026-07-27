---
title: "【rocketMq】如何保证消息顺序消费"
description: "rocket针对有业务顺序的消息如何保证消息的顺序呢RocketMq的消费模型说到顺序，我们先观察rocket的消费模型： 首先，producer group创建消息，并指定tag、key、messageBody对消息体进行组装 private String topic; 消息主题 private int flag; 消息标识 pri…"
published: 2024-01-03
slug: zhihu-675934781
tags:
  - "RocketMQ"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/675934781
  published: 2024-01-03
---

> *rocket针对有业务顺序的消息如何保证消息的顺序呢*

- **RocketMq的消费模型**

说到顺序，我们先观察rocket的消费模型：

![image](./image-01.jpg)

首先，producer group创建消息，并指定tag、key、messageBody对消息体进行组装

```text
private String topic; 消息主题
private int flag; 消息标识
private Map<String, String> properties;
private byte[] body; 消息体
private String transactionId; 全局唯一事务id
```

首先我们知道，rocket在broker中的存储是分段的，例如Topic A，可能会在每个broker中都有对应Topic A的持久化消息，每个broker下的topic下又有不定数量的queue（具体数量取决于维护的queue size，默认一个topic有4个队列），具体的流程可以参考：

[rocketmq-基础架构](https://link.zhihu.com/?target=https%3A//www.cnblogs.com/oldEleven/p/17145287.html)，那么对于producer来说，它如何知道当前的消息应该存储在哪个broker中呢？

其实在rocket-client-producer中，做了对每次路由选择的实现，producer与nameserver长连接获取到所有的broker实例，根据topic name去 topicPublishInfoTable中获取对应的queue信息，这里其实发送的目的地是选择到某一个queue上。

对于消费者而言，也是同理，rocket中规定一个queue当前只会有一个消费者进行消费，但是一个消费者可以消费多个相同topic的队列，这里是消费者拉取消息能力的体现。针对消费挤压及发送消费源码，我们在后面会进行分析！

- **Rocket如何保证消息顺序**

首先我们列举一个应用场景：我们业务动作有三个：分别是业务A、业务B、业务C；如果我们用mq来进行异步消费处理，而且要保证业务顺序是：A -> B -> C，我们如何保证消息做到FIFO的消费顺序？

很抱歉！mq的消息是分段存储的，它的好处是可以提高集群消费能力，但是坏处也很明显：如果我们想保证一个FIFO的队列，很简单，我们只需要去阻塞队列即可，但是rocket给我们提供的是多个队列分散压力，那就不能从这个角度保证消费顺序了！

但是，我们可以试想一下这几个场景：

![image](./image-02.jpg)

1.我们最希望看到的是：M1首先消费，消费完成并ACK后再消费M2：如果M1和M2发送到了不同的server中，无法保证M1先到达并处理，M2再到达。

2.有了上面的经验，我们可以试着让他们发送到同一个server：如果我们的生产者集群异步发送的消息，如果M1发送时网络波动了，如何保证在一个server上消费顺序呢？（这里的server 应该精确到queue）、那就只能让他们用同一个消费者去消费，但是这里还有一个问题：

3.就算单个消费实例，消费达到了M1 M2的顺序，如果M1处理失败了，会进入retry重试队列或丢弃或其他操作。那这时消费者拉取到M2的消息应该如何处理？

**基于上面的思路，我们发现想要保证消费顺序，唯一的办法是保证生产者和消费者绑定，并且要阻塞消费，避免多个线程获取到多个消息，我们无法根据消费者的消费能力进行排序**。但是如果这样做，消费的能力就会大打折扣，而且如果其中有一个消费任务失败，就要阻塞全部的队列进行等待，直到消费完成！

rocket给我们提供了几种方案：
保证业务顺序，不需要保证全局的业务顺序，（当然如果你想这样做也可以，同步发送、单线程消费、阻塞消费，这样会丢失大量的吞吐量），例如我们业务M中有顺序：M1M2 ；我们的业务Q中有顺序Q1Q2；我们需要保证M和Q的顺序吗？很明显是不需要的，我们只需要保证M2在M1的消息之后，Q2在Q1的消息之后。那我们保证它的顺序有这几种情况：

1.首先所有的消息都被发送在一个队列里：queue：M1M2Q1Q2；

2.消息存放在不同的队列里：queue：M1 M2 ；queue：Q1 Q2；

我们可以手动根据业务数据进行指定，这里遵循rocket的规则：一个queue只会被一个消费者进行消费。那么我们的重心就放在了如何将M1M2放在一个队列？

在发送消息时：指定producer.send 重写 MessageQueueSelector，比如我们可以用业务id进行取模：

```java
producer.send(msg, new MessageQueueSelector() {
@Override
public MessageQueue select(List<MessageQueue>
mqs, Message msg, Object arg) {
Integer id = 10;//业务id
return mqs.get(id % mqs.size());
}
}, null);
```

**但是这里有一个问题：目前的queue是固定的，那如果后面broker进行了维护、扩容等操作导致队列数量变化了，这时的数据就会有问题，它们会分散在不同的队列中，就无法保证顺序了！这里要考虑业务场景是否容忍在集群下消息短暂丢失顺序的问题。如果可以，使用分区有序性比较合适！**

**有分区顺序，就有全局顺序，如果业务对顺序的要求是零容忍，那么我们也可以采取牺牲分布式特性failover，就是说如果有一个broker出现问题或者不可用，整个集群不可用！**

**如果M1消费异常，我们保证顺序的前提下，我们是不能消费M2的！所以仅仅有分区顺序还不够，还需要再消费时避免异步并发消费，并且如果消费失败立即重试，阻塞住当前的消费队列！**

rocket还提供了 MessageListenerOrderly 消费方式，与它相同等级的是 MessageListenerConcurrently ，很明显前者是阻塞的单消费模型，后者是默认并发消费模型，这里跟消费者的拉取消息，异步消费线程相关。

rocket提供了MessageListenerOrderly ，该类保证了对topic下的每个queue都采取多线程消费模型，并且会阻塞消费队列，直到消费者完成消费，底层原理是：首先启动MessageListenerOrderly 时，会对指定的queue进行加锁；broker中的分布式锁的结构为：

```java
private final ConcurrentMap<String/* group */, ConcurrentHashMap<MessageQueue, LockEntry>> mqLockTable =
new ConcurrentHashMap<>(1024);
```

**它保证了每一个消费者组，同一个队列只会分配给其中一个消费者！**

**![image](./image-03.jpg)**

**而它的上层获取锁的key是具体的queue，说明同一时刻一个队列只有一个线程去消费！**

![image](./image-04.jpg)

**在真正消费消息的时候，会对processQueue数据进行加锁，首先processQueue是一个消费缓存，有拉取的消息缓存，以及消费进度等信息，这个我们后面说到源码再进行分析！**
**每次消费前，先对processQueue进行加锁，是为了保证在消费过程中，当前消费者持有对队列的锁，避免其他消费线程进行消费。那么当指定消费者消费完成后对锁进行释放，其他消费者才可以绑定后进行消费！**

![image](./image-05.jpg)

但是顺序消费，因为有锁和阻塞的机制，吞吐量会大大降低！

如果消费失败，会阻塞队列消费，这时应该采用一个最大失败的能力！避免某个消息持续异常导致消息挤压！
