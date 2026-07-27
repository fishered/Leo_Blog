---
title: "【juc】原子类和CAS原理"
description: "由于JVM的sychronized内置锁涉及操作系统的内核的互斥锁，线程都会存在从用户态到内核态的切换，导致开销过大；而优化后的轻量级锁使用CAS进行自旋，所以轻量锁开销较小。CASCAS的全拼是：Compare And Swap，比较并交换。字面我们可以将它拆分成两个步骤： …"
published: 2024-01-05
slug: zhihu-676290217
tags:
  - "JUC"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/676290217
  published: 2024-01-05
---

> 由于JVM的sychronized内置锁涉及操作系统的内核的互斥锁，线程都会存在从用户态到内核态的切换，导致开销过大；而优化后的轻量级锁使用CAS进行自旋，所以轻量锁开销较小。

## CAS

CAS的全拼是：Compare And Swap，比较并交换。字面我们可以将它拆分成两个步骤：

1. 比较
2. 交换

在JDK5+版本中，优化了juc并发包对操作系统的底层CAS原子操作，通常位于sun.misc.Unsafe类中。Unsafe类是一个“危险”的类，它提供了一些直接访问内存的方法，而且这些方法都是被native修饰的，具体的实现都是依赖于C++语言实现的本地方法，在JDK9+版本后使用了：

```java
@ForceInline
```

它其实就是链接到VM C++的本地方法，它提供了可以像C语言一样使用指针操作内存空间的方法，这会使代码变得“不那么安全”。

对于操作系统而言，在之前的线程篇幅中说过VM Thread会根据不同架构的平台做了相应的规范，例如linux、windows、非X86等；**而CAS操作是一条CPU的原子指令（cmpxchg指令），由于指令是具备原子性的，因此使用CAS的方式操作数据不会造成数据不一致**。而在Unsafe中提供的native方法直接调用底层CPU的指令。

```java
public final class Unsafe {
//final修饰的类
static {
Reflection.registerMethodsToFilter(Unsafe.class, "getUnsafe");
}

private Unsafe() {}
//私有的构造方法
private static final Unsafe theUnsafe = new Unsafe();
private static final jdk.internal.misc.Unsafe theInternalUnsafe = jdk.internal.misc.Unsafe.getUnsafe();
}
```

### CAS实例

从Unsafe类源码中，可以看到Unsafe是不允许被继承并且是private类型的构造函数，因此我们无法通过普通方式将它实例化，那么我们如何获取一个Unsafe实例呢？[1]

```java
/**
* 获取Unsafe实例的方法
* @return
*/
public static Unsafe getUnsafeInstance(){
try {
Field theUnsafe = sun.misc.Unsafe.class.getDeclaredField("theUnsafe");
theUnsafe.setAccessible(true);
return (Unsafe) theUnsafe.get(null);
} catch (NoSuchFieldException e) {
throw new RuntimeException(e);
} catch (IllegalAccessException e) {
throw new RuntimeException(e);
}
}
```

Unsafe为我们提供了CAS方法的封装：

```java
/**
* Atomically updates Java variable to {@code x} if it is currently
* holding {@code expected}.
*
* <p>This operation has memory semantics of a {@code volatile} read
* and write.  Corresponds to C11 atomic_compare_exchange_strong.
*
* @return {@code true} if successful
*/
@ForceInline
public final boolean compareAndSwapObject(Object o, long offset,
Object expected,
Object x) {
return theInternalUnsafe.compareAndSetObject(o, offset, expected, x);
}

/**
* Atomically updates Java variable to {@code x} if it is currently
* holding {@code expected}.
*
* <p>This operation has memory semantics of a {@code volatile} read
* and write.  Corresponds to C11 atomic_compare_exchange_strong.
*
* @return {@code true} if successful
*/
@ForceInline
public final boolean compareAndSwapInt(Object o, long offset,
int expected,
int x) {
return theInternalUnsafe.compareAndSetInt(o, offset, expected, x);
}

/**
* Atomically updates Java variable to {@code x} if it is currently
* holding {@code expected}.
*
* <p>This operation has memory semantics of a {@code volatile} read
* and write.  Corresponds to C11 atomic_compare_exchange_strong.
*
* @return {@code true} if successful
*/
@ForceInline
public final boolean compareAndSwapLong(Object o, long offset,
long expected,
long x) {
return theInternalUnsafe.compareAndSetLong(o, offset, expected, x);
}
```

在compareAndSwap方法中，包含了四个参数，分别是：

- Object o：操作字段所属的对象
- long offset：需要操作的偏移量
- <T> expected：旧值
- <T> x：新值

返回值：boolean：更新成功 or 失败。

在执行Unsafe的CAS方法时，首先将内存位置的值与旧值进行比较，如果匹配，处理器会将内存的值更新为新值，并返回；如果不匹配则不做任何处理，并返回失败。

### CAS获取offset（偏移量）

```java
/**
* Reports the location of a given field in the storage allocation of its
* class.  Do not expect to perform any sort of arithmetic on this offset;
* it is just a cookie which is passed to the unsafe heap memory accessors.
*
* <p>Any given field will always have the same offset and base, and no
* two distinct fields of the same class will ever have the same offset
* and base.
*
* <p>As of 1.4.1, offsets for fields are represented as long values,
* although the Sun JVM does not use the most significant 32 bits.
* However, JVM implementations which store static fields at absolute
* addresses can use long offsets and null base pointers to express
* the field locations in a form usable by {@link #getInt(Object,long)}.
* Therefore, code which will be ported to such JVMs on 64-bit platforms
* must preserve all bits of static field offsets.
* @see #getInt(Object, long)
*/
@ForceInline
public long objectFieldOffset(Field f) {
return theInternalUnsafe.objectFieldOffset(f);
}

/**
* Reports the location of a given static field, in conjunction with {@link
* #staticFieldBase}.
* <p>Do not expect to perform any sort of arithmetic on this offset;
* it is just a cookie which is passed to the unsafe heap memory accessors.
*
* <p>Any given field will always have the same offset, and no two distinct
* fields of the same class will ever have the same offset.
*
* <p>As of 1.4.1, offsets for fields are represented as long values,
* although the Sun JVM does not use the most significant 32 bits.
* It is hard to imagine a JVM technology which needs more than
* a few bits to encode an offset within a non-array object,
* However, for consistency with other methods in this class,
* this method reports its result as a long value.
* @see #getInt(Object, long)
*/
@ForceInline
public long staticFieldOffset(Field f) {
return theInternalUnsafe.staticFieldOffset(f);
}
```

上面的代码是为了获取field的offset，在CAS操作中会使用这两个方法，其中staticFieldOffset用于获取静态Field；而objectFieldOffset是用于获取非静态Field。

### CAS无锁实现

CAS是一种无锁算法。它采用比较-交换的方式，避免了锁编程。CAS依赖于两个值：期望值（旧值）、目标值（新值），所以CAS无锁的实现步骤如下：

1. 获取字段的期望值（旧值）
2. 计算需要替换的值（新值）
3. 通过CAS执行CPU指令，将新值放在目标字段的内存地址上，如果CAS失败，就重复（1，2），直到CAS替换成功，**这是一种自旋的处理方式。**

所以在使用CAS时，我们可以这样使用：

```java
do{
oldValue、newValue
}while(!CAS(obj, oldValue, newValue))
```

![image](./image-01.jpg)

*线程并发修改*

假设obj Field初始值是0，我们有两个线程Thread1和Thread2，它们都需要对Field的值进行修改；Thread1的期望值是1，Thread2的期望值是2。线程是并发执行的，谁都有可能先执行，***但是CAS是一个原子性操作***[2]。我们假设Thread1先执行，由于oldValue与初始值相同，所以Thread1会操作成功返回true；接着Thread2进行执行（看红色图），这时初始值已经被Thread1改成1了，不满足期望值0，Thread2开始自旋：

***Thread2首先获取到oldValue是1，再进行CAS操作，这次Thread2的初始值与预期值相等，那么Thread2成功修改为3后返回true。***

***当CAS进行比较时，如果相等就证明内存中的值没有被改[3]，可以替换成新值；如果不相等说明内存中值已经被修改过，则放弃这次操作接着自旋。当并发线程少，冲突少，自旋的次数往往会很少，CAS的性能会较高；当并发线程较多时，同理自旋的次数就会增加，CAS的性能就会降低，所以无锁编程效率主要取决于并发量的大小。***

## ***JUC原子类***

> 在之前的介绍中，我们直到++操作不是一个原子操作，所以它会有并发问题；通常我们可以将这类操作放在同步代码块中，保证同一时间只有一个线程进行处理；但是这样会降低程序的性能：***锁与同步块的颗粒度决定执行的效率***。那么我们有没有方式改善这一点呢？

### Atomic原子类

Atomic类有一个特点，就是不可中断。在Atomic的衍生类中，都有相同的特性：它们的操作是原子操作。

Atomic类位于java.util.concurrent.atomic包下：

![image](./image-02.jpg)

*Atomic的源码位置*

通过命名，我们可以发现Atomic下的类可以分为以下几种：

- 基本类型 如：AtomicBoolean、AtomicInteger 等...
- 引用类型 如：AtomicReference 等...
- 数组类型 如：AtomicLongArray、AtomicIntegerArray 等...
- 数据更新类型 如：AtomicIntegerFieldUpdater 等...

### 基础类型、数组类型Atomic使用

```java
public static void main(String[] args) throws InterruptedException {
CountDownLatch latch = new CountDownLatch(THREAD_COUNT);
//定义AtomicInteger
AtomicInteger atomicInteger = new AtomicInteger(0);

for (int i = 0; i < THREAD_COUNT; i++) {
//创建10个线程 模拟并发
Executors.newFixedThreadPool(10).submit(() -> {
for (int j = 0; j < 1000; j++) {
atomicInteger.getAndIncrement();
}
latch.countDown();
});
}
latch.await();
System.out.println(atomicInteger.get());
}
```

多次执行，发现总计和为10000，Atomic基础类型对并发操作是线程安全的。数组类型的用法类似，只是可以修改数组中的数据。

```java
public class AtomicInteger extends Number implements java.io.Serializable {
private static final long serialVersionUID = 6214790243416807050L;

//获取UnSafe的实例
private static final Unsafe unsafe = Unsafe.getUnsafe();
//value的偏移量
private static final long valueOffset;

static {
try {
//计算value的偏移量
valueOffset = unsafe.objectFieldOffset
(AtomicInteger.class.getDeclaredField("value"));
} catch (Exception ex) { throw new Error(ex); }
}

/**
* Creates a new AtomicInteger with the given initial value.
*
* @param initialValue the initial value
*/
public AtomicInteger(int initialValue) {
value = initialValue;
}

/**
* Creates a new AtomicInteger with initial value {@code 0}.
*/
public AtomicInteger() {
}

/**
* Gets the current value.
*
* @return the current value
*/
public final int get() {
return value;
}

//返回旧值并赋新值
public final int getAndSet(int newValue) {
return unsafe.getAndSetInt(this, valueOffset, newValue);
}

//封装的CAS操作
public final boolean compareAndSet(int expect, int update) {
return unsafe.compareAndSwapInt(this, valueOffset, expect, update);
}

//自增
public final int getAndIncrement() {
return unsafe.getAndAddInt(this, valueOffset, 1);
}
}
```

以getAndSetInt()举例：

```java
public final int getAndSetInt(Object o, long offset, int newValue) {
int v;
do {
//获取旧值 失败就重新获取
v = getIntVolatile(o, offset);
//直到CAS执行成功，就返回旧值
} while (!compareAndSwapInt(o, offset, v, newValue));
return v;
}

```

### 引用类型Atomic使用

```java
public void updateUser(){
AtomicReference<User> userAtomicReference = new AtomicReference<>();

User user = new User("test", 10);
//赋值
userAtomicReference.set(user);
//定义修改的对象
User updateUser = new User("test2", 20);
userAtomicReference.compareAndSet(user, updateUser);
}

@Data
@AllArgsConstructor
@NoArgsConstructor
public class User implements Serializable {
private String name;
private volatile int age;
}
```

### 更新属性Atomic使用

```java
public void updateField(){
AtomicIntegerFieldUpdater<User> updater = AtomicIntegerFieldUpdater.newUpdater(User.class, "age");

User user = new User("test", 10);
updater.getAndIncrement(user);
updater.getAndAdd(user, 100);
}
```

### ABA问题

ABA问题是CAS的一个比较经典的问题，老样子我们用一张图来解释它

![image](./image-03.jpg)

*ABA问题*

假设线程以1，3，2的方式运行，那么Thread1处理完后初始值为1；Thread3转手立刻将初始值改为0，Thread2经过对比发现与预期值相同，它也可以CAS自旋修改；但是其实初始值已经被Thread3进行了修改。这就是典型的ABA问题，值由A -> B -> A，值并没有发生变化但是其实它是被修改过的。

在乐观锁中，我们往往使用版本号作为防止ABA的手段，例如myBatisPlus中解决乐观锁的方式，就是内置一个version属性：每次操作时都会让上一个版本号自增，通过对比版本号可以发现是否存在了ABA的问题，因为版本号只会递增而不会减少。但是版本号的处理方式在某些情况会使问题变得”复杂“。

### 利用AtomicStampedReference来解决ABA问题

有了乐观锁的基础，我们知道只要存在一种”标记“它可以在每次处理更新，那么我们就可以避免ABA问题。

```java
public class AtomicStampedReference<V> {

private static class Pair<T> {
final T reference;
final int stamp;
private Pair(T reference, int stamp) {
this.reference = reference;
this.stamp = stamp;
}
static <T> Pair<T> of(T reference, int stamp) {
return new Pair<T>(reference, stamp);
}
}

//initialRef：原始数据 initialStamp：原始版本号
public AtomicStampedReference(V initialRef, int initialStamp) {
pair = Pair.of(initialRef, initialStamp);
}

//获取引用数据
public V getReference() {
return pair.reference;
}

//获取印戳（版本号）
public int getStamp() {
return pair.stamp;
}

public boolean compareAndSet(V   expectedReference,
V   newReference,
int expectedStamp,
int newStamp) {
Pair<V> current = pair;
return
expectedReference == current.reference &&
expectedStamp == current.stamp &&
((newReference == current.reference &&
newStamp == current.stamp) ||
casPair(current, Pair.of(newReference, newStamp)));
}
}
```

可以发现，其实它的设计思想就是复制了乐观锁的思想，通过它去处理ABA问题。

### 利用AtomicMarkableReference解决ABA问题

```java
public class AtomicMarkableReference<V> {

private static class Pair<T> {
final T reference;
final boolean mark;
private Pair(T reference, boolean mark) {
this.reference = reference;
this.mark = mark;
}
static <T> Pair<T> of(T reference, boolean mark) {
return new Pair<T>(reference, mark);
}
}

private volatile Pair<V> pair;
}
```

在AtomicMarkableReference中，它与AtomicStampedReference是类似的，通过源码的结构可以看出基本一摸一样，不一样的是Pair封装的节点中mark是boolean类型的。这说明对于AtomicMarkableReference而言，它不会关心你修改了几次计数，而只关心你有没有修改。

## ***并发场景CAS性能***

***在之前的文章中，我写过关于jdk内置锁及锁升级，在轻量锁CAS下 会提升性能，jdk采用的是自适应CAS，就是为了防止CAS自旋时间过长导致CPU资源被大量浪费。***

### 以空间换时间LongAdder

在并发量高的场景下，使用CAS处理Atomic必定会导致性能下降，因为并发量增大，每个线程自旋的时间就会更长。在jdk8+中，给我们提供了一个新的类LongAdder，它采用的以空间换时间的方式，设计与ConcurrentHashMap[4]颇为相似：将操作的数据分成一个数组，通过Hash算法将操作的线程分布到不同的数组下标进行操作；获取最终结果时将数组元素聚合起来，我们用一张图来简单解释这种设计：

![image](./image-04.jpg)

*LongAdder演变*

如图，红色为AtomicInteger的处理方式，而绿色为LongAdder的处理方式。在AtomicInteger中，所有的线程都会操作同一个value，那么随着线程数量增加，每个线程的CAS时间将会更长，失败率就越高，在高并发量下，大量的线程都在**空自旋，**而LongAdder的思想是将value进行分散，不同的线程处理不同的数据，CAS的成功率就会更高。

在LongAdder中，如果最初无竞争，那么只会存储一个base节点，所有的操作都在base节点上；当发生竞争后，CAS的操作失败了，就初始化cell数组，在并发量高的情况下，cell数组的成本可以忽略不计。

### LongAdder的父类Striped64

```java
//成员变量Cell节点
@sun.misc.Contended static final class Cell {
volatile long value;
Cell(long x) { value = x; }
final boolean cas(long cmp, long val) {
return UNSAFE.compareAndSwapLong(this, valueOffset, cmp, val);
}

// Unsafe mechanics
private static final sun.misc.Unsafe UNSAFE;
private static final long valueOffset;
static {
try {
UNSAFE = sun.misc.Unsafe.getUnsafe();
Class<?> ak = Cell.class;
valueOffset = UNSAFE.objectFieldOffset
(ak.getDeclaredField("value"));
} catch (Exception e) {
throw new Error(e);
}
}
}

/** Number of CPUS, to place bound on table size */
static final int NCPU = Runtime.getRuntime().availableProcessors();

/**
* Table of cells. When non-null, size is a power of 2.
*/
//存储cell节点的数组
transient volatile Cell[] cells;

/**
* Base value, used mainly when there is no contention, but also as
* a fallback during table initialization races. Updated via CAS.
*/
//基础值,在没有竞争时默认处理base，而不会初始化数组
transient volatile long base;

/**
* Spinlock (locked via CAS) used when resizing and/or creating Cells.
*/
//自旋锁 通过CAS处理 为0是默认使用base 为1表示已经存在竞争创建了cell数组
transient volatile int cellsBusy;

/**
* Package-private default constructor
*/
Striped64() {
}
}
```

在Striped64中，如果cellsBusy为0，那么不存在竞争，就不需要创建或扩容数组。

```java
public long sum() {
Cell[] as = cells; Cell a;
long sum = base;
if (as != null) {
for (int i = 0; i < as.length; ++i) {
if ((a = as[i]) != null)
sum += a.value;
}
}
return sum;
}
```

在LongAdder中，获取值其实就是将cell的节点加起来。

在Striped64中，提供了实现不同线程更新各自cell节点中的值的方法：

```java
final void longAccumulate(long x, LongBinaryOperator fn,
boolean wasUncontended) {
int h;
if ((h = getProbe()) == 0) {
ThreadLocalRandom.current(); // force initialization
h = getProbe();
wasUncontended = true;
}
boolean collide = false;                //是否可以扩容
for (;;) {    //自旋到永远除非操作成功
Cell[] as; Cell a; int n; long v;    //as：cells引用、a：命中的cell、n：数组长度、v：期望值
if ((as = cells) != null && (n = as.length) > 0) {
if ((a = as[(n - 1) & h]) == null) {
//如果cell为空，那么就需要创建新的cell
if (cellsBusy == 0) {       // Try to attach new Cell
Cell r = new Cell(x);   // Optimistically create
if (cellsBusy == 0 && casCellsBusy()) {
boolean created = false;
try {               // Recheck under lock
Cell[] rs; int m, j;
if ((rs = cells) != null &&
(m = rs.length) > 0 &&
rs[j = (m - 1) & h] == null) {
rs[j] = r;
created = true;
}
} finally {
cellsBusy = 0;
}
if (created)
break;
continue;           // Slot is now non-empty
}
}
collide = false;
}
//当前线程修改失败
else if (!wasUncontended)       // CAS already known to fail
wasUncontended = true;      // Continue after rehash
else if (a.cas(v = a.value, ((fn == null) ? v + x :
fn.applyAsLong(v, x))))
//CAS更新成功
break;
//调整扩容策略
else if (n >= NCPU || cells != as)
collide = false;            // At max size or stale
else if (!collide)
collide = true;
//实际扩容的方法
else if (cellsBusy == 0 && casCellsBusy()) {
try {
if (cells == as) {      // Expand table unless stale
Cell[] rs = new Cell[n << 1];
for (int i = 0; i < n; ++i)
rs[i] = as[i];
cells = rs;
}
} finally {
cellsBusy = 0; //释放锁
}
collide = false;
continue;                   // Retry with expanded table
}
h = advanceProbe(h);
}
else if (cellsBusy == 0 && cells == as && casCellsBusy()) {
boolean init = false;
try {                           // Initialize table
if (cells == as) {
Cell[] rs = new Cell[2];
rs[h & 1] = new Cell(x);
cells = rs;
init = true;
}
} finally {
cellsBusy = 0;
}
if (init)
break;
}
else if (casBase(v = base, ((fn == null) ? v + x :
fn.applyAsLong(v, x))))
break;                          // Fall back on using base
}
}
```

在调整扩容时，我们发现elseif(n >= NCPU || cells != as) 即最大的长度就是CPU的核数，它的目的是为了线程都可以获取到CPU的切片执行；***而cellsBusy就相当于一把锁，因为它的修改需要CAS处理，如果其他线程修改它失败了，说明cells正在初始化或者扩容。***
