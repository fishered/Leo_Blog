---
title: "【rocketMq】rocket的持久化"
description: "rocket持久化保证的思想有两点：1是刷盘保证大部分数据不丢失；2是持久化文件的处理，零拷贝技术和内存页，NIO模型保证处理能力文件持久化目录 ├──abort：rocket broker启动检查的文件，正常启动会写入一个abort，正常退出会删除abort，通过它来判断上一…"
published: 2024-01-03
slug: zhihu-675935650
tags:
  - "RocketMQ"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/675935650
  published: 2024-01-03
---

> *rocket持久化保证的思想有两点：1是刷盘保证大部分数据不丢失；2是持久化文件的处理，零拷贝技术和内存页，NIO模型保证处理能力*

## **文件持久化目录**

├──abort：rocket broker启动检查的文件，正常启动会写入一个abort，正常退出会删除abort，通过它来判断上一次是否异常退出

├──checkpoint：随着broker启动，加载的历史检查点

├──lock：全局资源的文件锁

├──commitlog：broker存储的核心，我们都是到rocket是broker集中存储，落地存盘就存在commitlog里

│ ├──00000000000000000000（示例）rocket会对commitlog进行预创建，并将消息写入，每次创建的文件根据当前文件偏移量决定，例如第一次创建就是00000000000000000000

├──compaction：（基于rocket 5.0）

│ ├──position-checkpoint：缓存上一次消费的检查点，每次处理完成后会更新

├──config：

│ ├──consumerFilter.json：存储对应topic下的消息过滤规则：ConcurrentMap<String/*Topic*/, FilterDataMapByTopic>

│ ├──consumerOffset.json：根据消费者组存储的每个消费者消费点位：ConcurrentMap<String/* topic@group */, ConcurrentMap<Integer, Long>>

│ ├──consumerOrderInfo.json：顺序消息顺序：ConcurrentHashMap<String/* topic@group*/, ConcurrentHashMap<Integer/*queueId*/, OrderInfo>>

│ ├──delayOffset.json：针对消费者pull的延时队列拉取消费点位

│ ├──subscriptionGroup.json：消费者组对应订阅的消息信息，其实就是broker接收的消费者信息

│ ├──topics.json：存储对应的topic信息

│ ├──timercheck：基于定时消息的时间轮配置文件，rocket5.0以上版本

│ ├──timermetrics：基于定时消息的时间轮配置文件，rocket5.0以上版本

├──consumequeue：broker对应topic下队列的消费信息

│ ├──%{topicName}：主题名称

│ │ ├──%{queueId}：队列id

│ │ │ ├──00000000000000000000：消费点位

├──index：索引文目录

│ ├──00000000000000000000：索引文件，快速定位commitlog中的消息位置

└──timerwheel：基于时间轮算法实现定时消息的配置

这些文件是broker支持容灾的基础，rocket集群其实就是broker集群的能力，通过这些配置文件可以做到不丢失，在broker启动时会加载对应的配置。

```java
/**
* 上层抽象的配置工厂，在broker启动时会根据组件依次加载，并将文件读取到变量中。例如consumerOffsetTable
* 抽象类下每一个manager加载对应的配置信息
*/
public abstract class ConfigManager {
private static final Logger log = LoggerFactory.getLogger(LoggerName.COMMON_LOGGER_NAME);

public abstract String encode();

```

## **store存储**

rocket基于文件的处理，底层是采用mmap的方式和NIO的byteBuffer，在store上层封装了基本的组件

```java
/**
* TODO store消息处理的核心对象 mappedFile封装了对消息处理 写入
*      NIO 的文件到磁盘的处理工具
*/
public class DefaultMappedFile extends AbstractMappedFile {
// 操作系统数据页 4K，unix系列通常是这个大小
public static final int OS_PAGE_SIZE = 1024 * 4;
public static final Unsafe UNSAFE = getUnsafe();
private static final Method IS_LOADED_METHOD;
public static final int UNSAFE_PAGE_SIZE = UNSAFE == null ? OS_PAGE_SIZE : UNSAFE.pageSize();

protected static final Logger log = LoggerFactory.getLogger(LoggerName.STORE_LOGGER_NAME);

// mq总共分配的映射文件内存大小
protected static final AtomicLong TOTAL_MAPPED_VIRTUAL_MEMORY = new AtomicLong(0);

// mq总共创建的内存文件映射数量
protected static final AtomicInteger TOTAL_MAPPED_FILES = new AtomicInteger(0);

protected static final AtomicIntegerFieldUpdater<DefaultMappedFile> WROTE_POSITION_UPDATER;
protected static final AtomicIntegerFieldUpdater<DefaultMappedFile> COMMITTED_POSITION_UPDATER;
protected static final AtomicIntegerFieldUpdater<DefaultMappedFile> FLUSHED_POSITION_UPDATER;

// 当前数据的写入位置指针，下次写数据从此开始写入
protected volatile int wrotePosition;
// 当前数据的提交指针，指针之前的数据已提交到fileChannel，commitPos~writePos之间的数据是还未提交到fileChannel的
protected volatile int committedPosition;
// 当前数据的刷盘指针，指针之前的数据已落盘，commitPos~flushedPos之间的数据是还未落盘的
protected volatile int flushedPosition;
//文件大小 字节
protected int fileSize;
// TODO 磁盘文件的内存文件通道对象 也是mmap的方式体现
protected FileChannel fileChannel;
/**
* Message will put to here first, and then reput to FileChannel if writeBuffer is not null.
*/
// 异步刷盘时数据先写入writeBuf，由CommitRealTime线程定时200ms提交到fileChannel内存，再由FlushRealTime线程定时500ms刷fileChannel落盘
protected ByteBuffer writeBuffer = null;
// 堆外内存池，服务于异步刷盘机制，为了减少内存申请和销毁的时间，提前向OS申请并锁定一块对外内存池，writeBuf就从这里获取
protected TransientStorePool transientStorePool = null;
// 文件起始的字节
protected String fileName;
// 文件的初始消费点位，跟文件的命名相关 例如 00000000000000000000 就代表从0开始，默认一个commitLog是1G 大小，那么超过之后会生成新的commitLog 文件名称就是当前文件起始的偏移量
protected long fileFromOffset;
protected File file;
// 磁盘文件的内存映射对象，同步刷盘时直接将数据写入到mapedBuf
protected MappedByteBuffer mappedByteBuffer;
// 最近操作的时间戳
protected volatile long storeTimestamp = 0;
protected boolean firstCreateInQueue = false;
private long lastFlushTime = -1L;

protected MappedByteBuffer mappedByteBufferWaitToClean = null;
protected long swapMapTime = 0L;
protected long mappedByteBufferAccessCountSinceLastSwap = 0L;
```

首先，核心的DefaultMappedFile 使用了 FileChannel 通道，它也是基于mmap的实现零拷贝技术。

其中它定义了三个指针，分别是：
wrotePosition：当前数据的写入位置指针，下次写数据从此开始写入

committedPosition：当前数据的提交指针，指针之前的数据已提交到fileChannel，commitPos~writePos之间的数据是还未提交到fileChannel的

flushedPosition：当前数据的刷盘指针，指针之前的数据已落盘，commitPos~flushedPos之间的数据是还未落盘的

同时，定义了ByteBuffer，基于NIO在异步刷盘时，先会将数据写入byteBuffer，然后会有定时线程会定时拉取到fileChannel通道，最后将fileChannel进行刷盘

```java
/**
* 根据队列中的AllocateRequest创建下一个commitLog
*/
public void run() {
log.info(this.getServiceName() + " service started");

while (!this.isStopped() && this.mmapOperation()) {

}
log.info(this.getServiceName() + " service end");
}
```

AllocateRequest封装的是对commitLog预处理的动作，AllocateRequest是对预创建commitLog的封装，会在处理时预创建并将放入队列，在store启动时会启动AllocateMappedFileService的线程监听创建

```java
/**
* TODO commitLog 创建预处理封装的核心
* @param nextFilePath
* @param nextNextFilePath
* @param fileSize
* @return
*/
public MappedFile putRequestAndReturnMappedFile(String nextFilePath, String nextNextFilePath, int fileSize) {
int canSubmitRequests = 2;
if (this.messageStore.isTransientStorePoolEnable()) {
if (this.messageStore.getMessageStoreConfig().isFastFailIfNoBufferInStorePool()
&& BrokerRole.SLAVE != this.messageStore.getMessageStoreConfig().getBrokerRole()) { //if broker is slave, don't fast fail even no buffer in pool
canSubmitRequests = this.messageStore.getTransientStorePool().availableBufferNums() - this.requestQueue.size();
}
}

//封装一个AllocateRequest放在队列里，异步线程方式去获取执行
AllocateRequest nextReq = new AllocateRequest(nextFilePath, fileSize);
boolean nextPutOK = this.requestTable.putIfAbsent(nextFilePath, nextReq) == null;

if (nextPutOK) {
if (canSubmitRequests <= 0) {
log.warn("[NOTIFYME]TransientStorePool is not enough, so create mapped file error, " +
"RequestQueueSize : {}, StorePoolSize: {}", this.requestQueue.size(), this.messageStore.getTransientStorePool().availableBufferNums());
this.requestTable.remove(nextFilePath);
return null;
}
boolean offerOK = this.requestQueue.offer(nextReq);
if (!offerOK) {
log.warn("never expected here, add a request to preallocate queue failed");
}
canSubmitRequests--;
}

AllocateRequest nextNextReq = new AllocateRequest(nextNextFilePath, fileSize);
boolean nextNextPutOK = this.requestTable.putIfAbsent(nextNextFilePath, nextNextReq) == null;
if (nextNextPutOK) {
if (canSubmitRequests <= 0) {
log.warn("[NOTIFYME]TransientStorePool is not enough, so skip preallocate mapped file, " +
"RequestQueueSize : {}, StorePoolSize: {}", this.requestQueue.size(), this.messageStore.getTransientStorePool().availableBufferNums());
this.requestTable.remove(nextNextFilePath);
} else {
boolean offerOK = this.requestQueue.offer(nextNextReq);
if (!offerOK) {
log.warn("never expected here, add a request to preallocate queue failed");
}
}
}

if (hasException) {
log.warn(this.getServiceName() + " service has exception. so return null");
return null;
}
// 阻塞等待AllocateMapFile线程创建好文件并返回
AllocateRequest result = this.requestTable.get(nextFilePath);
try {
if (result != null) {
messageStore.getPerfCounter().startTick("WAIT_MAPFILE_TIME_MS");
boolean waitOK = result.getCountDownLatch().await(waitTimeOut, TimeUnit.MILLISECONDS);
messageStore.getPerfCounter().endTick("WAIT_MAPFILE_TIME_MS");
if (!waitOK) {
log.warn("create mmap timeout " + result.getFilePath() + " " + result.getFileSize());
return null;
} else {
this.requestTable.remove(nextFilePath);
return result.getMappedFile();
}
} else {
log.error("find preallocate mmap failed, this never happen");
}
} catch (InterruptedException e) {
log.warn(this.getServiceName() + " service has exception. ", e);
}

```

在 Broker 初始化时会启动管理 MappedFile 创建的 AllocateMappedFileService 异步线程。消息处理线程 和 AllocateMappedFileService 线程通过队列 requestQueue 关联。

消息写入时调用 AllocateMappedFileService 的 putRequestAndReturnMappedFile 方法往 requestQueue 放入提交创建 MappedFile 请求，这边会同时构建两个 AllocateRequest 放入队列。

AllocateMappedFileService 线程循环从 requestQueue 获取 AllocateRequest 来创建 MappedFile。消息处理线程通过 CountDownLatch 等待获取第一个 MappedFile 创建成功就返回。

当消息处理线程需要再次创建 MappedFile 时，此时可以直接获取之前已预创建的 MappedFile。这样通过预创建 MappedFile ，减少文件创建等待时间。

## **store消息存储全流程**

![image](./image-01.jpg)

从图上可以看到，从生产者到消费者，store扮演了重要的角色。

生产者发送消息后，会进行消息存盘，消费者消费消息后，会进行消费进度存盘。

下面我们详细说说store的流程

## **消息存储-从生产者到磁盘**

消息被生产者创建并发送到broker后，会对消息先进行存盘。如果是异步消息，存盘是由单独的子线程定时去处理的，如果是同步消息，则会阻塞等待消息处理完成后再进行返回。

消息首先会经过producer，组装后会通过netty发送给broker，我们只关系broker的处理流程，如果想了解生产者之前的处理方式，可参考之前的文章。

首先，broker中processor是broker对client基于netty的一些动作通知的封装，AbstractSendMessageProcessor上层会封装一些基本功能，例如消息重试，消息发送私信队列，以及一些beforeHook和afterHook前后置处理钩子函数，在producer发送sendMessage动作后，会将req发送至SendMessageProcessor，SendMessageProcessor 是client做sendMessage动作时，broker处理发送消息的加工者。

```java
public RemotingCommand processRequest(ChannelHandlerContext ctx,
RemotingCommand request) throws RemotingCommandException {
SendMessageContext sendMessageContext;
switch (request.getCode()) {
case RequestCode.CONSUMER_SEND_MSG_BACK:
return this.consumerSendMsgBack(ctx, request);
default:
//发送成功的处理
SendMessageRequestHeader requestHeader = parseRequestHeader(request);
if (requestHeader == null) {
return null;
}
TopicQueueMappingContext mappingContext = this.brokerController.getTopicQueueMappingManager().buildTopicQueueMappingContext(requestHeader, true);
RemotingCommand rewriteResult = this.brokerController.getTopicQueueMappingManager().rewriteRequestForStaticTopic(requestHeader, mappingContext);
if (rewriteResult != null) {
return rewriteResult;
}
sendMessageContext = buildMsgContext(ctx, requestHeader, request);
try {
//加载前置钩子函数
this.executeSendMessageHookBefore(sendMessageContext);
} catch (AbortProcessException e) {
final RemotingCommand errorResponse = RemotingCommand.createResponseCommand(e.getResponseCode(), e.getErrorMessage());
errorResponse.setOpaque(request.getOpaque());
return errorResponse;
}

RemotingCommand response;
//针对单消息处理和批量消息处理，并执行后置钩子函数
if (requestHeader.isBatch()) {
response = this.sendBatchMessage(ctx, request, sendMessageContext, requestHeader, mappingContext,
(ctx1, response1) -> executeSendMessageHookAfter(response1, ctx1));
} else {
response = this.sendMessage(ctx, request, sendMessageContext, requestHeader, mappingContext,
(ctx12, response12) -> executeSendMessageHookAfter(response12, ctx12));
}

return response;
}
}
```

如果消息是重试消息，则将消息发送到%retry%-topic队列进行重试，并处理重试等级及重试次数。

这里最核心的是针对单消息处理和批量消息处理，对应的是处理单消息和多消息，broker封装的MessageBatch就是批量消息。

```java
public RemotingCommand sendMessage(final ChannelHandlerContext ctx,
final RemotingCommand request,
final SendMessageContext sendMessageContext,
final SendMessageRequestHeader requestHeader,
final TopicQueueMappingContext mappingContext,
final SendMessageCallback sendMessageCallback) throws RemotingCommandException {

final RemotingCommand response = preSend(ctx, request, requestHeader);
if (response.getCode() != -1) {
return response;
}

final SendMessageResponseHeader responseHeader = (SendMessageResponseHeader) response.readCustomHeader();
//获取消息内容
final byte[] body = request.getBody();

//获取消息指定队列id
int queueIdInt = requestHeader.getQueueId();
TopicConfig topicConfig = this.brokerController.getTopicConfigManager().selectTopicConfig(requestHeader.getTopic());

//如果队列id小于0，默认是非法的id，则重新分配一个队列进行绑定
if (queueIdInt < 0) {
queueIdInt = randomQueueId(topicConfig.getWriteQueueNums());
}

MessageExtBrokerInner msgInner = new MessageExtBrokerInner();
msgInner.setTopic(requestHeader.getTopic());
msgInner.setQueueId(queueIdInt);

Map<String, String> oriProps = MessageDecoder.string2messageProperties(requestHeader.getProperties());
//如果是重试消息或达到最大次数进入死信队列的消息，则直接返回
if (!handleRetryAndDLQ(requestHeader, response, request, msgInner, topicConfig, oriProps)) {
return response;
}

msgInner.setBody(body);
msgInner.setFlag(requestHeader.getFlag());

String uniqKey = oriProps.get(MessageConst.PROPERTY_UNIQ_CLIENT_MESSAGE_ID_KEYIDX);
if (uniqKey == null || uniqKey.length() <= 0) {
uniqKey = MessageClientIDSetter.createUniqID();
oriProps.put(MessageConst.PROPERTY_UNIQ_CLIENT_MESSAGE_ID_KEYIDX, uniqKey);
}

MessageAccessor.setProperties(msgInner, oriProps);

CleanupPolicy cleanupPolicy = CleanupPolicyUtils.getDeletePolicy(Optional.of(topicConfig));
if (Objects.equals(cleanupPolicy, CleanupPolicy.COMPACTION)) {
if (StringUtils.isBlank(msgInner.getKeys())) {
response.setCode(ResponseCode.MESSAGE_ILLEGAL);
response.setRemark("Required message key is missing");
return response;
}
}

msgInner.setTagsCode(MessageExtBrokerInner.tagsString2tagsCode(topicConfig.getTopicFilterType(), msgInner.getTags()));
msgInner.setBornTimestamp(requestHeader.getBornTimestamp());
msgInner.setBornHost(ctx.channel().remoteAddress());
msgInner.setStoreHost(this.getStoreHost());
msgInner.setReconsumeTimes(requestHeader.getReconsumeTimes() == null ? 0 : requestHeader.getReconsumeTimes());
String clusterName = this.brokerController.getBrokerConfig().getBrokerClusterName();
MessageAccessor.putProperty(msgInner, MessageConst.PROPERTY_CLUSTER, clusterName);

msgInner.setPropertiesString(MessageDecoder.messageProperties2String(msgInner.getProperties()));

// Map<String, String> oriProps = MessageDecoder.string2messageProperties(requestHeader.getProperties());
String traFlag = oriProps.get(MessageConst.PROPERTY_TRANSACTION_PREPARED);
boolean sendTransactionPrepareMessage = false;
if (Boolean.parseBoolean(traFlag)
&& !(msgInner.getReconsumeTimes() > 0 && msgInner.getDelayTimeLevel() > 0)) { //For client under version 4.6.1
/**
* 如果当前消息已经被消费者消费了不止一次，或者它的消费次数大于0，说明它已经是一个重复消费的消息了，如果它是一个事务消息，这是不允许的
*/
if (this.brokerController.getBrokerConfig().isRejectTransactionMessage()) {
response.setCode(ResponseCode.NO_PERMISSION);
response.setRemark(
"the broker[" + this.brokerController.getBrokerConfig().getBrokerIP1()
+ "] sending transaction message is forbidden");
return response;
}
sendTransactionPrepareMessage = true;
}

long beginTimeMillis = this.brokerController.getMessageStore().now();

/**
* TODO 这是才是针对消息做的处理，根据broker同步或异步模型，则针对事务消息和普通消息做消息的处理
*/
if (brokerController.getBrokerConfig().isAsyncSendEnable()) {
CompletableFuture<PutMessageResult> asyncPutMessageFuture;
//putMessage 是处理store 消息存储的核心
if (sendTransactionPrepareMessage) {
/**
* @see org.apache.rocketmq.broker.transaction.queue.TransactionalMessageServiceImpl.asyncPrepareMessage
* 将消息包装成half消息
*/
asyncPutMessageFuture = this.brokerController.getTransactionalMessageService().asyncPrepareMessage(msgInner);
} else {
asyncPutMessageFuture = this.brokerController.getMessageStore().asyncPutMessage(msgInner);
}

final int finalQueueIdInt = queueIdInt;
final MessageExtBrokerInner finalMsgInner = msgInner;
/**
* 处理完成后，异步回调handlePutMessageResult，如果是同步模型，则阻塞handlePutMessageResult等待处理，这里跟下文else中处理方式类似，只是采用非阻塞的异步任务处理
*/
asyncPutMessageFuture.thenAcceptAsync(putMessageResult -> {
RemotingCommand responseFuture =
handlePutMessageResult(putMessageResult, response, request, finalMsgInner, responseHeader, sendMessageContext,
ctx, finalQueueIdInt, beginTimeMillis, mappingContext, BrokerMetricsManager.getMessageType(requestHeader));
if (responseFuture != null) {
doResponse(ctx, request, responseFuture);
}
sendMessageCallback.onComplete(sendMessageContext, response);
}, this.brokerController.getPutMessageFutureExecutor());
// Returns null to release the send message thread
return null;
} else {
PutMessageResult putMessageResult = null;
if (sendTransactionPrepareMessage) {
putMessageResult = this.brokerController.getTransactionalMessageService().prepareMessage(msgInner);
} else {
putMessageResult = this.brokerController.getMessageStore().putMessage(msgInner);
}
handlePutMessageResult(putMessageResult, response, request, msgInner, responseHeader, sendMessageContext, ctx, queueIdInt, beginTimeMillis, mappingContext, BrokerMetricsManager.getMessageType(requestHeader));
sendMessageCallback.onComplete(sendMessageContext, response);
return response;
}
}
```

首先进行前期的组装，消息体，设置队列id，丢弃一部分不合法消息，如重试消息或达到死信队列的消息。

再将消息进行分类，如果是异步消息，且消息类型为事务消息，则异步处理一个asyncHalf，如果是其他类型的消息，根据消息内容进行异步的存储

```java
//putMessage 是处理store 消息存储的核心
if (sendTransactionPrepareMessage) {
/**
* @see org.apache.rocketmq.broker.transaction.queue.TransactionalMessageServiceImpl.asyncPrepareMessage
* 将消息包装成half消息
*/
asyncPutMessageFuture = this.brokerController.getTransactionalMessageService().asyncPrepareMessage(msgInner);
} else {
asyncPutMessageFuture = this.brokerController.getMessageStore().asyncPutMessage(msgInner);
}
```

等待future处理完成后，异步回调handlePutMessageResult，如果是同步模型，则阻塞handlePutMessageResult等待处理，这里跟下文else中处理方式类似，只是采用非阻塞的异步任务处理；同步方式处理的流程是一样的，只是使用主线程阻塞处理。

如果是采取异步处理，根据上一次的刷盘时间和策略定义3000ms时间进行线程监控，监控流程类似jdk9中对completableFuture中使用get阻塞超时时间。

```java
@Override
public PutMessageResult putMessage(MessageExtBrokerInner msg) {
return waitForPutResult(asyncPutMessage(msg));
}
//future异步任务的超时处理
private PutMessageResult waitForPutResult(CompletableFuture<PutMessageResult> putMessageResultFuture) {
try {
int putMessageTimeout =
Math.max(this.messageStoreConfig.getSyncFlushTimeout(),
this.messageStoreConfig.getSlaveTimeout()) + 5000;
return putMessageResultFuture.get(putMessageTimeout, TimeUnit.MILLISECONDS);
} catch (ExecutionException | InterruptedException e) {
return new PutMessageResult(PutMessageStatus.UNKNOWN_ERROR, null);
} catch (TimeoutException e) {
LOGGER.error("usually it will never timeout, putMessageTimeout is much bigger than slaveTimeout and "
+ "flushTimeout so the result can be got anyway, but in some situations timeout will happen like full gc "
+ "process hangs or other unexpected situations.");
return new PutMessageResult(PutMessageStatus.UNKNOWN_ERROR, null);
}
}
```

真正对消息存储的处理，在DefaultMessageStore的asyncPutMessage中

```java
public CompletableFuture<PutMessageResult> asyncPutMessage(MessageExtBrokerInner msg) {

//先指定初始化的前置钩子函数
for (PutMessageHook putMessageHook : putMessageHookList) {
PutMessageResult handleResult = putMessageHook.executeBeforePutMessage(msg);
if (handleResult != null) {
return CompletableFuture.completedFuture(handleResult);
}
}

/**
* 检查消息的格式，如果格式不合法则直接中断
*/
if (msg.getProperties().containsKey(MessageConst.PROPERTY_INNER_NUM)
&& !MessageSysFlag.check(msg.getSysFlag(), MessageSysFlag.INNER_BATCH_FLAG)) {
LOGGER.warn("[BUG]The message had property {} but is not an inner batch", MessageConst.PROPERTY_INNER_NUM);
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.MESSAGE_ILLEGAL, null));
}

if (MessageSysFlag.check(msg.getSysFlag(), MessageSysFlag.INNER_BATCH_FLAG)) {
Optional<TopicConfig> topicConfig = this.getTopicConfig(msg.getTopic());
if (!QueueTypeUtils.isBatchCq(topicConfig)) {
LOGGER.error("[BUG]The message is an inner batch but cq type is not batch cq");
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.MESSAGE_ILLEGAL, null));
}
}

long beginTime = this.getSystemClock().now();
//commitLog处理消息
CompletableFuture<PutMessageResult> putResultFuture = this.commitLog.asyncPutMessage(msg);

/**
* 计算future存储消息所用的时间并将其更新
*/
putResultFuture.thenAccept(result -> {
long elapsedTime = this.getSystemClock().now() - beginTime;
if (elapsedTime > 500) {
LOGGER.warn("DefaultMessageStore#putMessage: CommitLog#putMessage cost {}ms, topic={}, bodyLength={}",
elapsedTime, msg.getTopic(), msg.getBody().length);
}
this.storeStatsService.setPutMessageEntireTimeMax(elapsedTime);

if (null == result || !result.isOk()) {
//如果处理失败，则增加一次保存消息失败的次数
this.storeStatsService.getPutMessageFailedTimes().add(1);
}
});

return putResultFuture;
}
```

可以看到其实asyncPutMessage将处理结果封装成completableFuture异步执行，开始先做了HookBefore的前置钩子函数，然后检查消息格式以及topic的配置，最后在处理完成后更新了处理的时间和失败次数在storeStatus的成员变量中。其中最核心的操作其实是**CompletableFuture<PutMessageResult> putResultFuture = this.commitLog.asyncPutMessage(msg); ，**它是根据消息进行append，最核心的处理文件的方式就是mappedFileChannel

```java
/**
* TODO 核心存储消息的代码
* @param msg
* @return
*/
public CompletableFuture<PutMessageResult> asyncPutMessage(final MessageExtBrokerInner msg) {
// Set the storage time
if (!defaultMessageStore.getMessageStoreConfig().isDuplicationEnable()) {
msg.setStoreTimestamp(System.currentTimeMillis());
}

// Set the message body CRC (consider the most appropriate setting on the client)
msg.setBodyCRC(UtilAll.crc32(msg.getBody()));
// Back to Results
AppendMessageResult result = null;

StoreStatsService storeStatsService = this.defaultMessageStore.getStoreStatsService();

String topic = msg.getTopic();
msg.setVersion(MessageVersion.MESSAGE_VERSION_V1);
boolean autoMessageVersionOnTopicLen =
this.defaultMessageStore.getMessageStoreConfig().isAutoMessageVersionOnTopicLen();
if (autoMessageVersionOnTopicLen && topic.length() > Byte.MAX_VALUE) {
msg.setVersion(MessageVersion.MESSAGE_VERSION_V2);
}

InetSocketAddress bornSocketAddress = (InetSocketAddress) msg.getBornHost();
if (bornSocketAddress.getAddress() instanceof Inet6Address) {
msg.setBornHostV6Flag();
}

InetSocketAddress storeSocketAddress = (InetSocketAddress) msg.getStoreHost();
if (storeSocketAddress.getAddress() instanceof Inet6Address) {
msg.setStoreHostAddressV6Flag();
}

//获取本地线程的变量，并更新最大消息大小
PutMessageThreadLocal putMessageThreadLocal = this.putMessageThreadLocal.get();
updateMaxMessageSize(putMessageThreadLocal);
//根据topic和queue的messgae信息组装成一个唯一的topicQueueKey 格式为：topic-queueId
String topicQueueKey = generateKey(putMessageThreadLocal.getKeyBuilder(), msg);
long elapsedTimeInLock = 0;
MappedFile unlockMappedFile = null;
//TODO 获取上一次操作的mapperFile 也就是最后的一个mapped
MappedFile mappedFile = this.mappedFileQueue.getLastMappedFile();

//如果当前没有mappedFile 说明是第一次创建，则从最开始进行位置计算
long currOffset;
if (mappedFile == null) {
currOffset = 0;
} else {
//如果有说明当前的消息应该存储在 当前commit文件名的位置加上当前指针已经偏移的位置
currOffset = mappedFile.getFileFromOffset() + mappedFile.getWrotePosition();
}

//计算需要ack的数量以及是否需要做HA通知broker
int needAckNums = this.defaultMessageStore.getMessageStoreConfig().getInSyncReplicas();
boolean needHandleHA = needHandleHA(msg);

if (needHandleHA && this.defaultMessageStore.getBrokerConfig().isEnableControllerMode()) {
if (this.defaultMessageStore.getHaService().inSyncReplicasNums(currOffset) < this.defaultMessageStore.getMessageStoreConfig().getMinInSyncReplicas()) {
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.IN_SYNC_REPLICAS_NOT_ENOUGH, null));
}
if (this.defaultMessageStore.getMessageStoreConfig().isAllAckInSyncStateSet()) {
// -1 means all ack in SyncStateSet
needAckNums = MixAll.ALL_ACK_IN_SYNC_STATE_SET;
}
} else if (needHandleHA && this.defaultMessageStore.getBrokerConfig().isEnableSlaveActingMaster()) {
int inSyncReplicas = Math.min(this.defaultMessageStore.getAliveReplicaNumInGroup(),
this.defaultMessageStore.getHaService().inSyncReplicasNums(currOffset));
needAckNums = calcNeedAckNums(inSyncReplicas);
if (needAckNums > inSyncReplicas) {
// Tell the producer, don't have enough slaves to handle the send request
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.IN_SYNC_REPLICAS_NOT_ENOUGH, null));
}
}

//对当前指定的key进行锁定，当前key说明是一个topic下一个队列
topicQueueLock.lock(topicQueueKey);
try {

boolean needAssignOffset = true;
if (defaultMessageStore.getMessageStoreConfig().isDuplicationEnable()
&& defaultMessageStore.getMessageStoreConfig().getBrokerRole() != BrokerRole.SLAVE) {
needAssignOffset = false;
}
if (needAssignOffset) {
defaultMessageStore.assignOffset(msg, getMessageNum(msg));
}

PutMessageResult encodeResult = putMessageThreadLocal.getEncoder().encode(msg);
if (encodeResult != null) {
return CompletableFuture.completedFuture(encodeResult);
}
msg.setEncodedBuff(putMessageThreadLocal.getEncoder().getEncoderBuffer());
//存储消息的上下文
PutMessageContext putMessageContext = new PutMessageContext(topicQueueKey);

//spin或ReentrantLock，具体取决于存储配置
putMessageLock.lock(); //spin or ReentrantLock ,depending on store config
try {
//加锁成功后的时间
long beginLockTimestamp = this.defaultMessageStore.getSystemClock().now();
this.beginTimeInLock = beginLockTimestamp;

// Here settings are stored timestamp, in order to ensure an orderly
// global
//设置存储时间为加锁成功后的时间，保证顺序
if (!defaultMessageStore.getMessageStoreConfig().isDuplicationEnable()) {
msg.setStoreTimestamp(beginLockTimestamp);
}

//如果当前没有mapped或mapped已经满了，则会创建新的mapped
if (null == mappedFile || mappedFile.isFull()) {
mappedFile = this.mappedFileQueue.getLastMappedFile(0); // Mark: NewFile may be cause noise
}
if (null == mappedFile) {
log.error("create mapped file1 error, topic: " + msg.getTopic() + " clientAddr: " + msg.getBornHostString());
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.CREATE_MAPPED_FILE_FAILED, null));
}

//追加写入的内容
result = mappedFile.appendMessage(msg, this.appendMessageCallback, putMessageContext);
switch (result.getStatus()) {
case PUT_OK:
onCommitLogAppend(msg, result, mappedFile);
break;
case END_OF_FILE:
//如果文件空间不足，重新初始化文件并尝试重新写入
onCommitLogAppend(msg, result, mappedFile);
unlockMappedFile = mappedFile;
// Create a new file, re-write the message
mappedFile = this.mappedFileQueue.getLastMappedFile(0);
if (null == mappedFile) {
// XXX: warn and notify me
log.error("create mapped file2 error, topic: " + msg.getTopic() + " clientAddr: " + msg.getBornHostString());
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.CREATE_MAPPED_FILE_FAILED, result));
}
result = mappedFile.appendMessage(msg, this.appendMessageCallback, putMessageContext);
if (AppendMessageStatus.PUT_OK.equals(result.getStatus())) {
onCommitLogAppend(msg, result, mappedFile);
}
break;
case MESSAGE_SIZE_EXCEEDED:
case PROPERTIES_SIZE_EXCEEDED:
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.MESSAGE_ILLEGAL, result));
case UNKNOWN_ERROR:
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.UNKNOWN_ERROR, result));
default:
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.UNKNOWN_ERROR, result));
}

//更新使用的时间
elapsedTimeInLock = this.defaultMessageStore.getSystemClock().now() - beginLockTimestamp;
beginTimeInLock = 0;
} finally {
//释放锁
putMessageLock.unlock();
}
} finally {
//释放锁
topicQueueLock.unlock(topicQueueKey);
}

if (elapsedTimeInLock > 500) {
log.warn("[NOTIFYME]putMessage in lock cost time(ms)={}, bodyLength={} AppendMessageResult={}", elapsedTimeInLock, msg.getBody().length, result);
}

if (null != unlockMappedFile && this.defaultMessageStore.getMessageStoreConfig().isWarmMapedFileEnable()) {
this.defaultMessageStore.unlockMappedFile(unlockMappedFile);
}

PutMessageResult putMessageResult = new PutMessageResult(PutMessageStatus.PUT_OK, result);

// Statistics
//存储缓存数据副本的更新
storeStatsService.getSinglePutMessageTopicTimesTotal(msg.getTopic()).add(result.getMsgNum());
storeStatsService.getSinglePutMessageTopicSizeTotal(topic).add(result.getWroteBytes());

//提交刷盘请求，提交副本请求
return handleDiskFlushAndHA(putMessageResult, msg, needAckNums, needHandleHA);
}
```

先设置一些基本数据，如存储时间，brokerHost，storeHost，获取本地变量LocalThread，更新最大的消息存储大小；

根据topic和queue的messgae信息组装成一个唯一的topicQueueKey 格式为：topic-queueId；获取上一次操作的mapperFile 也就是最后的一个mapped，因为消息的写入是append追加的，消息的持久化都是集中存储的；

如果没有获取到使用过的mappedFileChannel，说明这条消息可能是第一条，那么就创建一个fileChannel通道，如果没有消息那么消费的初始点位肯定是0，如果获取到了fileChannel，其实对应的commitlog文件的名称就是这个文件最开始的消费点位，那么当前消息对应的消费点位其实就是获取到的mappedFile的文件名称 + 当前消息所处的offSet的位置 就是这个文件存储的位置；

校验HA和ack；

先对 topicQueueKey进行锁定，这个key生成的规则是topic下的一个queue，计算这次消费的消费点位；

定义存储消息的上下文 PutMessageContext：

```java
public class PutMessageContext {
private String topicQueueTableKey;//锁定的key
private long[] phyPos;
private int batchSize;//批量数据的大小

public PutMessageContext(String topicQueueTableKey) {
this.topicQueueTableKey = topicQueueTableKey;
}
}
```

对putMessageLock进行锁定：这里锁定有两种方式：自旋锁和重入锁、

```java
/**
* Spin lock Implementation to put message, suggest using this with low race conditions
*/
public class PutMessageSpinLock implements PutMessageLock {
//true: Can lock, false : in lock.
private AtomicBoolean putMessageSpinLock = new AtomicBoolean(true);

@Override
public void lock() {
boolean flag;
do {
flag = this.putMessageSpinLock.compareAndSet(true, false);
}
while (!flag);
}

@Override
public void unlock() {
this.putMessageSpinLock.compareAndSet(false, true);
}
}
/**
* Exclusive lock implementation to put message
*/
public class PutMessageReentrantLock implements PutMessageLock {
private ReentrantLock putMessageNormalLock = new ReentrantLock(); // NonfairSync

@Override
public void lock() {
putMessageNormalLock.lock();
}

@Override
public void unlock() {
putMessageNormalLock.unlock();
}
}
```

在rocket4.X之后，应该都是默认true，**异步刷盘建议使用自旋锁，同步刷盘建议使用重入锁，调整Broker配置项`useReentrantLockWhenPutMessage`，默认为false；异步刷盘建议开启`TransientStorePoolEnable`；建议关闭transferMsgByHeap，提高拉消息效率；同步刷盘建议适当增大`sendMessageThreadPoolNums`，具体配置需要经过压测**。

设置成功加锁后的时间，保证了操作的顺序。上一步获取的mappedFile如果没有获取到或者已经获取满了，则需要创建新的mappedFile；

```java
/**
* TODO 预处理创建新的commitLog
* @return
*/
public MappedFile getLastMappedFile(final long startOffset, boolean needCreate) {
long createOffset = -1;
/**
* 获取最新的mappedFile
*/
MappedFile mappedFileLast = getLastMappedFile();

//如果获取不到，则说明是第一次创建文件
if (mappedFileLast == null) {
createOffset = startOffset - (startOffset % this.mappedFileSize);
}

/**
* 如果文件写满了，则需要计算下一个文件的初始量 其实就是上一个文件最后的偏移量的下一个
*/
if (mappedFileLast != null && mappedFileLast.isFull()) {
createOffset = mappedFileLast.getFileFromOffset() + this.mappedFileSize;
}

//创建新的commitLog
if (createOffset != -1 && needCreate) {
return tryCreateMappedFile(createOffset);
}

return mappedFileLast;
}
```

追加需要写入的数据 result = mappedFile.appendMessage(msg, this.appendMessageCallback, putMessageContext);

```java
/**
* TODO append 统一为fileChannel 对文件的写入 提供了单消息和批量消息的写入
*/
public AppendMessageResult appendMessage(final ByteBuffer byteBufferMsg, final CompactionAppendMsgCallback cb) {
assert byteBufferMsg != null;
assert cb != null;

//获取当前写入的位置
int currentPos = WROTE_POSITION_UPDATER.get(this);
//当前写入的位置需要比文件最大的位数要小
if (currentPos < this.fileSize) {
//根据appendMessageBuffer选择是否写入writeBuffer还是mapperByteBuffer 异步刷盘应该写入writeBuffer 再定时写到mapperBuffer
ByteBuffer byteBuffer = appendMessageBuffer().slice();
//修改写入位置
byteBuffer.position(currentPos);
AppendMessageResult result = cb.doAppend(byteBuffer, this.fileFromOffset, this.fileSize - currentPos, byteBufferMsg);
//AtomicInteger累计更新写入的位置 WROTE_POSITION_UPDATER其实就是当前已经存储文件的字节
WROTE_POSITION_UPDATER.addAndGet(this, result.getWroteBytes());
//更新最后一次写入时间
this.storeTimestamp = result.getStoreTimestamp();
return result;
}
log.error("MappedFile.appendMessage return null, wrotePosition: {} fileSize: {}", currentPos, this.fileSize);
return new AppendMessageResult(AppendMessageStatus.UNKNOWN_ERROR);
}

```

写入处理后，根据响应状态处理，store提供了 onCommitLogAppend的提交后追加处理，如果当前写入失败是因为写入的长度不满足，则尝试重新创建文件并写入

```java
switch (result.getStatus()) {
case PUT_OK:
onCommitLogAppend(msg, result, mappedFile);
break;
case END_OF_FILE:
//如果文件空间不足，重新初始化文件并尝试重新写入
onCommitLogAppend(msg, result, mappedFile);
unlockMappedFile = mappedFile;
// Create a new file, re-write the message
mappedFile = this.mappedFileQueue.getLastMappedFile(0);
if (null == mappedFile) {
// XXX: warn and notify me
log.error("create mapped file2 error, topic: " + msg.getTopic() + " clientAddr: " + msg.getBornHostString());
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.CREATE_MAPPED_FILE_FAILED, result));
}
result = mappedFile.appendMessage(msg, this.appendMessageCallback, putMessageContext);
if (AppendMessageStatus.PUT_OK.equals(result.getStatus())) {
onCommitLogAppend(msg, result, mappedFile);
}
break;
case MESSAGE_SIZE_EXCEEDED:
case PROPERTIES_SIZE_EXCEEDED:
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.MESSAGE_ILLEGAL, result));
case UNKNOWN_ERROR:
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.UNKNOWN_ERROR, result));
default:
beginTimeInLock = 0;
return CompletableFuture.completedFuture(new PutMessageResult(PutMessageStatus.UNKNOWN_ERROR, result));
}
```

处理完成后，释放锁，缓存数据副本更新，提交刷盘并提交HA

```java
/**
* 通知刷盘并HA的核心代码
* @return
*/
private CompletableFuture<PutMessageResult> handleDiskFlushAndHA(PutMessageResult putMessageResult,
MessageExt messageExt, int needAckNums, boolean needHandleHA) {
/**
* 同步刷盘或异步刷盘的任务
*/
CompletableFuture<PutMessageStatus> flushResultFuture = handleDiskFlush(putMessageResult.getAppendMessageResult(), messageExt);
CompletableFuture<PutMessageStatus> replicaResultFuture;
if (!needHandleHA) {
replicaResultFuture = CompletableFuture.completedFuture(PutMessageStatus.PUT_OK);
} else {
replicaResultFuture = handleHA(putMessageResult.getAppendMessageResult(), putMessageResult, needAckNums);
}

return flushResultFuture.thenCombine(replicaResultFuture, (flushStatus, replicaStatus) -> {
if (flushStatus != PutMessageStatus.PUT_OK) {
putMessageResult.setPutMessageStatus(flushStatus);
}
if (replicaStatus != PutMessageStatus.PUT_OK) {
putMessageResult.setPutMessageStatus(replicaStatus);
}
return putMessageResult;
});
}
@Override
public CompletableFuture<PutMessageStatus> handleDiskFlush(AppendMessageResult result, MessageExt messageExt) {
// Synchronization flush
//同步刷盘
if (FlushDiskType.SYNC_FLUSH == CommitLog.this.defaultMessageStore.getMessageStoreConfig().getFlushDiskType()) {
final GroupCommitService service = (GroupCommitService) this.flushCommitLogService;
if (messageExt.isWaitStoreMsgOK()) {
GroupCommitRequest request = new GroupCommitRequest(result.getWroteOffset() + result.getWroteBytes(), CommitLog.this.defaultMessageStore.getMessageStoreConfig().getSyncFlushTimeout());
//将刷盘request：GroupCommitRequest放入commitRequests
flushDiskWatcher.add(request);
service.putRequest(request);
return request.future();
} else {
//唤醒线程去消费
service.wakeup();
return CompletableFuture.completedFuture(PutMessageStatus.PUT_OK);
}
}
// Asynchronous flush
//异步，唤醒线程就返回
else {
if (!CommitLog.this.defaultMessageStore.isTransientStorePoolEnable()) {
flushCommitLogService.wakeup();
} else {
commitRealTimeService.wakeup();
}
return CompletableFuture.completedFuture(PutMessageStatus.PUT_OK);
}
}
```

处理完成后，再进行onComplete对后置HookAfter钩子函数的回调

## **消息存储-从消费者到磁盘**

### **消费者拉取**

consumer在startUp时会启动一个线程池异步去指定拉取的动作，pullRequest，client端的流程不在本篇具体描述，流程可以参考之前的文章，如何保证不重复消费。本篇主要考虑在 broker中processoe中如何根据store做消费进度持久化和拉取的。

broker核心处理拉取方法：

```java
/**
* TODO broker processor拉取对应消息的核心代码
* 同样的写法 上层做了异步的CompletableFuture，真正拉取的地方在 @see DefaultMessageStore#getMessage
*/
messageStore.getMessageAsync(group, topic, queueId, requestHeader.getQueueOffset(),
requestHeader.getMaxMsgNums(), messageFilter)
/**
* TODO broker根据持久化存储拉取文件的处理
* @return
*/
@Override
public GetMessageResult getMessage(final String group, final String topic, final int queueId, final long offset,
final int maxMsgNums, final int maxTotalMsgSize, final MessageFilter messageFilter) {
//判断当前状态
if (this.shutdown) {
LOGGER.warn("message store has shutdown, so getMessage is forbidden");
return null;
}

if (!this.runningFlags.isReadable()) {
LOGGER.warn("message store is not readable, so getMessage is forbidden " + this.runningFlags.getFlagBits());
return null;
}

Optional<TopicConfig> topicConfig = getTopicConfig(topic);
CleanupPolicy policy = CleanupPolicyUtils.getDeletePolicy(topicConfig);
//check request topic flag
//操作标记是过期清理，则通过compactionStore.getMessage获取消息
if (Objects.equals(policy, CleanupPolicy.COMPACTION) && messageStoreConfig.isEnableCompaction()) {
return compactionStore.getMessage(group, topic, queueId, offset, maxMsgNums, maxTotalMsgSize);
} // else skip

long beginTime = this.getSystemClock().now();

GetMessageStatus status = GetMessageStatus.NO_MESSAGE_IN_QUEUE;
long nextBeginOffset = offset;
long minOffset = 0;
long maxOffset = 0;

GetMessageResult getResult = new GetMessageResult();

//获取当前最大消费进度
final long maxOffsetPy = this.commitLog.getMaxOffset();

//TODO 获取消费队列信息
ConsumeQueueInterface consumeQueue = findConsumeQueue(topic, queueId);
if (consumeQueue != null) {
minOffset = consumeQueue.getMinOffsetInQueue();
maxOffset = consumeQueue.getMaxOffsetInQueue();

if (maxOffset == 0) {
//offSet一直没有东西或者没有被消费过，那么将下一个初始的消费设置成0
status = GetMessageStatus.NO_MESSAGE_IN_QUEUE;
nextBeginOffset = nextOffsetCorrection(offset, 0);
} else if (offset < minOffset) {
//如果当前消费点位比最小的还小，那么它就是最小的
status = GetMessageStatus.OFFSET_TOO_SMALL;
nextBeginOffset = nextOffsetCorrection(offset, minOffset);
} else if (offset == maxOffset) {
//如果当前消费点位跟最大的相同
status = GetMessageStatus.OFFSET_OVERFLOW_ONE;
nextBeginOffset = nextOffsetCorrection(offset, offset);
} else if (offset > maxOffset) {
//如果当前消费点位已经比最大的还大了
status = GetMessageStatus.OFFSET_OVERFLOW_BADLY;
nextBeginOffset = nextOffsetCorrection(offset, maxOffset);
} else {
//当前消费点位在最大和最小的之间
//一次拉取过滤的最大消息数量
final int maxFilterMessageSize = Math.max(16000, maxMsgNums * consumeQueue.getUnitSize());
final boolean diskFallRecorded = this.messageStoreConfig.isDiskFallRecorded();

//设置一次拉取最大的消息数量
long maxPullSize = Math.max(maxTotalMsgSize, 100);
if (maxPullSize > MAX_PULL_MSG_SIZE) {
LOGGER.warn("The max pull size is too large maxPullSize={} topic={} queueId={}", maxPullSize, topic, queueId);
maxPullSize = MAX_PULL_MSG_SIZE;
}
status = GetMessageStatus.NO_MATCHED_MESSAGE;
long maxPhyOffsetPulling = 0;
int cqFileNum = 0;

while (getResult.getBufferTotalSize() <= 0
&& nextBeginOffset < maxOffset
&& cqFileNum++ < this.messageStoreConfig.getTravelCqFileNumWhenGetMessage()) {
//根据当前指定的点位进行过滤 nextBeginOffset就是这次需要从哪里开始拉
ReferredIterator<CqUnit> bufferConsumeQueue = consumeQueue.iterateFrom(nextBeginOffset);

if (bufferConsumeQueue == null) {
status = GetMessageStatus.OFFSET_FOUND_NULL;
nextBeginOffset = nextOffsetCorrection(nextBeginOffset, this.consumeQueueStore.rollNextFile(consumeQueue, nextBeginOffset));
LOGGER.warn("consumer request topic: " + topic + "offset: " + offset + " minOffset: " + minOffset + " maxOffset: "
+ maxOffset + ", but access logic queue failed. Correct nextBeginOffset to " + nextBeginOffset);
break;
}

try {
long nextPhyFileStartOffset = Long.MIN_VALUE;
/**
* 当前拉取的点位小于最大的消费点位时，进行拉取
*/
while (bufferConsumeQueue.hasNext()
&& nextBeginOffset < maxOffset) {
CqUnit cqUnit = bufferConsumeQueue.next();
//计算出消息在commitlog中存储的位置
long offsetPy = cqUnit.getPos();
//计算出消息在commitlog中存储的大小
int sizePy = cqUnit.getSize();

//按照偏移量估算出提交的内存
boolean isInMem = estimateInMemByCommitOffset(offsetPy, maxOffsetPy);

//如果当前大小已经超过指定过滤的大小，则不做处理 默认大小是16000
if ((cqUnit.getQueueOffset() - offset) * consumeQueue.getUnitSize() > maxFilterMessageSize) {
break;
}

//判断是否已经满了
if (this.isTheBatchFull(sizePy, cqUnit.getBatchNum(), maxMsgNums, maxPullSize, getResult.getBufferTotalSize(), getResult.getMessageCount(), isInMem)) {
break;
}

if (getResult.getBufferTotalSize() >= maxPullSize) {
break;
}

maxPhyOffsetPulling = offsetPy;

//Be careful, here should before the isTheBatchFull
nextBeginOffset = cqUnit.getQueueOffset() + cqUnit.getBatchNum();

if (nextPhyFileStartOffset != Long.MIN_VALUE) {
if (offsetPy < nextPhyFileStartOffset) {
continue;
}
}

/**
* 根据过滤器过滤消息
*/
if (messageFilter != null
&& !messageFilter.isMatchedByConsumeQueue(cqUnit.getValidTagsCodeAsLong(), cqUnit.getCqExtUnit())) {
if (getResult.getBufferTotalSize() == 0) {
status = GetMessageStatus.NO_MATCHED_MESSAGE;
}

continue;
}

/**
* 根据消费点位拉取到对应的消息流
*/
SelectMappedBufferResult selectResult = this.commitLog.getMessage(offsetPy, sizePy);
if (null == selectResult) {
if (getResult.getBufferTotalSize() == 0) {
status = GetMessageStatus.MESSAGE_WAS_REMOVING;
}

nextPhyFileStartOffset = this.commitLog.rollNextFile(offsetPy);
continue;
}

//消息过滤
if (messageFilter != null
&& !messageFilter.isMatchedByCommitLog(selectResult.getByteBuffer().slice(), null)) {
if (getResult.getBufferTotalSize() == 0) {
status = GetMessageStatus.NO_MATCHED_MESSAGE;
}
// release...
selectResult.release();
continue;
}
//填充拉取到的消息
this.storeStatsService.getGetMessageTransferredMsgCount().add(cqUnit.getBatchNum());
getResult.addMessage(selectResult, cqUnit.getQueueOffset(), cqUnit.getBatchNum());
status = GetMessageStatus.FOUND;
nextPhyFileStartOffset = Long.MIN_VALUE;
}
} finally {
bufferConsumeQueue.release();
}
}

if (diskFallRecorded) {
long fallBehind = maxOffsetPy - maxPhyOffsetPulling;
brokerStatsManager.recordDiskFallBehindSize(group, topic, queueId, fallBehind);
}

long diff = maxOffsetPy - maxPhyOffsetPulling;
long memory = (long) (StoreUtil.TOTAL_PHYSICAL_MEMORY_SIZE
* (this.messageStoreConfig.getAccessMessageInMemoryMaxRatio() / 100.0));
getResult.setSuggestPullingFromSlave(diff > memory);
}
} else {
status = GetMessageStatus.NO_MATCHED_LOGIC_QUEUE;
nextBeginOffset = nextOffsetCorrection(offset, 0);
}

//跟新本地成员变量统计信息
if (GetMessageStatus.FOUND == status) {
this.storeStatsService.getGetMessageTimesTotalFound().add(1);
} else {
this.storeStatsService.getGetMessageTimesTotalMiss().add(1);
}
long elapsedTime = this.getSystemClock().now() - beginTime;
this.storeStatsService.setGetMessageEntireTimeMax(elapsedTime);

/**
* 如果这次没有拉到数据，则把对应的消费点位放进来返回
*/
// lazy init no data found.
if (getResult == null) {
getResult = new GetMessageResult(0);
}

getResult.setStatus(status);
getResult.setNextBeginOffset(nextBeginOffset);
getResult.setMaxOffset(maxOffset);
getResult.setMinOffset(minOffset);
return getResult;
}
```

判断当前服务状态；

核心处理：获取当前消费的最大进度，最大消费进度就是当前消费的位置，根据当前消费节点和当前持有文件初始节点计算；

获取消费队列信息；

计算当前队列的消费位置最大最小位置，如果offset时0说明offSet一直没有东西或者没有被消费过，那么将下一个初始的消费设置成0；如果当前点位比最小的点位还小，那么它就是最小的点位；如果它刚好等于最大的点位，说明它消费超过了一个，如果它比最大消费点位还大，说明它的消费是错误的；如果它刚好在最大最小中间，那么要知道我这次最多能过滤多少消息， Math.max(16000, maxMsgNums * consumeQueue.getUnitSize()); 我也要知道我最多能拉取多少消息 Math.max(maxTotalMsgSize, 100); 这时根据要拉取的点位遍历拉取：

```java
public SelectMappedBufferResult getMessage(final long offset, final int size) {
int mappedFileSize = this.defaultMessageStore.getMessageStoreConfig().getMappedFileSizeCommitLog();
MappedFile mappedFile = this.mappedFileQueue.findMappedFileByOffset(offset, offset == 0);
if (mappedFile != null) {
//获取到当前文件对应的位置，如果它小于1024 * 1024 * 1024 则就会在文件中顺序分配
int pos = (int) (offset % mappedFileSize);
return mappedFile.selectMappedBuffer(pos, size);
}
return null;
}
```

### **消费者消费**

消费完成后，核心的处理逻辑在 ConsumeMessageConcurrentlyService.this.processConsumeResult中实现：

```java
/**
* TODO 消费者完成后的处理
* @param status
* @param context
* @param consumeRequest
*/
public void processConsumeResult(
final ConsumeConcurrentlyStatus status,
final ConsumeConcurrentlyContext context,
final ConsumeRequest consumeRequest
) {
int ackIndex = context.getAckIndex();

if (consumeRequest.getMsgs().isEmpty())
return;

/**
* 消费成功或失败的处理 默认ackIndex最大为Integer.max 这里需要计算一条消息或一批消息处理的偏移量
* 如果设置的ackIndex大于当前处理消息的长度，则ackIndex应该是size -1
*/
switch (status) {
case CONSUME_SUCCESS:
if (ackIndex >= consumeRequest.getMsgs().size()) {
ackIndex = consumeRequest.getMsgs().size() - 1;
}
int ok = ackIndex + 1;
int failed = consumeRequest.getMsgs().size() - ok;
//维护消息处理成功或失败的量
this.getConsumerStatsManager().incConsumeOKTPS(consumerGroup, consumeRequest.getMessageQueue().getTopic(), ok);
this.getConsumerStatsManager().incConsumeFailedTPS(consumerGroup, consumeRequest.getMessageQueue().getTopic(), failed);
break;
case RECONSUME_LATER:
ackIndex = -1;
this.getConsumerStatsManager().incConsumeFailedTPS(consumerGroup, consumeRequest.getMessageQueue().getTopic(),
consumeRequest.getMsgs().size());
break;
default:
break;
}

/**
* 这里是针对消息重试的处理 广播模式是不需要消费重试的 所以不做任何处理
* 集群模式处理有一点不同的是：如果上文返回的是处理失败，那么ackIndex一定为-1 这时你重试的消息就是这个request下所有的消息，因为从0的下标开始到结束都需要重试
* 如果是批量消费，其实ackIndex设置的就是需要做重试的消息下标，那么上文 ackIndex = consumeRequest.getMsgs().size() - 1; 说明ackIndex是不会大于msgs最大数量的下标位置
*/
switch (this.defaultMQPushConsumer.getMessageModel()) {
case BROADCASTING:
for (int i = ackIndex + 1; i < consumeRequest.getMsgs().size(); i++) {
MessageExt msg = consumeRequest.getMsgs().get(i);
log.warn("BROADCASTING, the message consume failed, drop it, {}", msg.toString());
}
break;
case CLUSTERING:
List<MessageExt> msgBackFailed = new ArrayList<>(consumeRequest.getMsgs().size());
for (int i = ackIndex + 1; i < consumeRequest.getMsgs().size(); i++) {
MessageExt msg = consumeRequest.getMsgs().get(i);
// Maybe message is expired and cleaned, just ignore it.
if (!consumeRequest.getProcessQueue().containsMessage(msg)) {
log.info("Message is not found in its process queue; skip send-back-procedure, topic={}, "
+ "brokerName={}, queueId={}, queueOffset={}", msg.getTopic(), msg.getBrokerName(),
msg.getQueueId(), msg.getQueueOffset());
continue;
}
/**
* 针对需要重试的消息，将消息发送sendMessageBack 并且将消息设置重试次数
*/
boolean result = this.sendMessageBack(msg, context);
if (!result) {
msg.setReconsumeTimes(msg.getReconsumeTimes() + 1);
msgBackFailed.add(msg);
}
}

/**
* 将所有重试的消息进行回退，然后对成功处理的消息做进一步提交
*/
if (!msgBackFailed.isEmpty()) {
consumeRequest.getMsgs().removeAll(msgBackFailed);

this.submitConsumeRequestLater(msgBackFailed, consumeRequest.getProcessQueue(), consumeRequest.getMessageQueue());
}
break;
default:
break;
}

/**
* 计算处理的offSet偏移量 这里consumeRequest已经是成功处理的消息集合
*/
long offset = consumeRequest.getProcessQueue().removeMessage(consumeRequest.getMsgs());
if (offset >= 0 && !consumeRequest.getProcessQueue().isDropped()) {
//更新消费节点 广播是通过本地处理  集群是通过更新broker消费节点
this.defaultMQPushConsumerImpl.getOffsetStore().updateOffset(consumeRequest.getMessageQueue(), offset, true);
}
}
```

如果消费完成，通过messageListener回调，封装了一层返回状态：如果消费成功，则需要处理ackIndex的数据。如果是单条消费，那么ack最多只有一个，如果是多条消费，那么ack的数量应该是msg.size - 1最大，那么先在本地变量保存一下当前处理的数量。

然后是核心处理的能力：如果是广播消息，因为广播消息是不会重试的，所以无法再做任何处理，打个日志完事了；如果是集群消息，并且ackIndex返回了-1，那么这个消息一定是失败了，那么就需要走sendBack，通知broker将消息扔到重试队列里去，然后将消息的重试次数+1；

对于已经成功的消息，我们需要更新掉它的偏移量，通过updateOffSet进行更新，同样区分更新方式，localFile其实更新的是本地的广播消费进度，remote是集群更新进度，集群的消费进度保存再broker中，但是其实这里都是更新了本地的offSetTable，其实在broker中会根据后续的动作会将offSet同步到broker中进行记录，这样新的消费实例就可以从broker保存的offset进行消费：

```java
/** TODO 消费同步模式 重要
* 集群消费更新节点 其实可以看出在这里不管广播还是集群都是存储在了offsetTable中，其实会在后续推送到broker进行保存的
* 这里有个误区，我们知道集群模式 一个queue会对应到一个消费者进行消费 一个消费者可以绑定多个队列进行pull 如果这里不存在rebalance时，这个消费者不会变化，它延后在注册心跳同步offSet是完全没有问题的
* 但是如果这里触发了rebalance，这个消息可能在消费没来得及相应的情况下 进行了消费重排，这时这个队列在这个消费者下可能就是isDrop，但是新的消费者拉取消息时不会从当前的点位消费，而是从上一次成功提交
* 的点位进行消费！
* 当前保存的点位信息可能在同步或拉取时推送给broker
* @see RemoteBrokerOffsetStore#persistAll(Set)
* 在拉取时也会将当前的消费点位传入broker
* @see org.apache.rocketmq.client.impl.consumer.DefaultMQPushConsumerImpl#pullMessage(PullRequest)
*/
@Override
public void updateOffset(MessageQueue mq, long offset, boolean increaseOnly) {
if (mq != null) {
AtomicLong offsetOld = this.offsetTable.get(mq);
if (null == offsetOld) {
offsetOld = this.offsetTable.putIfAbsent(mq, new AtomicLong(offset));
}

if (null != offsetOld) {
if (increaseOnly) {
MixAll.compareAndIncreaseOnly(offsetOld, offset);
} else {
offsetOld.set(offset);
}
}
}
}
```

它会根据另一个异步线程池定时将目前最新的 offset同步给broker。

### **index索引持久化**

在消息经过持久化进入commitlog后，相应的store也会对持久化的消息进行索引保存：在 ReputMessageService中：

```java
public void run() {
DefaultMessageStore.LOGGER.info(this.getServiceName() + " service started");

while (!this.isStopped()) {
try {
Thread.sleep(1);
this.doReput();
} catch (Exception e) {
DefaultMessageStore.LOGGER.warn(this.getServiceName() + " service has exception. ", e);
}
}

DefaultMessageStore.LOGGER.info(this.getServiceName() + " service end");
}
```

其中核心的操作就是doReput，它就是对index文件创建刷盘并给commitlog的消息创建索引的过程：

```java
/**
* 自旋线程执行的方法
*/
private void doReput() {
if (this.reputFromOffset < DefaultMessageStore.this.commitLog.getMinOffset()) {
LOGGER.warn("The reputFromOffset={} is smaller than minPyOffset={}, this usually indicate that the dispatch behind too much and the commitlog has expired.",
this.reputFromOffset, DefaultMessageStore.this.commitLog.getMinOffset());
this.reputFromOffset = DefaultMessageStore.this.commitLog.getMinOffset();
}
for (boolean doNext = true; this.isCommitLogAvailable() && doNext; ) {

//从commitlog中获取reput的offset对应的消息列表
SelectMappedBufferResult result = DefaultMessageStore.this.commitLog.getData(reputFromOffset);

if (result == null) {
break;
}

try {
this.reputFromOffset = result.getStartOffset();

//将对应的每条消息都封装成dispatchRequest
for (int readSize = 0; readSize < result.getSize() && reputFromOffset < DefaultMessageStore.this.getConfirmOffset() && doNext; ) {
DispatchRequest dispatchRequest =
DefaultMessageStore.this.commitLog.checkMessageAndReturnSize(result.getByteBuffer(), false, false, false);
int size = dispatchRequest.getBufferSize() == -1 ? dispatchRequest.getMsgSize() : dispatchRequest.getBufferSize();

if (reputFromOffset + size > DefaultMessageStore.this.getConfirmOffset()) {
doNext = false;
break;
}

if (dispatchRequest.isSuccess()) {
if (size > 0) {
//如果dispatchRequest校验成功，消息检查成功，则执行doDispatch
DefaultMessageStore.this.doDispatch(dispatchRequest);

if (DefaultMessageStore.this.brokerConfig.isLongPollingEnable()
&& DefaultMessageStore.this.messageArrivingListener != null) {
DefaultMessageStore.this.messageArrivingListener.arriving(dispatchRequest.getTopic(),
dispatchRequest.getQueueId(), dispatchRequest.getConsumeQueueOffset() + 1,
dispatchRequest.getTagsCode(), dispatchRequest.getStoreTimestamp(),
dispatchRequest.getBitMap(), dispatchRequest.getPropertiesMap());
notifyMessageArrive4MultiQueue(dispatchRequest);
}

this.reputFromOffset += size;
readSize += size;
if (!DefaultMessageStore.this.getMessageStoreConfig().isDuplicationEnable() &&
DefaultMessageStore.this.getMessageStoreConfig().getBrokerRole() == BrokerRole.SLAVE) {
DefaultMessageStore.this.storeStatsService
.getSinglePutMessageTopicTimesTotal(dispatchRequest.getTopic()).add(dispatchRequest.getBatchSize());
DefaultMessageStore.this.storeStatsService
.getSinglePutMessageTopicSizeTotal(dispatchRequest.getTopic())
.add(dispatchRequest.getMsgSize());
}
} else if (size == 0) {
this.reputFromOffset = DefaultMessageStore.this.commitLog.rollNextFile(this.reputFromOffset);
readSize = result.getSize();
}
} else {
if (size > 0) {
LOGGER.error("[BUG]read total count not equals msg total size. reputFromOffset={}", reputFromOffset);
this.reputFromOffset += size;
} else {
doNext = false;
// If user open the dledger pattern or the broker is master node,
// it will not ignore the exception and fix the reputFromOffset variable
if (DefaultMessageStore.this.getMessageStoreConfig().isEnableDLegerCommitLog() ||
DefaultMessageStore.this.brokerConfig.getBrokerId() == MixAll.MASTER_ID) {
LOGGER.error("[BUG]dispatch message to consume queue error, COMMITLOG OFFSET: {}",
this.reputFromOffset);
this.reputFromOffset += result.getSize() - readSize;
}
}
}
}
} finally {
result.release();
}
}
}
```

它根据reputOffset向commitlog拉取对应的消息列表，然后将这批消息进行批量构建索引，会将符合条件的所有的消息每个生成一个 DispatchRequest：

核心的动作就是：

```java
/**
* TODO 构建index索引并根据commitlog持久化消息处理核心代码
*/
class CommitLogDispatcherBuildIndex implements CommitLogDispatcher {

@Override
public void dispatch(DispatchRequest request) {
if (DefaultMessageStore.this.messageStoreConfig.isMessageIndexEnable()) {
//构建index索引
DefaultMessageStore.this.indexService.buildIndex(request);
}
}
}
```

首先，获取对应的indexFile文件

```java
public void buildIndex(DispatchRequest req) {
//尝试获取索引文件
IndexFile indexFile = retryGetAndCreateIndexFile();
if (indexFile != null) {
long endPhyOffset = indexFile.getEndPhyOffset();
DispatchRequest msg = req;
String topic = msg.getTopic();
String keys = msg.getKeys();
//索引是根据commitlog的offset构建的，如果当前的消息小于当前已经构建的最大点位，则认为它是重复的消息
if (msg.getCommitLogOffset() < endPhyOffset) {
return;
}

final int tranType = MessageSysFlag.getTransactionValue(msg.getSysFlag());
switch (tranType) {
case MessageSysFlag.TRANSACTION_NOT_TYPE:
case MessageSysFlag.TRANSACTION_PREPARED_TYPE:
case MessageSysFlag.TRANSACTION_COMMIT_TYPE:
break;
case MessageSysFlag.TRANSACTION_ROLLBACK_TYPE:
return;
}

/**
* 生成索引
*/
if (req.getUniqKey() != null) {
indexFile = putKey(indexFile, msg, buildKey(topic, req.getUniqKey()));
if (indexFile == null) {
LOGGER.error("putKey error commitlog {} uniqkey {}", req.getCommitLogOffset(), req.getUniqKey());
return;
}
}

if (keys != null && keys.length() > 0) {
String[] keyset = keys.split(MessageConst.KEY_SEPARATOR);
for (int i = 0; i < keyset.length; i++) {
String key = keyset[i];
if (key.length() > 0) {
indexFile = putKey(indexFile, msg, buildKey(topic, key));
if (indexFile == null) {
LOGGER.error("putKey error commitlog {} uniqkey {}", req.getCommitLogOffset(), req.getUniqKey());
return;
}
}
}
}
} else {
LOGGER.error("build index error, stop building index");
}
}
```

更新索引文件后，会对每次最后一次更新的 时间戳进行index下的文件重命名。

根据key进行消息查找，通过index文件：

```java
/**
* TODO 根据索引key查找消息的核心代码
* @return
*/
@Override
public QueryMessageResult queryMessage(String topic, String key, int maxNum, long begin, long end) {
QueryMessageResult queryMessageResult = new QueryMessageResult();

long lastQueryMsgTime = end;

for (int i = 0; i < 3; i++) {
//获取 IndexFile 索引文件中记录的消息在 CommitLog 文件物理偏移地址
QueryOffsetResult queryOffsetResult = this.indexService.queryOffset(topic, key, maxNum, begin, lastQueryMsgTime);
if (queryOffsetResult.getPhyOffsets().isEmpty()) {
break;
}

//排序 根据消费进度
Collections.sort(queryOffsetResult.getPhyOffsets());

queryMessageResult.setIndexLastUpdatePhyoffset(queryOffsetResult.getIndexLastUpdatePhyoffset());
queryMessageResult.setIndexLastUpdateTimestamp(queryOffsetResult.getIndexLastUpdateTimestamp());

for (int m = 0; m < queryOffsetResult.getPhyOffsets().size(); m++) {
long offset = queryOffsetResult.getPhyOffsets().get(m);

try {
MessageExt msg = this.lookMessageByOffset(offset);
if (0 == m) {
lastQueryMsgTime = msg.getStoreTimestamp();
}

//根据消费点位在commitlog中查找
SelectMappedBufferResult result = this.commitLog.getData(offset, false);
if (result != null) {
int size = result.getByteBuffer().getInt(0);
result.getByteBuffer().limit(size);
result.setSize(size);
queryMessageResult.addMessage(result);
}
} catch (Exception e) {
LOGGER.error("queryMessage exception", e);
}
}

if (queryMessageResult.getBufferTotalSize() > 0) {
break;
}

if (lastQueryMsgTime < begin) {
break;
}
}

return queryMessageResult;
}
```

## **关于零拷贝**

了解零拷贝之前，我们先来了解一下常规的一次IO读取会经历哪些事情

![image](./image-02.jpg)

由于JVM本身不能操作内核，所以jvm进行一次IO时，会有一次内核的切换，DMA拷贝将内容拷贝到读取缓冲区中，再将内核切换为用户进程，再把内容拷贝到应用缓冲区中；

发送同理，会先将内容通过CPU拷贝到套接字缓冲区中，再通过内核将套接字缓冲的内容通过DMA发送到网卡。这一共需要经历4次拷贝。

mmap的零拷贝，采用的是将磁盘的内容直接拷贝到内核缓冲区，内核缓冲区可以看做一个虚拟内存，所以是3次拷贝。

sendfile的零拷贝，采用的是将内核缓冲区直接拷贝到网卡去，所以是两次拷贝。（rocket采用的是mmap，kfaka采用的是sendfile）

使用mmap+write方式（rocket）
优点：即使频繁调用，使用小文件块传输，效率也很高
缺点：不能很好的利用DMA方式，会比sendfile多消耗CPU资源，内存安全性控制复杂，需要避免JVM Crash问题
使用sendfile方式（kfaka）
优点：可以利用DMA方式，消耗CPU资源少，大块文件传输效率高，无内存安全新问题
缺点：小块文件效率低于mmap方式，只能是BIO方式传输，不能使用NIO

看一个实例：

```java
ServerSocket serverSocket = new ServerSocket(8999);
while (true){
Socket socket = serverSocket.accept();
DataInputStream dataInputStream = new DataInputStream(socket.getInputStream());
AtomicInteger integer = new AtomicInteger(0);
try {
byte[] buffer = new byte[1024];
while (true){
int read = dataInputStream.read(buffer, 0, buffer.length);
integer.addAndGet(read);
if (read == -1){
System.out.println("接收：" + integer.get());
integer = null;
break;
}
}
} catch (IOException e) {
e.printStackTrace();
}
Socket socket = new Socket("localhost", 8999);
String fileName = "E://workSpace//store.log";//37.8 MB (39,703,524 字节)
InputStream inputStream = new FileInputStream(fileName);
DataOutputStream dataOutputStream = new DataOutputStream(socket.getOutputStream());
try {
byte[] buffer = new byte[1024];
Integer read, total = 0;
long time = System.currentTimeMillis();
while ((read = inputStream.read(buffer)) > 0){
total += read;
dataOutputStream.write(buffer);
}
long end = System.currentTimeMillis();
System.out.println("发送" + total + ",用时:" + ((end - time) ));
} finally {
dataOutputStream.close();
socket.close();
inputStream.close();
}
SocketChannel socketChannel = SocketChannel.open();
socketChannel.connect(new InetSocketAddress("localhost", 8999));
socketChannel.configureBlocking(true);
String fileName = "E://workSpace//store.log";//37.8 MB (39,703,524 字节)
FileChannel fileChannel = null;
try {
fileChannel = new FileInputStream(fileName).getChannel();
long size = fileChannel.size();
long position = 0;
long total = 0;
long timeMillis = System.currentTimeMillis();
while (position < size) {
long currentNum = fileChannel.transferTo(position, fileChannel.size(), socketChannel);
if (currentNum <= 0) {
break;
}
total += currentNum;
position += currentNum;
}
long timeMillis1 = System.currentTimeMillis();
System.out.println("发送：" + total + ",用时："+ (timeMillis1 - timeMillis) );
} finally {
fileChannel.close();
socketChannel.close();
}
```

上面提供了两种方式，传统的IO读写和mmap的读写，基于socket发送数据

![image](./image-03.jpg)

![image](./image-04.jpg)

会发现，零拷贝的方式比传统的方式从读取到发送快了百分之70 -80左右

所以，如果你需要优化网络传输的性能，或者文件读写的速度，请尽量使用零拷贝。它不仅能较少复制拷贝次数，还能较少上下文切换。
