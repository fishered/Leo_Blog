---
title: "【jdk】关于List"
description: "关于List是基于Collection接口的实现类ArrayList//这个就是存储数据的数组，扩容和元素的增删改查 都是围绕它展开的 transient Object[] elementData; //ArrayList的大小，size的返回值 private int size; //默认的容量大小，并不是一开始就会用这个容量去…"
published: 2024-01-03
slug: zhihu-675940036
tags:
  - "JDK"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/675940036
  published: 2024-01-03
---

> *关于List是基于Collection接口的实现类*

## **ArrayList**

```java
//这个就是存储数据的数组，扩容和元素的增删改查 都是围绕它展开的
transient Object[] elementData;
//ArrayList的大小，size的返回值
private int size;
//默认的容量大小，并不是一开始就会用这个容量去扩展数组
private static final int DEFAULT_CAPACITY = 10;
//当传入的容量是0，或者其他空集合时 持有这个数组的引用
private static final Object[] EMPTY_ELEMENTDATA = {};
//如果是默认构造的ArrayList，要持有这个空数组引用。
//扩容的时候，如果容量小于DEFAULT_CAPACITY ，会直接使用 DEFAULT_CAPACITY
private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};
//用来记录当前数组被操作的次数，操作可能是扩容，删除等
protected transient int modCount = 0;
//这个是理论最大数组大小，整形数字最大的下标减去数组对象头
private static final int MAX_ARRAY_SIZE = Integer.MAX_VALUE - 8;
```

![image](./image-01.jpg)

其实ArrayList的实现原理就是动态数组，它不是一个线程安全的容器。

首先ArrayList实现了RandomAccess，它是一个提供快速随机访问的接口、通过它可以在遍历或随机访问时速度更快，这也是为什么linkeList的访问速度达不到ArrayList的条件之一。

同理，ArrayList也是有扩容机制的，我们在add元素时，是可以出发扩容机制的

```java
//扩容方法
private void grow(int minCapacity) {
// 记录扩容前数组的长度
int oldCapacity = elementData.length;
//将原数组的长度扩大0.5倍作为扩容后新数组的长度（如果扩容前数组长度为10，那么经过扩容后的数组长度应该为15）
int newCapacity = oldCapacity + (oldCapacity >> 1);
//如果扩容后的长度小于当前数据量，那么就将当前数据量的长度作为本次扩容的长度
if (newCapacity - minCapacity < 0)
newCapacity = minCapacity;
//判断新数组长度是否大于可分配数组的最大大小
if (newCapacity - MAX_ARRAY_SIZE > 0)
//将扩容长度设置为最大可用长度
newCapacity = hugeCapacity(minCapacity);
// 拷贝，扩容，构建一个新的数组
elementData = Arrays.copyOf(elementData, newCapacity);
}
//判断如果新数组长度超过当前数组定义的最大长度时，就将扩容长度设置为Interger.MAX_VALUE,也就是int的最大长度
private static int hugeCapacity(int minCapacity) {
if (minCapacity < 0) // overflow
throw new OutOfMemoryError();
return (minCapacity > MAX_ARRAY_SIZE) ?
Integer.MAX_VALUE : MAX_ARRAY_SIZE;
}
```

## **LinkedList**

![image](./image-02.jpg)

```java
transient int size = 0; //LinkedList中存放的元素个数
transient Node first; //头节点
transient Node last; //尾节点
```

那么通过它的继承方式，我们可以看到LinkedList可以看作一个顺序容器，或者一个队列。因为它的每一个Node都持有上一个节点和下一个节点的引用。

同时，它并没有实现synchronized，那么如果我们在多线程操作下，可以考虑使用Collections.synchronizedList()进行包装。

所以，它更使用增删操作更多 而查询更少的场景。

它本身是一个链表的结构，这个跟ArrayList是不同的；

当随机访问时，明显ArrayList效率更高，当需要add remove 当然LinkedList效率更好；

## **CopyOnWriteArrayList**

下面，该是juc大杀器上场了。

![image](./image-03.jpg)

首先通过继承关系，我们可以发现 CopyOnWriteArrayList与ArrayList很相似，都实现了RandomAccess和list接口。

```java
public class CopyOnWriteArrayList<E>
implements List<E>, RandomAccess, Cloneable, java.io.Serializable {
private static final long serialVersionUID = 8673264195747942595L;

/** The lock protecting all mutators */
final transient ReentrantLock lock = new ReentrantLock();

/** The array, accessed only via getArray/setArray. */
private transient volatile Object[] array;

/**
* Gets the array.  Non-private so as to also be accessible
* from CopyOnWriteArraySet class.
*/
final Object[] getArray() {
return array;
}

/**
* Sets the array.
*/
final void setArray(Object[] a) {
array = a;
}

/**
* Creates an empty list.
*/
public CopyOnWriteArrayList() {
setArray(new Object[0]);
}
}
```

首先，内部有一个ReentrantLock锁，它的工作原理是这样的：

CopyOnWriteArrayList是线程安全的，它允许多个线程并发读取，但只有一个线程可以获取资源进行写入。

在保证并发读的情况下，保证了写入安全；

每次写入都会copy原数组，所以它本身不需要扩容；

适合多读少写场景、因为操作的同时会做数组的复制，所以内存开销会比较大；

同时，它只在写入的时候进行加锁，所以不能保证实时一致。

**要知道 其实在nacos的注册表更新，其实也是采用CopyOnWrite的思想去实现的。**
