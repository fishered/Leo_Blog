---
title: "基于docker的mysql集群搭建"
description: "docker做主从复制 Docker 可以让开发者打包他们的应用以及依赖包到一个轻量级、可移植的容器中，然后发布到任何流行的 Linux 机器上，也可以实现虚拟化。 Docker 可以让开发者打包他们的应用以及依赖包到一个轻量级、可移植的容器中，然后发布到任何流行的 …"
published: 2024-01-03
slug: zhihu-675930535
tags:
  - "MySQL"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/675930535
  published: 2024-01-03
---

### **docker做主从复制**

Docker 可以让开发者打包他们的应用以及依赖包到一个轻量级、可移植的容器中，然后发布到任何流行的 Linux 机器上，也可以实现虚拟化。

Docker 可以让开发者打包他们的应用以及依赖包到一个轻量级、可移植的容器中，然后发布到任何流行的 Linux 机器上，也可以实现虚拟化。

利用docker做宿主机和容器内部同步

![image](./image-01.jpg)

### **主从复制介绍**

mysql跟我我们设置的主从节点，将binlog对从数据库中进行推送。根据上图（网上偷的图...）可以看到mysql主节点 只需要开启binlog 对数据做binlog存储

我们的从节点 就会有两个线程 一个是通过io获取主节点binlog，一个是将binlog转化为sql

在slave节点中，它给我们提供了两个线程：分别命名为：SLAVE_IO_RUNNING和SLAVE_SQL_RUNNING

### **准备工作**

一般来说，mysql集群做读写分离，一主多从，通过binlog日志去同步数据。

仅仅模拟数据，我们准备两台虚拟机（centos或ubantu），安装docker环境：

1. 首先查看仓库中所有docker版本yum list docker-ce --showduplicates | sort -r
2. 输入命令安装（**前提是本机没有其他版本docker**）sudo yum install docker-ce
3. 等待几分钟完成之后，查询是否安装成功docker version

### **docker安装mysql**

1. 查询docker仓库中mysql的版本docker search mysql
2. 导入mysql镜像 等待完成docker pull mysql
3. 启动mysql数据库 其中123465是管理员密码，请自行定义。docker run --name mysql_demo -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 -d mysql
4. 使用命令进入docker mysql docker exec -it dockerid /bin/bash
5. 登陆mysql使用命令 mysql -uroot -p
6. 输入密码

![image](./image-02.jpg)

这时候 说明docker中的mysql 已经安装成功并且启动了

我们需要修改mysql外部映射文件

```powershell
[mysqld]
skip-name-resolve
server-id=1
log-bin=mysql-bin
binog-do-db=test_db
binlog-ignore-db=mysql
```

这里设置了 skip-name ： 连接数据禁用dns 只用ip

server-id ： id不重复节点

bin-log ： 开启binlog日志

指定主从复制库，忽略哪些库

接着我们需要设置从机的复制权限

```powershell
CREATE USER　'slave'@'%' IDENTIFIED BY '123456';
grant replication slave,replication client on *.* to slave@'192.168.xx.xx' identified by "password" ;
flush privileges;
//master_host 主机
master-log-file master-log-pos在查看状态中获取 retry是重试次数

change master to master_host='192.168.1.1',master_user='slave',master_password='123456',master_port='5555',master-log-file='mysql-bin.000002' ,master-log-pos=154,master_connect_retry=30;
```

启动后 可以查看主从复制状态：

```powershell
show master status

show slave status \G；
```

前面说过 从节点其实是有两个线程我们需要启动他们

```text
start slave
```

这时，我们就可以给主节点修改数据、从节点数据也会同样更新

### **思考**

主从复制会执行io，如果批量操作crud会导致数据不一致的方式，这种方式该如何处理：

1. zookeeper、redis做分布式锁
2. 使用数据库中间件进行解耦，如：mycat

多节点集群mysql时，我们怎么批量部署mysql集群并管理：

如：springboot中我们可以支持动态数据源、and.....
