---
title: "【jvm】关于jvm内存模型及GC调优"
description: "JVM调优，其实就是调整SWT和FGC的过程JVM内存模型通过一张基础的图了解最简单的JVM模型： 其实在jvm模型中，主要包含了我们常见的堆栈方法区等待--每个版本不同可能解释有所不同，这里默认以8版本为例： 首先给出官方文档的解释： https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-2.html#jvms-2.5.42.5.…"
published: 2024-01-03
slug: zhihu-675940342
tags:
  - "JVM"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/675940342
  published: 2024-01-03
---

> *JVM调优，其实就是调整SWT和FGC的过程*

## **JVM内存模型**

通过一张基础的图了解最简单的JVM模型：

![image](./image-01.jpg)

其实在jvm模型中，主要包含了我们常见的堆栈方法区等待--每个版本不同可能解释有所不同，这里默认以8版本为例：

首先给出官方文档的解释：

[https://docs.oracle.com/javase/specs/jvms/se8/html/jvms-2.html#jvms-2.5.4](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/specs/jvms/se8/html/jvms-2.html%23jvms-2.5.4)

### ***2.5. Run-Time Data Areas***

> *The Java Virtual Machine defines various run-time data areas that are used during execution of a program. Some of these data areas are created on Java Virtual Machine start-up and are destroyed only when the Java Virtual Machine exits. Other data areas are per thread. Per-thread data areas are created when a thread is created and destroyed when the thread exits.*
> ***2.5.1. The `pc` Register***
> *The Java Virtual Machine can support many threads of execution at once (JLS §17). Each Java Virtual Machine thread has its own `pc` (program counter) register. At any point, each Java Virtual Machine thread is executing the code of a single method, namely the current method ([§2.6](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/specs/jvms/se8/html/jvms-2.html%23jvms-2.6)) for that thread. If that method is not `native`, the `pc` register contains the address of the Java Virtual Machine instruction currently being executed. If the method currently being executed by the thread is `native`, the value of the Java Virtual Machine's `pc` register is undefined. The Java Virtual Machine's `pc` register is wide enough to hold a `returnAddress` or a native pointer on the specific platform.*
> ***2.5.2. Java Virtual Machine Stacks***
> *Each Java Virtual Machine thread has a private Java Virtual Machine stack, created at the same time as the thread. A Java Virtual Machine stack stores frames ([§2.6](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/specs/jvms/se8/html/jvms-2.html%23jvms-2.6)). A Java Virtual Machine stack is analogous to the stack of a conventional language such as C: it holds local variables and partial results, and plays a part in method invocation and return. Because the Java Virtual Machine stack is never manipulated directly except to push and pop frames, frames may be heap allocated. The memory for a Java Virtual Machine stack does not need to be contiguous.*
> *In the First Edition of The Java® Virtual Machine Specification, the Java Virtual Machine stack was known as the Java stack.*
> *This specification permits Java Virtual Machine stacks either to be of a fixed size or to dynamically expand and contract as required by the computation. If the Java Virtual Machine stacks are of a fixed size, the size of each Java Virtual Machine stack may be chosen independently when that stack is created.*
> *A Java Virtual Machine implementation may provide the programmer or the user control over the initial size of Java Virtual Machine stacks, as well as, in the case of dynamically expanding or contracting Java Virtual Machine stacks, control over the maximum and minimum sizes.*
> *The following exceptional conditions are associated with Java Virtual Machine stacks:*

- *If the computation in a thread requires a larger Java Virtual Machine stack than is permitted, the Java Virtual Machine throws a `StackOverflowError`.*
- *If Java Virtual Machine stacks can be dynamically expanded, and expansion is attempted but insufficient memory can be made available to effect the expansion, or if insufficient memory can be made available to create the initial Java Virtual Machine stack for a new thread, the Java Virtual Machine throws an `OutOfMemoryError`.*

***2.5.3. Heap***
*The Java Virtual Machine has a heap that is shared among all Java Virtual Machine threads. The heap is the run-time data area from which memory for all class instances and arrays is allocated.*
*The heap is created on virtual machine start-up. Heap storage for objects is reclaimed by an automatic storage management system (known as a garbage collector); objects are never explicitly deallocated. The Java Virtual Machine assumes no particular type of automatic storage management system, and the storage management technique may be chosen according to the implementor's system requirements. The heap may be of a fixed size or may be expanded as required by the computation and may be contracted if a larger heap becomes unnecessary. The memory for the heap does not need to be contiguous.*
*A Java Virtual Machine implementation may provide the programmer or the user control over the initial size of the heap, as well as, if the heap can be dynamically expanded or contracted, control over the maximum and minimum heap size.*
*The following exceptional condition is associated with the heap:*

- *If a computation requires more heap than can be made available by the automatic storage management system, the Java Virtual Machine throws an `OutOfMemoryError`.*

***2.5.4. Method Area***
*The Java Virtual Machine has a method area that is shared among all Java Virtual Machine threads. The method area is analogous to the storage area for compiled code of a conventional language or analogous to the "text" segment in an operating system process. It stores per-class structures such as the run-time constant pool, field and method data, and the code for methods and constructors, including the special methods ([§2.9](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/specs/jvms/se8/html/jvms-2.html%23jvms-2.9)) used in class and instance initialization and interface initialization.*
*The method area is created on virtual machine start-up. Although the method area is logically part of the heap, simple implementations may choose not to either garbage collect or compact it. This specification does not mandate the location of the method area or the policies used to manage compiled code. The method area may be of a fixed size or may be expanded as required by the computation and may be contracted if a larger method area becomes unnecessary. The memory for the method area does not need to be contiguous.*
*A Java Virtual Machine implementation may provide the programmer or the user control over the initial size of the method area, as well as, in the case of a varying-size method area, control over the maximum and minimum method area size.*
*The following exceptional condition is associated with the method area:*

- *If memory in the method area cannot be made available to satisfy an allocation request, the Java Virtual Machine throws an `OutOfMemoryError`.*

***2.5.5. Run-Time Constant Pool***
*A run-time constant pool is a per-class or per-interface run-time representation of the `constant_pool` table in a `class` file ([§4.4](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/specs/jvms/se8/html/jvms-4.html%23jvms-4.4)). It contains several kinds of constants, ranging from numeric literals known at compile-time to method and field references that must be resolved at run-time. The run-time constant pool serves a function similar to that of a symbol table for a conventional programming language, although it contains a wider range of data than a typical symbol table.*
*Each run-time constant pool is allocated from the Java Virtual Machine's method area ([§2.5.4](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/specs/jvms/se8/html/jvms-2.html%23jvms-2.5.4)). The run-time constant pool for a class or interface is constructed when the class or interface is created ([§5.3](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/specs/jvms/se8/html/jvms-5.html%23jvms-5.3)) by the Java Virtual Machine.*
*The following exceptional condition is associated with the construction of the run-time constant pool for a class or interface:*

- *When creating a class or interface, if the construction of the run-time constant pool requires more memory than can be made available in the method area of the Java Virtual Machine, the Java Virtual Machine throws an `OutOfMemoryError`.*

*See [§5 (Loading, Linking, and Initializing)](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/specs/jvms/se8/html/jvms-5.html) for information about the construction of the run-time constant pool.*
***2.5.6. Native Method Stacks***
*An implementation of the Java Virtual Machine may use conventional stacks, colloquially called "C stacks," to support `native` methods (methods written in a language other than the Java programming language). Native method stacks may also be used by the implementation of an interpreter for the Java Virtual Machine's instruction set in a language such as C. Java Virtual Machine implementations that cannot load `native` methods and that do not themselves rely on conventional stacks need not supply native method stacks. If supplied, native method stacks are typically allocated per thread when each thread is created.*
*This specification permits native method stacks either to be of a fixed size or to dynamically expand and contract as required by the computation. If the native method stacks are of a fixed size, the size of each native method stack may be chosen independently when that stack is created.*
*A Java Virtual Machine implementation may provide the programmer or the user control over the initial size of the native method stacks, as well as, in the case of varying-size native method stacks, control over the maximum and minimum method stack sizes.*
*The following exceptional conditions are associated with native method stacks:*

- *If the computation in a thread requires a larger native method stack than is permitted, the Java Virtual Machine throws a `StackOverflowError`.*
- *If native method stacks can be dynamically expanded and native method stack expansion is attempted but insufficient memory can be made available, or if insufficient memory can be made available to create the initial native method stack for a new thread, the Java Virtual Machine throws an `OutOfMemoryError`.*

针对oracle的官方文档，给我们描述了jvm虚拟机的几个主要模块。那么从普通开发者的角度，其实这几大块分别干了这些事：

### Heap堆：

Java虚拟机具有在所有Java虚拟机线程之间共享的堆。堆是运行时数据区，从中为所有类实例和数组分配内存。堆可以是固定大小的，或者可以根据计算的需要进行扩展，并且如果不需要更大的堆，则可以收缩。堆的内存不需要是连续的。 Java虚拟机实现可以为程序员或用户提供对堆的初始大小的控制，以及如果堆可以动态扩展或收缩，则可以提供对最大和最小堆大小的控制。**如果计算所需的堆数超过了自动存储管理系统所能提供的堆数，Java虚拟机将抛出OutOfMemoryError**。

那么可以看出，堆的主要作用就是分配空间，属于运行时数据区，会将我们运行时的内存分配。

同时，堆内存又分为新生代和老年代，以Young和Old区分，其中新生代主要存放回收年龄较短或者一些新new的对象，而老年代则是存放一些无法被gc的对象（**考虑一下哪些对象会被放入老年代？**）

堆内存，其实又被分为了三个区域：

- Young：新生代；Old：老年代；Mate：元空间（永久代）

其中，新生代又分为这几段：

- Eden：伊甸区；
- s0、s1：survivor，用于YGC中复制移动；

![image](./image-02.jpg)

**默认，Eden：s0：s1是8：1：1的关系，而老年代和年轻代的比例默认是2：1**

**那么，什么时候会放入新生代什么时候会放入老年代呢？**

**默认，新创建的对象第一次会存放在新生代Eden中，我们认为新生代的对象百分之80都可能被回收掉，那么第一次YGC就会把Eden的对象先复制到s0，这是内存的复制，速度很快；**

**下一次YGC，又会把Eden和不为空的s0做YGC,因为我们认为大多数对象都要被回收，再把Eden和s0全部清空，那么没有回收的对象就位于s1；**

**再下一次.... 就是s0和s1来回倒。**

**但是，如果对象很大无法被放入新生代，或者它已经超过动态survivo的大小50%以上，我们就认为它不适合在新生代了，就会直接放去老年代。**

**同时，jvm的Object有对象头，对象头包含了比如说对象线程，锁，和一些gc年龄的属性，那么我们认为默认它的年龄到达15，它就是一个不可被回收的对象，那么就放入老年代；大对象也会放入老年代；还有如果Eden满了出发YGC，那么存活对象大小s0没办法承受也会将部分多余的对象放入老年代，我们认为老年代的对象很难被回收，那么什么对象可以出现在老年代呢？例如：spring生命周期的bean，常量（这里string常量池其实有些许变化），定义线程池、连接池这些都应该属于不可被回收。**

### Stock栈（也叫虚拟机栈，线程栈）

每个Java虚拟机线程都有一个与线程同时创建的专用Java虚拟机堆栈。该规范允许Java虚拟机堆栈具有固定的大小，或者根据计算的需要动态扩展和收缩。如果Java虚拟机堆栈具有固定大小，则在创建每个Java虚拟机栈时，可以独立地选择该栈的大小。**如果线程中的计算需要比允许的更大的Java虚拟机堆栈，则Java虚拟机会抛出StackOverflowError。如果Java虚拟机堆栈可以动态扩展，并且尝试进行扩展，但没有足够的内存可用于实现扩展，或者如果没有足够的存储器可用于创建新线程的初始Java虚拟机栈，则Java虚拟机将抛出OutOfMemoryError。**

栈，顾名思义，是一种FILO的结构，那么在我们方法调用时，就会在栈内存中存储，包括一些对象的引用，栈中又有一个概念叫栈桢，什么是栈帧呢？

简单举例子就是说，比如我们有一个A方法调用B方法，B再调用C方法，那么这个栈帧可以这么表示：

![image](./image-03.jpg)

并且，栈存储会随着线程的创建而创建，会随着线程的销毁而释放，不存在gc。这里其实有一个概念，比如说栈内存的OOM，会是什么样子？

**如果一个递归，无法跳出递归或者递归数量太大，栈内存设置太小，是可能会抛出OOM的。**

局部变量表：对应的就是方法参数和一些局部变量，因为这些都是线程私有的，所以不需要额外gc，随着线程结束被释放。

操作数栈：栈内的一些计算操作。

动态链接：一些引用？

方法返回地址：调用当前方法寄存器的值。

### Native Method Stock本地方法栈

与stock类似，只不过这里存储的是基于一些native之类的本地方法。

### Method Area 方法区/元空间

**首先，明确一个概念，方法区/元空间，又可以叫做no-heap，它是用于与堆内存进行分开的概念！这个概念在jdk7叫做方法区，在jdk8叫做元空间，而且元空间不需要指定默认的大小了，而是会根据物理内存进行计算，当然如果物理内存不够了也会抛出OOM**。并且，元空间是代替了7的老年代，其本质也是属于堆的一部分。

![image](./image-04.jpg)

那么，为什么从7->8会有这样的变化呢？

1.永久代是有固定空间的，如果永久代的空间太小，-XX:MaxPermSize太小就会导致永久代OOM。

2.元空间使用的情况根据物理存储，最大没有限制，当物理内存达不到要求后同样会出发OOM。windows下，-XX:MetaspaceSize是21M，-XX:MaxMetaspaceSize的值是-1。

3.MetaspaceSize是初始化指定的大小，当达到了这个大小后，会触发FGC，同时会根据FGC的回收情况适当调整。所以线上如果频繁FGC，可能跟这个值有关，可以适当增大。

## STW

STW全名叫stop the world，它代表的意思是说在jvm触发GC时，会停止当前所有的用户线程，然后在gc完成后释放，那么在gc的时间段内就会发生所有的动作暂停无响应的情况。当然后面会有针对G1，ZGC以及一些回收算法可以并行的模式。

其中，Class对象 -- 永久代/元数据；

字符串常量 -- 1.7永久代；1.8在堆heap里；

在1.8之后，元数据不存在于堆，而是根据操作系统的内存进行管理的；

## **什么是垃圾**

垃圾，顾名思义就是要被回收的对象，或者说要被回收的一组对象。

首先我们需要有个概念，java本身针对内存指针甚至内存空间的方式，都是基于unsafe或者其他的方式，我们在写java代码中不需要手动释放内存，这与c有很大的不同。

那么为什么java帮助我们去这么做呢？无非这么几点

1.忘记回收内存，那么这一块内存空间就会被占用无法释放。

2.多次回收，那么会不会将新的可用的数据回收掉？

3.更加简化开发。

那既然GC就是回收不可用的垃圾，是有jvm帮我们去完成的，那么jvm到底是如何确定什么是垃圾的呢？

主要有两种办法：

1.计数器，jvm会在对象头记录计数器，计数器代表引用计数器，那么如果这个计数器为0了，它没有被任何对象引用那么它就是一个可以回收的垃圾了。

2.GCROOT，根可达算法：试想一下如果有三个对象ABC，A持有B，B持有C，C持有A，但是它们再没有其他的对象引用了，那么它们的引用计数器不为0，但是它们其实算一堆垃圾，这样的话我们的根可达就派上用场了。比如我们根据Object，一直向下去找，那么找得到的对象就是可用的对象，那么其他的对象都可以称为不可用对象。**什么概念呢？比如我们的局部变量 和我们的连接池 线程池 包括常量池 JNI指针持有的对象那这些一定是可用变量甚至加载的Clazz，一定不会被回收**。

什么是对象头?

| object header | Mark word(64bit) | klass pointer(64bit) |
| --- | --- | --- |
| normal object 普通对象，无锁。 | unused:25\|identity_hashcode:31\|unused:1\|age:4\|biased_lock:1\|lock:2 | oop to metadata object 指向对象的元定义，可能会被指针指针压缩 |
| biased object 带有偏向锁的对象 | thread:54 \|epoch:2 \|unused:1\|age:4\|biased_lock:1\|lock:2 | oop to metadata object 指向对象的元定义，可能会被指针指针压缩 |
| 带有轻量锁的对象 | prt_to_lock_record:62 \|lock:2 | oop to metadata object 指向对象的元定义，可能会被指针指针压缩 |
| 带有重量锁的对象 | prt_to_heavyweigth_monitor:62 \|lock:2 | oop to metadata object 指向对象的元定义，可能会被指针指针压缩 |
| GC | \|lock:2 | oop to metadata object 指向对象的元定义，可能会被指针指针压缩 |

## **常见的垃圾回收算法**

首先对垃圾进行标记，然后进行回收，但是这种方式会导致内存间断，产生大量的内存碎片；这时当我们要分配一个大的对象时，可能会经历频繁的GC（目前大对象也可以直接扔在老年代中）

复制算法，相当于把可用的对象复制在另一个内存块中，然后直接将当前的内存清除；这样不会有内存碎片，但是缺点是内存占用会很大，最少需要将内存划分成两块进行复制移动，而且存活对象过多会导致效率低下

这时复制的升级版，其实它会将不可用对象清除后将可用对象向一端移动，这样的好处是不会有内存碎片并且不需要划分内存空间、但是效率会比较低

这是最常用的算法，会根据内存空间进行划分，并且针对不同的内存选择不同的算法：例如新生代可以选用复制算法，默认新生代的对象很多都需要被回收；而老年代采用标记压缩或复制，腾出大片内存。

## **常见的垃圾回收器**

## **如何判断当前参数**

[https://docs.oracle.com/javase/8/docs/technotes/tools/unix/java.html](https://link.zhihu.com/?target=https%3A//docs.oracle.com/javase/8/docs/technotes/tools/unix/java.html)

-XX:+PrintCommandLineFlags：当前jvm参数

-XX:+PrintFlgsFinal ：最终参数值

-XX:+PrintFlagsInitial：默认参数值

1.8版本默认使用的应该是Paraller GC 并行回收 ： 默认使用 Parallel Scavenge（新生代）+ Serial Old（老年代）。

![image](./image-05.jpg)

这里整理一个简单的表格，对这几种GC做简单的对比：

| GC | 特性 | 描述 |
| --- | --- | --- |
| Paraller | 吞吐量 | 多线程STW |
| G1（Garbage first） | 均衡 | 多线程SWT 并发 分代回收 |
| ZGC（Z Garbage） | 延迟 | 所有并发 |
| Shenandoah（jdk 12后） | 延迟 | 所有并发 |
| Serial | 内存大小 启动时间 | 单线程STW |

**Parallel GC是JDK 8以及更早版本的默认回收期。它专注于吞吐量，尽快完成工作，而很少考虑延迟（暂停）。**

**Parallel GC会在STW（全局暂停）期间，以更紧凑的方式，将正在使用中的内存移动（复制）到堆中的其他位置，从而制造出大片的空闲内存区域。当内存分配请求无法满足时就会发生STW暂停，然后JVM完全停止应用程序运行，投入尽可能多的处理器线程，让垃圾回收算法执行内存压缩工作，然后分配请求的内存，最后恢复应用程序执行。**

**G1 GC是JDK 9以后的默认回收期。G1试图平衡吞吐量和延迟。一方面，在STW暂停期间，依然会利用分代继续执行内存回收工作，从而最大化效率，这一点和Parallel GC相同；但是，它还会尽可能避免在暂停期间执行需要较长时间的操作。G1的长时间操作会与应用程序并行进行，即通过多线程方式，在应用程序运行时执行。这样可以大幅度减少暂停，代价是整体的吞吐量会降低一点。**

**所以，GC在8-9版本其实是一个分水岭，从9版本后默认使用G1，并且优化了G1处理的时间，包括G1处理大对象及老年代的时间。**

那么，哪些场景下适用哪些垃圾回收器呢？

Serial：适用于单线程场景，简单的client客户端，内存小，没有过多的对象，单线程回收不需要线程切换的开销。

ParNew/Paraller ：多CPU的服务器，可以采用多线程的方式回收，但是Paraller 追求的是短时间内尽量完成任务，那么就会有SWT时间，不适合交互型场景；ParNew降低了SWT时间，更适合交互场景。

Parallel Scavenge提供的参数

-XX:GCTimeRadio
直接设置吞吐量大小,GC时间占总时间比率.相当于是吞吐量的倒数.

-XX:MaxGCPauseMillis
设置最大GC停顿时间.
Parallel Scavenge会根据这个值的大小确定新生代的大小.如果这个值越小,新生代就会越小,从而收集器就能以较短的时间进行一次回收;但新生代变小后,回收的频率就会提高,吞吐量也降下来了,因此要合理控制这个值.

-XX:+UseAdaptiveSizePolicy
通过命令就能开启GC 自适应的调节策略(区别于ParNew).我们只要设置最大堆(-Xmx)和MaxGCPauseMillis或GCTimeRadio,收集器会自动调整新生代的大小、Eden和Survior的比例、对象进入老年代的年龄,以最大程度上接近我们设置的MaxGCPauseMillis或GCTimeRadio

## **聊聊G1**

首先一点，不论是新生代还是老年代，G1 ZGC等垃圾回收器是不区分内存类型的。

通过 -XX:+UseG1GC 可以指定使用G1垃圾回收器。

G1首先具备压缩功能、避免碎片化内存问题、而且G1的SWT暂停时间可控、多线程GC、面向服务端应用比较友好、而且可以预测停顿的时间。

首先，G1会将所有堆内存划分成很多块大小相等的Region。每次要触发GC时，首先估算每个Region中可回收垃圾的数量、每次先从可回收最大的量开始回收，因此它的效率性能是很高的。

![image](./image-06.jpg)

这样，其实在G1里，不再区分老年代新生代了，整个堆内存都是Region。但是衍生出了一个Humongous，它是特殊的Old，专门存放大型的对象。

这样的划分方式意味着不需要一个连续的内存空间管理对象.G1将空间分为多个区域,优先回收垃圾最多的区域.
G1采用的是Mark-Copy ，有非常好的空间整合能力,不会产生大量的空间碎片
G1的一大优势在于可预测的停顿时间,能够尽可能快地在指定时间内完成垃圾回收任务，通过jstat命令可以查看垃圾回收情况,在YGC时S0/S1并不会交换.

那么，如果一个对象，它自身和它持有引用的对象没有分配在一个Region中，我们是否需要遍历所有的Region才能进行一次GCRoot？每个Region上都有一个RememberSet，用于记录当前区域引用对象所在的区域。

G1的GC模式

1.YoungGC年轻代收集
在分配一般对象（非巨型对象）时，当所有eden region使用达到最大阀值并且无法申请足够内存时，会触发一次YoungGC。每次younggc会回收所有Eden以及Survivor区，并且将存活对象复制到Old区以及另一部分的Survivor区。
YoungGC的回收过程如下：
根扫描,跟CMS类似，Stop the world，扫描GC Roots对象。
处理Dirty card,更新RSet.
扫描RSet,扫描RSet中所有old区对扫描到的young区或者survivor去的引用。
拷贝扫描出的存活的对象到survivor2/old区
处理引用队列，软引用，弱引用，虚引用

2. mixed gc
当越来越多的对象晋升到老年代old region时，为了避免堆内存被耗尽，虚拟机会触发一个混合的垃圾收集器，即mixed gc，该算法并不是一个old gc，除了回收整个young region，还会回收一部分的old region，这里需要注意：是一部分老年代，而不是全部老年代，可以选择哪些old region进行收集，从而可以对垃圾回收的耗时时间进行控制。
G1没有fullGC概念，需要fullGC时，调用serialOldGC进行全堆扫描（包括eden、survivor、o、perm）。
何时使用G1
G1的第一个重要特点是为用户的应用程序的提供一个低GC延时和大内存GC的解决方案。这意味着堆大小6GB或更大，稳定和可预测的暂停时间将低于0.5秒。
如果应用程序使用CMS或ParallelOld垃圾回收器具有一个或多个以下特征，将有利于切换到G1：
Full GC持续时间太长或太频繁
对象分配率或年轻代升级老年代很频繁
不期望的很长的垃圾收集时间或压缩暂停（超过0.5至1秒）
注意：如果你正在使用CMS或ParallelOld收集器，并且你的应用程序没有遇到长时间的垃圾收集暂停，则保持与您的当前收集器是很好的，升级JDK并不必要更新收集器为G1。

## **关于jvm调优**

关于jvm调优，我相信很多人甚至不会接触，因为毕竟有多少开发能直接操作线上服务器环境呢？可能也就是公司大牛级别的人了。
jvm本身东西很多，但是更多的说到jvm调优，我们主要是针对full GC 就是FGC的优化，至于YGC 是正常的，但是我们希望在应用服务中，更多的对象应该在YGC被回收，而不是无法回收全部放入FGC，因为FGC里的对象都是长期存活的，对应的FGC的时间也会更长！！同时还有一些基于jvm的参数，例如新生代中eden、s0、s1的大小，这些都会直接影响到对象是否会被直接扔在老年代中。**当然，如果线上程序很稳定，jvm监控FGC的频率 时间都很正常，不建议修改jvm的参数！而且升级jdk版本也无需修改GC回收器！！**

首先，我们要知道哪些会导致FGC

1.System.gc()方法的调用
此方法的调用是建议JVM进行Full GC,虽然只是建议而非一定，但很多情况下它会触发 Full GC,从而增加Full GC的频率，也即增加了间歇性停顿的次数。强烈影响系建议能不使用此方法就别使用，让虚拟机自己去管理它的内存，可通过通过-XX:+ DisableExplicitGC来禁止RMI（Java远程方法调用）调用System.gc。

2.老年代空间不足
在Survivor区域的对象满足晋升到老年代的条件时，晋升进入老年代的对象大小大于老年代的可用内存，这个时候会触发Full GC。，当执行Full GC后空间仍然不足，则抛出错误：java.lang.OutOfMemoryError: Java heap space 。为避免以上两种状况引起的FullGC，调优时应尽量做到让对象在Minor GC阶段被回收、让对象在新生代多存活一段时间及不要创建过大的对象及数组。

3.Metaspace区内存达到阈值

4.统计得到的Minor GC晋升到旧生代的平均大小大于老年代的剩余空间 Survivor区域对象晋升到老年代有两种情况：
（1）一种是给每个对象定义一个对象计数器，如果对象在Eden区域出生，并且经过了第一次GC，那么就将他的年龄设置为1，在Survivor区域的对象每熬过一次GC，年龄计数器加一，等到到达默认值15时，就会被移动到老年代中，默认值可以通过-XX:MaxTenuringThreshold来设置。
（2）另外一种情况是如果JVM发现Survivor区域中的相同年龄的对象占到所有对象的一半以上时，就会将大于这个年龄的对象移动到老年代，在这批对象在统计后发现可以晋升到老年代，但是发现老年代没有足够的空间来放置这些对象，这就会引起Full GC。

5.堆中产生大对象超过阈值这个参数可以通过-XX:PretenureSizeThreshold进行设定，大对象或者长期存活的对象进入老年代，典型的大对象就是很长的字符串或者数组，它们在被创建后会直接进入老年代，虽然可能新生代中的Eden区域可以放置这个对象，在要放置的时候JVM如果发现老年代的空间不足时，会触发GC。

*6.老年代连续空间不足*
*JVM如果判断老年代没有做足够的连续空间来放置大对象，那么就会引起Full GC，例如老年代可用空间大小为200K，但不是连续的，连续内存只要100K，而晋升到老年代的对象大小为120K，由于120＞100的连续空间，所以就会触发Full GC。*

那如何排查服务gc频率呢？

直接上arthas：

- Github：[https://github.com/alibaba/arthas](https://link.zhihu.com/?target=https%3A//github.com/alibaba/arthas)
- 文档：[https://arthas.aliyun.com/doc/](https://link.zhihu.com/?target=https%3A//arthas.aliyun.com/doc/)

[https://arthas.aliyun.com/doc/vmoption.html](https://link.zhihu.com/?target=https%3A//arthas.aliyun.com/doc/vmoption.html) 通过dashboard 以及命令可以排查gc的问题：

- 使用vmoption命令动态打开GC日志

$ vmoption PrintGC true

```text
$ vmoption PrintGC true
Successfully updated the vm option.
NAME     BEFORE-VALUE  AFTER-VALUE
------------------------------------
PrintGC  false         true
```

$ vmoption PrintGCDetailstrue

```text
$ vmoption PrintGCDetails true
Successfully updated the vm option.
NAME            BEFORE-VALUE  AFTER-VALUE
-------------------------------------------
PrintGCDetails  false         true
```

- 使用vmtool强制GC

$ vmtool --action forceGc

```text
[GC (JvmtiEnv ForceGarbageCollection) [PSYoungGen: 2184K->352K(76288K)] 19298K->17474K(166912K), 0.0011562 secs] [Times: user=0.01 sys=0.00, real=0.00 secs]
[Full GC (JvmtiEnv ForceGarbageCollection) [PSYoungGen: 352K->0K(76288K)] [ParOldGen: 17122K->16100K(90112K)] 17474K->16100K(166400K), [Metaspace: 20688K->20688K(1069056K)], 0.0232947 secs] [Times: user=0.14 sys=0.01, real=0.03 secs]
```

- 其他gc参数

$ vmoption PrintGCID true 打印GC ID

```text
$ vmoption PrintGCID true
Successfully updated the vm option.
NAME       BEFORE-VALUE  AFTER-VALUE
--------------------------------------
PrintGCID  false         true
```

$ vmoption PrintGCDateStampstrue 打印GC时间戳

```text
$ vmoption PrintGCDateStamps true
Successfully updated the vm option.
NAME               BEFORE-VALUE  AFTER-VALUE
----------------------------------------------
PrintGCDateStamps  false         true
```

$ vmoption PrintGCTimeStampstrue 打印GC启动时间

```text
$ vmoption PrintGCTimeStamps true
Successfully updated the vm option.
NAME               BEFORE-VALUE  AFTER-VALUE
----------------------------------------------
PrintGCTimeStamps  false         true
```

- heapdump

打开HeapDumpBeforeFullGC开关，可以在GC前生成heapdump文件；打开HeapDumpAfterFullGC开关，可以在GC结束后生成heapdump文件

```text
$ vmoption HeapDumpBeforeFullGC true
Successfully updated the vm option.
NAME                  BEFORE-VALUE  AFTER-VALUE
-------------------------------------------------
HeapDumpBeforeFullGC  false         true
$ vmtool --action forceGc
```

再使用vmtool --action forceGc强制GC，则可以在GC日志中发现heapdump信息，并且在应用目录下会生成heapdump hprof

打开PrintClassHistogramBeforeFullGC开关，可以在GC前打印类直方图；打开PrintClassHistogramAfterFullGC开关，可以在GC结束后打印类直方图

```text
$ vmoption PrintClassHistogramBeforeFullGC true
Successfully updated the vm option.
NAME                             BEFORE-VALUE  AFTER-VALUE
------------------------------------------------------------
PrintClassHistogramBeforeFullGC  false         true
$ vmtool --action forceGc
```

再使用vmtool --action forceGc强制GC，在GC日志中会打印类直方图，可以直观知道每个类的instances数量，占用内存大小：

```text
#13: [Class Histogram (before full gc):
num     #instances         #bytes  class name
----------------------------------------------
1:         24519        5783400  [C
2:          5648        5102712  [B
3:          3685         888128  [Ljava.lang.Object;
4:          3255         619560  [I
5:         24263         582312  java.lang.String
6:          4227         475320  java.lang.Class
7:          1288         402112  [Ljava.util.HashMap$Node;
8:            75         296160  [Ljava.nio.channels.SelectionKey;
9:          6759         216288  java.util.HashMap$Node
10:          2069         182072  java.lang.reflect.Method
11:          3326         133040  java.util.LinkedHashMap$Entry
```

具体使用，参考arthas的使用文档。

## **常用JVM参数**

```text
堆设置：
-Xmx3500m 设置JVM最大可用内存为3550M
-Xms3500m 设置JVM堆内存为3550m。此值可以设置与-Xmx相同，以避免每次垃圾回收完成后JVM重新分配内存
-Xmn2g 设置年轻代大小为2G
-Xss128k 设置每个线程的堆栈大小
‐XX:MetaspaceSize=256M  设置元空间大小
‐XX:MaxMetaspaceSize=256M  设置元空间最大值
-XX:NewRatio=4 设置年轻代（包括Eden和两个Survivor区）与年老代的比值（除去持久代）
-XX:SurvivorRatio=4 设置年轻代中Eden区与Survivor区的大小比值。设置为4，则两个Survivor区与一个Eden区的比值为2:4
-XX:MaxPermSize=16m 设置持久代大小为16m
-XX:MaxTenuringThreshold=0 设置垃圾最大年龄，如果设置为0的话，则年轻代对象不经过Survivor区，直接进入年老代
垃圾收集器：
-XX:+UseParallelGC 选择垃圾收集器为并行收集器
-XX:ParallelGCThreads=20 配置并行收集器的线程数
-XX:+UseParallelOldGC 配置年老代垃圾收集方式为并行收集
-XX:MaxGCPauseMillis=100 设置每次年轻代垃圾回收的最长时间，如果无法满足此时间，JVM会自动调整年轻代大小，以满足此值
-XX:+UseConcMarkSweepGC设置年老代为CMS并发收集
-XX:+UseParNewGC 设置年轻代为并行收集。可与CMS收集同时使用
日志打印：
-XX:+PrintGC
-XX:+PrintGCDetails
-XX:+PrintGCTimeStamps
-XX:+PrintGCApplicationStoppedTime 打印垃圾回收期间程序暂停的时间
-XX:PrintHeapAtGC 打印GC前后的详细堆栈信息
```

例如：

1.将堆的最大、最小设置为相同的值，目的是防止垃圾收集器在最小、最大之间收缩堆而产生额外的时间。
-Xmx3550m： 最大堆大小为3550m。
-Xms3550m： 设置初始堆大小为3550m。

2.在配置较好的机器上（比如多核、大内存），可以为老年代选择并行收集算法： -XX:+UseParallelOldGC 。

3.年轻代和老年代将根据默认的比例（1：2）分配堆内存， 可以通过调整二者之间的比率来调整二者之间的大小，也可以针对回收代。

比如年轻代，通过 -XX:newSize -XX:MaxNewSize来设置其绝对大小。同样，为了防止年轻代的堆收缩，我们通常会把-XX:newSize -XX:MaxNewSize设置为同样大小。

4.年轻代和老年代设置多大才算合理

1）更大的年轻代必然导致更小的老年代，大的年轻代会延长普通GC的周期，但会增加每次GC的时间；小的老年代会导致更频繁的Full GC

2）更小的年轻代必然导致更大老年代，小的年轻代会导致普通GC很频繁，但每次的GC时间会更短；大的老年代会减少Full GC的频率

如何选择应该依赖应用程序对象生命周期的分布情况： 如果应用存在大量的临时对象，应该选择更大的年轻代；如果存在相对较多的持久对象，老年代应该适当增大。但很多应用都没有这样明显的特性。

在抉择时应该根 据以下两点：
（1）本着Full GC尽量少的原则，让老年代尽量缓存常用对象，JVM的默认比例1：2也是这个道理 。
（2）通过观察应用一段时间，看其他在峰值时老年代会占多少内存，在不影响Full GC的前提下，根据实际情况加大年轻代，比如可以把比例控制在1：1。但应该给老年代至少预留1/3的增长空间。

在实际过程中，我们并不频繁调整JVM参数，保证能够使用就好，当然在日常的监控中我们可以观察一下jvm中gc的频率，FGC的大小，根据具体的场景进行选择！正常情况下非必要不要去尝试调整，否则线上问题会很头疼。
