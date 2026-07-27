---
title: "【juc】关于LockSupport"
description: "通过juc下LockSupport，可以达到阻塞和唤醒线程的操作线程信号线程之间是需要通信的。 线程间的通信可以有很多种方式，比如线程调度、令牌许可.... 常见的线程通信方式，类似阻塞，调度，唤醒。通过并发编程中我看到了这样的一段描述，在开头补充出来： 首…"
published: 2024-01-03
slug: zhihu-675939389
tags:
  - "JUC"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/675939389
  published: 2024-01-03
---

> *通过juc下LockSupport，可以达到阻塞和唤醒线程的操作*

## **线程信号**

线程之间是需要通信的。

线程间的通信可以有很多种方式，比如线程调度、令牌许可....

常见的线程通信方式，类似阻塞，调度，唤醒。通过并发编程中我看到了这样的一段描述，在开头补充出来：

首先，是对于常用的wait和notify、notifyAll等方法的介绍：

Java has a built-in wait mechanism that enable threads to become inactive while waiting for signals from other threads. The class java.lang.Object defines three methods, wait(), notify(), and notifyAll(), to facilitate this.

A thread that calls wait() on any object becomes inactive until another thread calls notify() or notifyAll() on that object. In order to call either wait(), notify() or notifyAll(), the calling thread must first obtain the lock on that object. In other words, the calling thread must call wait() or notify() from inside a synchronized block that is synchronized on that object.

Below is an example class that can be used for two threads to pass signals. Both threads need access to the same instance of this class. One thread will call the `doWait()` method, and the other thread will call `doNotify()`.

```java
public class MonitorObject{
}

public class MyWaitNotify{

MonitorObject myMonitorObject = new MonitorObject();

public void doWait(){
synchronized(myMonitorObject){
try{
myMonitorObject.wait();
} catch(InterruptedException e){...}
}
}

public void doNotify(){
synchronized(myMonitorObject){
myMonitorObject.notify();
}
}
}
```

When the first thread calls `doWait()` it first enters a synchronized block and then calls `wait()` on an internal monitor object. The synchronized block is synchronized on that monitor object. When `wait()` is called - the calling thread releases the lock on the monitor object - and is blocked until another thread calls `notify()` or `notifyAll()` on the monitor object.

When the second threads calls `doNotify()` it enters a synchronized block that is synchronized on the internal monitor object. Inside this synchronized block the thread then calls the `notify()` method on the monitor object. This will wake up one thread blocked inside a `wait()` call on the same monitor object. However, none of these awakened threads can exit the `wait()` method until the thread calling `notify()` (or `notifyAll()`) has released the lock on the monitor object.

After calling `notify()` the second thread exits the synchronized block, which enables the awakened thread or threads to exit the `wait()` call and enter back into the synchronized block - which they then shortly after exit.

The above principle and process is illustrated below. Note, that the diagram refers to the monitor object as "signal object" - meaning the object through which the thread send signals.

上面是什么意思呢？

java包含了这样一种特性，可以让线程与其他线程互相发送信号，同时让其他线程等待信号，举个例子，线程B需要等待线程A的信号来提示已经准备就绪处理某些事情。

java线程的信号特性在java中使用wait(), notify(), notifyAll()方法实现。它们是Object 类继承的一种一部分。java内部有一个等待的机制，使线程在等待其他线程的信号前处于活跃状态，在class java.lang.Object 定义了三种方法：分别为wait(), notify(), notifyAll()去实现它：

一个线程调用wait()方法，会成为非活跃状态，直到其他线程调用notify()或notifyAll()，为了在调用wait(),notify(),notifyAll()，调用的线程必须必须先获得当前object的锁，换句话说，调用线程必须在同步块例如synchronized 中调用。

上面的一个例子，是两个线程处理信号量，两个线程需要访问同一个class的实例，一个线程会调用dowait()， 另一个线程则调用doNotify()。

当第一个线程调用了doWait()，它首先进入 synchronized block 同步块，然后在内部监视器对象中调用wait()，使监视器对象上同步。当wait()被调用后，调用的线程会释放锁在同步监视器对象上，然后被阻塞，直到其他线程调用notify()或notifyAll()在这个内部监视器上。（这个内部监视器，用通俗的话说就是我们的同步代码块，意味着我们的lock锁的是同一个instance class）

当第二个线程调用了doNotify()，它会进入这个内部监视器的同步块中，在这个内部监视器的同步块中调用notify()方法，它将会唤醒在这个内部监视器中一个被阻塞的线程。但是，在线程调用notify()或notifyAll()释放锁之前，其他线程不能退出wait()方法。

在调用notify()方法后第二个线程退出了同步块，使唤醒的一个或多个线程在离开不久后可以退出wait()并重新进入同步块。

上述原理和过程如下图所示：注意，下图中将监视器对象称为：signal object -- 信号对象，意思是线程通过它发送信号。

![image](./image-01.jpg)

多个线程可以在同一个监听器对象上调用wait()，它们会阻塞等待notify()或notifyAll()。调用notify()将会仅唤醒一个等待的线程。调用notifyAll()将会唤醒所有等待的线程。
一个线程只能在持有同步锁的情况下调用wait()，notify()，notifyAll()，否则会抛IllegalMonitorStateException 异常。

## **丢失的信号**

我们上面提到了，线程间的通信--信号。 那么什么是丢失的信号呢？
The methods notify() and notifyAll() do not save the method calls to them in case no threads are waiting when they are called. The notify signal is then just lost. Therefore, if a thread calls notify() before the thread to signal has called wait(), the signal will be missed by the waiting thread. This may or may not be a problem, but in some cases this may result in the waiting thread waiting forever, never waking up, because the signal to wake up was missed.
To avoid losing signals they should be stored inside the signal class. In the MyWaitNotify example the notify signal should be stored in a member variable inside the MyWaitNotify instance. Here is a modified version of MyWaitNotify that does this:
wait()，notify(), notifyAll()等方法不会保存方法的调用，以防在调用时没有等待的线程。这样通知的信号就会被丢弃。因此，如果一个线程调用notify()的时机在线程调用wait()之前，等待线程的信号将会被丢失，这也许是一个问题也许不是问题，但在某些情况下，这些等待的线程也许永远无法被唤醒了。
为了应对这种情况，这些被丢失的信号应该被放在实例中存储。实例：MyWaitNotify实例代码，通知信号应该被存储在当前的实例中。以下是MyWaitNotify的一个修改版本的模板：

```java
public class MyWaitNotify2{

MonitorObject myMonitorObject = new MonitorObject();
boolean wasSignalled = false;

public void doWait(){
synchronized(myMonitorObject){
if(!wasSignalled){
try{
myMonitorObject.wait();
} catch(InterruptedException e){...}
}
//clear signal and continue running.
wasSignalled = false;
}
}

public void doNotify(){
synchronized(myMonitorObject){
wasSignalled = true;
myMonitorObject.notify();
}
}
}
```

Notice how the doNotify() method now sets the wasSignalled variable to true before calling notify(). Also, notice how the doWait() method now checks the wasSignalled variable before calling wait(). In fact it only calls wait() if no signal was received in between the previous doWait() call and this.

通知doNotify()是在调用notify()之前将wasSignaled设置为true，另外，通知信号如何在调用wait()前去检查信号的。事实上，只有在前一个调用doWait()和当前调用之间没有接收到信号的情况下，才会调用wait()。

## **虚假唤醒**

For inexplicable reasons it is possible for threads to wake up even if notify() and notifyAll() has not been called. This is known as spurious wakeups. Wakeups without any reason.

If a spurious wakeup occurs in the MyWaitNofity2 class's doWait() method the waiting thread may continue processing without having received a proper signal to do so! This could cause serious problems in your application.

To guard against spurious wakeups the signal member variable is checked inside a while loop instead of inside an if-statement. Such a while loop is also called a spin lock. The thread awakened spins around until the condition in the spin lock (while loop) becomes false. Here is a modified version of MyWaitNotify2 that shows this:

在一些无法解释的情况下，线程在没有调用notify()或notifyAll()的情况下，会自动的唤醒。这种情况就叫做虚假唤醒。虚假唤醒是毫无理由的醒来。

如果MyWaitNofity2的doWait()触发了虚假唤醒，那么等待线程可能在没有收到信号的情况下处理，这将会让你的应用程序发生错误。

为了防止虚假唤醒，成员变量信号应该在while中而不是在if else中检查。这样的做法while loop也成为自旋锁--spin lock。当前线程会一直自旋直到条件变为false。下面是MyWaitNotify2 的修改版本：

```java
public class MyWaitNotify3{

MonitorObject myMonitorObject = new MonitorObject();
boolean wasSignalled = false;

public void doWait(){
synchronized(myMonitorObject){
while(!wasSignalled){
try{
myMonitorObject.wait();
} catch(InterruptedException e){...}
}
//clear signal and continue running.
wasSignalled = false;
}
}

public void doNotify(){
synchronized(myMonitorObject){
wasSignalled = true;
myMonitorObject.notify();
}
}
}
```

Notice how the wait() call is now nested inside a while loop instead of an if-statement. If the waiting thread wakes up without having received a signal, the wasSignalled member will still be false, and the while loop will execute once more, causing the awakened thread to go back to waiting.

现在调用wait()是嵌套在while循环中的，而不是if语句中。如果等待线程无条件的虚假唤醒，当前的信号量仍旧为false，唤醒的线程将会再通过自旋返回wait()。

## **多个线程等待相同的信号**

The while loop is also a nice solution if you have multiple threads waiting, which are all awakened using notifyAll(), but only one of them should be allowed to continue. Only one thread at a time will be able to obtain the lock on the monitor object, meaning only one thread can exit the wait() call and clear the wasSignalled flag. Once this thread then exits the synchronized block in the doWait() method, the other threads can exit the wait() call and check the wasSignalled member variable inside the while loop. However, this flag was cleared by the first thread waking up, so the rest of the awakened threads go back to waiting, until the next signal arrives.

这种while-loop自旋的操作，在面对多个线程等待时，也同样适用。当任意一个线程调用notifyAll()后，只有一个线程会允许继续操作。只有一个线程可以获取到监视器的锁，也就只有当前获取锁的线程可以退出wait()并清除wasSignalled信号。当这个线程指定doWait()退出同步块后，其他线程才允许退出wait()并且自旋检查wasSignalled。当然，这个信号被这个线程唤醒清除，其他被唤醒的线程则返回继续等待，直到下一个信号的来临。

## **不要在常量String或全局对象调用wait()**

An earlier version of this text had an edition of the MyWaitNotify example class which used a constant string ( "" ) as monitor object. Here is how that example looked:

一个古老版本的例子MyWaitNotify使用了常量字符串"" 作为一个监视器对象。实例代码如下:

```java
public class MyWaitNotify{

String myMonitorObject = "";
boolean wasSignalled = false;

public void doWait(){
synchronized(myMonitorObject){
while(!wasSignalled){
try{
myMonitorObject.wait();
} catch(InterruptedException e){...}
}
//clear signal and continue running.
wasSignalled = false;
}
}

public void doNotify(){
synchronized(myMonitorObject){
wasSignalled = true;
myMonitorObject.notify();
}
}
}
```

The problem with calling wait() and notify() on the empty string, or any other constant string is, that the JVM/Compiler internally translates constant strings into the same object. That means, that even if you have two different MyWaitNotify instances, they both reference the same empty string instance. This also means that threads calling doWait() on the first MyWaitNotify instance risk being awakened by doNotify() calls on the second MyWaitNotify instance.
对一个空的字符串或其他常量字符串作为监视器对象的问题在于：对于JVM来说，在编译时会将这种常量字符串作为一个相同的实例。（这里参考 JVM的内存模型 以及JVM的常量池）这意味着，即使有两个不相同的MyWaitNotify 实例，它们用的都是同一个字符串实例。这也意味着在第一个MyWaitNotify 上调用的doWait()方法的实例，有可能会被第二个MyWaitNotify 唤醒的风险。
情况如下图所示：

![image](./image-02.jpg)

Remember, that even if the 4 threads call wait() and notify() on the same shared string instance, the signals from the doWait() and doNotify() calls are stored individually in the two MyWaitNotify instances. A doNotify() call on the MyWaitNotify 1 may wake threads waiting in MyWaitNotify 2, but the signal will only be stored in MyWaitNotify 1.
At first this may not seem like a big problem. After all, if doNotify() is called on the second MyWaitNotify instance all that can really happen is that Thread A and B are awakened by mistake. This awakened thread (A or B) will check its signal in the while loop, and go back to waiting because doNotify() was not called on the first MyWaitNotify instance, in which they are waiting. This situation is equal to a provoked spurious wakeup. Thread A or B awakens without having been signaled. But the code can handle this, so the threads go back to waiting.
The problem is, that since the doNotify() call only calls notify() and not notifyAll(), only one thread is awakened even if 4 threads are waiting on the same string instance (the empty string). So, if one of the threads A or B is awakened when really the signal was for C or D, the awakened thread (A or B) will check its signal, see that no signal was received, and go back to waiting. Neither C or D wakes up to check the signal they had actually received, so the signal is missed. This situation is equal to the missed signals problem described earlier. C and D were sent a signal but fail to respond to it.
If the doNotify() method had called notifyAll() instead of notify(), all waiting threads had been awakened and checked for signals in turn. Thread A and B would have gone back to waiting, but one of either C or D would have noticed the signal and left the doWait() method call. The other of C and D would go back to waiting, because the thread discovering the signal clears it on the way out of doWait().
You may be tempted then to always call notifyAll() instead notify(), but this is a bad idea performance wise. There is no reason to wake up all threads waiting when only one of them can respond to the signal.
So: Don't use global objects, string constants etc. for wait() / notify() mechanisms. Use an object that is unique to the construct using it. For instance, each MyWaitNotify3 (example from earlier sections) instance has its own MonitorObject instance rather than using the empty string for wait() / notify() calls.
请记住，即使四个线程使用同一个监视器对象调用wait()或者notify()，doWait()和doNotify()调用依旧会存储在不同的两个MyWaitNotify 实例上。A在MyWaitNotify1上调用doNotify()可能会唤醒MyWaitNotify2，但是信号的存储会在MyWaitNotify1上进行存储。
起初，这并不是一个大问题。当然，如果doNotify()会调用MyWaitNotify2实例发生线程A和线程B被错误的唤醒，那唤醒的线程A和B就会在while-loop中检查并再次wait，因为doNotify()可能作用于MyWaitNotify1实例上，最后它们都会去wait()，这种情况就相当于线程A，B被虚假唤醒，但是代码可以解决这种问题，所以线程又会回到等待状态。
这里的问题时：这里的doNotify()调用时，只会唤醒其中的一个线程（notify），并非唤醒多个线程，在这种情况下四个线程在常量字符串监听器中只会有一个线程被唤醒，所以，如果唤醒的线程是A或者B时，而信号作用于C或者D，那么A或者B醒来就会检查信号，查看没有接收到信号，那么又在自旋中等待。而C和D没有醒来查看它们的信号，那这个信号就会被丢弃。这种情况类似于信号丢失的场景。
如果doNotify()方法中调用的是notifyAll()，所有等待的线程都会被唤醒，然后检查信号。线程A和线程B将会在自旋中接着等待，但是C或者D其中一个会获取到锁并跳出doWait()，另一个将会再次回到等待状态，因为线程在跳出doWait()时会清除信号。
你也许会更倾向于notifyAll()而不是notify()，但这是一个不好的想法。当我们只需要一个线程响应信号时，不应该让所有的等待线程都被唤醒。
因此，不要使用全局对象、字符串常量使用wait()或者notify()，使用一个包含唯一构造的对象，例如MyWaitNotify3 的实例就包含自己的MonitorObject 实例，而不是使用上述错误的对象。
以上说明，选自[雅各布·詹科夫](https://link.zhihu.com/?target=http%3A//jenkov.com/)-Jakob Jenkov的文章

## **LockSupport**

LockSupport是juc下一个线程阻塞唤醒的工具类。它的主要方法有：

![image](./image-03.jpg)

每个使用LockSupport的线程，会有一个许可；调用park会立即返回，否则会被阻塞。

如果许可不可用，则可以调用unpark供其可使用，但是许可不可重入，例如在park（）后接着park（），这样做可能会导致线程永远无法唤醒。

对于park和unpark来说，它们本身就是一个阻塞和唤醒的实现，但是值得注意的是，一个线程的最大许可只会有一个。

unpark：对于已经开始的线程，设置一个许可，对于未开始的线程可能不会有效果。

park：如果当前线程许可>0 ，那么会继续执行，否则就会阻塞等待。什么时候会被唤醒？调用unpark对当前线程，或interrupt当前线程。

所以，park在业务中 我们尽量保证将线程放在循环中，并前置校验当前的状态。

## **wait/notify**

```java
public final native void wait(long timeout) throws InterruptedException;

public final void wait() throws InterruptedException

public final void wait(long timeout, int nanos) throws InterruptedException
```

首先说说wait，wait提供了几种重载方法，最终都会执行wait（time）的方法，它是属于Object包下的，**调用它会导致当前线程阻塞，直到其他线程调用notify、notifyAll或等待执行时间自动唤醒，**并且wait必须在同步块中使用，而且会释放锁。

notify，用于唤醒wait的线程，如果没有wait的线程则会忽略，并且唤醒的线程会重新获取锁。notifyAll会唤醒所有持有相同的锁的阻塞线程同时唤醒进行竞争消费。

但是这里又有wait和sleep的区别：

**wait sleep都可以让线程阻塞，并且都可被中断。**

**sleep是Thread下的方法，而wait是Object的 而且wait比如在同步代码块中执行。**

**sleep时，并不会释放锁，而wait会释放锁。**

**sleep在指定时间后会主动退出，而wait如果不设置时间自动唤醒会一直阻塞。**

## **interrupt**

如何在一个线程中暂停另一个线程的运行？

stop方法？stop已经被禁用，因为stop是强行终止挂起线程，但是这种方式是很危险的，比如线程还没来得及释放锁，那其他线程将永远获取不到资源。

所以我们要使用interrupt， **它不会像stop一样中断一个正在运行的线程，而线程会执行下去，但会设置线程中的中断状态**，线程会一直检测这个标记量以判断线程是否需要被立即终止。

但是，如果在一个阻塞线程中使用interrupt， 会产生一个InterruptedException异常，结束线程的运行。如果我们自定义捕获异常后，可以做一些额外工作，如终止、继续等

所以，interrupt一般用在线程中的循环中，控制线程中断的状态。

## **LockSupport和wait**

经过上文介绍，我们对wait、notify和LockSupport有了基本的认识。那我们推荐使用哪种方式呢？

举个例子，例如线程B要通知线程A唤醒，那么前置条件是什么？**是要确保线程A必须开始并且持有相同的锁并且已经被阻塞了。那么如果线程A这时候没有达到这个条件，而后续达到了这个条件，那么线程B在notify时无法唤醒线程A，而线程A可能也面临永远无法唤醒的情况。那这种情况如果用LockSupport去处理会有什么好处呢？如果我们用park、unpark，那么在线程启动后，如果unpark在前，那么会在线程中添加一个许可，最大也只能有一个许可，这时如果达到了park条件，发现已经有许可就会继续执行；而如果线程先被park，那就会阻塞，直到被unpark唤醒。**

但是这里需要注意一个问题，如果我们多次park会怎么样？如果我们又unpark了多次会怎么样？

其实对于LockSupport来说，park和unpark其实就是重置了内部的一个count，调用park会将count重置为0，那么如果重置之前是1，则直接退出，否则就被阻塞；调用unpark时，会将count重置为1，那么如果重置之前是0就将线程唤醒，否则直接退出。

所以，如果我们多次park和unpark后，会导致线程无法被唤醒。

推荐先park、后unpark。
