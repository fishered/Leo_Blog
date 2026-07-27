---
title: "为什么要放弃LangChain"
description: "为什么要放弃 LangChain？—— 当抽象比好处更伤人一个 12 个月的教训2023 年初，我们把 LangChain 投入了生产环境。2024 年，我们把它全部移除了。 LangChain 在 2023 年看起来是构建 LLM 应用的最佳选择——它有一个令人印象深刻的组件和工具清单，人气飙…"
published: 2026-06-09
slug: zhihu-2047758537632256246
tags:
  - "AI & Agent"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/2047758537632256246
  published: 2026-06-09
---

## 为什么要放弃 LangChain？—— 当抽象比好处更伤人

### 一个 12 个月的教训

2023 年初，我们把 LangChain 投入了生产环境。2024 年，我们把它全部移除了。

LangChain 在 2023 年看起来是构建 LLM 应用的最佳选择——它有一个令人印象深刻的组件和工具清单，人气飙升，它承诺”让开发者在一下午之内从想法变成可运行代码”。但随着项目推进，问题开始浮现。

LangChain 的**不灵活性**逐渐暴露：我们不得不频繁深入 LangChain 的内部实现去修改底层行为。而 LangChain 刻意设计的抽象层，让这件事变得极其痛苦。每当我们需要做一些框架不支持的事情时，就不得不把我们的需求”翻译”成 LangChain 能理解的方式——而不是直接写代码。

本文分享我们放弃 LangChain 的真实原因，以及为什么用模块化的构件替换它那僵化的高层抽象后，我们的代码库变得更简洁，团队也更快乐、更高效。

---

### 核心问题：早期框架的困境

LLM 是一个快速变化的领域，每周都有新概念和新想法出现。在这样的环境下构建框架，要设计出经得起时间考验的抽象，极其困难。

**设计良好的抽象本身就很难**——即使需求是充分理解且稳定的。但当你要建模的组件处于如此快速的变化中，还没等你设计好抽象，底层的技术已经变了。

这不是 LangChain 开发者的错。换作任何人，在那个时间点尝试构建这样的框架，也不会做得更好。大家都是尽其所能。

---

### 问题 1：简单任务被复杂化

以最简单的翻译任务为例。用原生 OpenAI SDK：

```text
import os
from openai import OpenAI

os.environ["OPENAI_API_KEY"] = "<your_api_key>"

client = OpenAI()
text = "hello!"
language = "Italian"

messages = [
{"role": "system", "content": "You are an expert translator"},
{"role": "user", "content": f"Translate the following from English into {language}"},
{"role": "user", "content": f"{text}"},
]

response = client.chat.completions.create(model="gpt-4o", messages=messages)
```

干净、直接、没有隐藏逻辑。任何 Python 开发者一眼就能看懂。

同样的任务用 LangChain：

```text
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

model = ChatOpenAI(model="gpt-4o-turbo", temperature=0)
prompt = ChatPromptTemplate.from_messages([
("system", "You are an expert translator"),
("user", "Translate the following from English into {language}"),
("user", "{text}")
])

parser = StrOutputParser()
chain = prompt | model | parser
result = chain.invoke({"language": language, "text": text})
```

你需要先理解 `ChatPromptTemplate`、`StrOutputParser`、管道操作符 `|`、`invoke` 方法——这些都是 LangChain 特有的概念，它们不会让你的代码更好，只是让你的代码更 LangChain。

问题不在于多写了几行代码，而在于**每引入一个抽象就增加一层认知负担和调试难度**。当出错的时候，你调试的不是你的业务逻辑，而是 LangChain 的框架代码。

---

### 问题 2：`http.client` 与 `requests` 的类比

想象一下——你有一个选择：

**选择 A**：用 `http.client` 发请求

```text
import http.client, json

conn = http.client.HTTPSConnection("api.example.com")
conn.request("GET", "/data")
response = conn.getresponse()
data = json.loads(response.read().decode())
conn.close()
```

**选择 B**：用 `requests` 发请求

```text
import requests

response = requests.get("https://api.example.com/data")
data = response.json()
```

哪个更好？显然是 B。`requests` 不是”抽象过多”，它是**恰当的抽象**——把真正的复杂性（连接管理、编码处理）封装起来，但不隐藏你真正需要关心的东西（URL、响应数据）。

LangChain 的问题在于，它经常既不是 A 也不是 B。它既没有简化真正困难的部分（比如复杂的 Agent 编排），又把简单的部分复杂化了。

一位 Reddit 用户的评价一针见血：

> “代码质量不高，结构很抓狂。真的很讨厌那个管道语法的结构。文档严重过时，deprecation 警告实施得很差。当你需要深入底层修复某些东西时，你会看到丑陋的内部。但它确实能干活。我能看出他们想做什么，但膨胀得太快了，可能是因为它太火了。”

---

### 问题 3：Agent 成了黑箱

当我们需要从单个顺序 Agent 架构迁移到更复杂的架构时，LangChain 成了最大的障碍。

我们需要外部观察 Agent 的状态、动态控制可用工具、灵活地编排多个 Agent 之间的交互。但 LangChain 的 Agent 抽象把这些都封装在了不可见的内部——它没有提供外部观察 Agent 状态的方法，导致我们不得不”缩小”我们的实现范围，去适配 LangChain Agent 有限的功能。

在一个例子中，我们需要根据业务逻辑**动态改变 Agent 可用的工具集**。这在原生代码里只是一个 `if` 判断和一个列表的 `append`/`remove`。但在 LangChain 中，你需要在框架规定的初始化流程中提前声明工具，动态修改需要绕过层层封装。

**一旦我们移除了 LangChain，我们不再需要把需求”翻译”成 LangChain 能接受的形式——我们只需要直接写代码。**

---

### LangChain 的架构图说明了什么

LangChain 官方的架构图展示了它的野心：

```text
LLMs and Prompts
|
CHAINS
|
LANGCHAIN
/          \
MEMORY              DOCUMENT LOADERS
(Vector DBs)            AND UTILS
```

问题是：**每个模块都在不断变化**。LLM 接口在变、Prompt 最佳实践在变、Chain 的编排方式在变、Memory 的实现方式在变。当你的框架试图一次性抽象所有这些快速变化的组件时，唯一稳定的东西就是不稳定性本身。

---

### 你真的需要一个 AI 框架吗？

LangChain 长长的组件清单给人一个错觉：**构建 LLM 应用是复杂的，你需要一个框架**。但实际情况是：

1. **LLM 调用**：OpenAI / Anthropic 的 SDK 已经足够简洁
2. **Prompt 管理**：用 Python 的 f-string 或 Jinja2 模板即可
3. **Chain/编排**：纯 Python 函数和循环，可读性远超任何 DSL
4. **Memory**：一个字典或数据库表，由你完全控制
5. **Vector Store**：Chroma、Pinecone 等都有简洁的原生 API
6. **Document Loader**：PDF、网页解析都有成熟独立的库

LangChain 在这些之上加了一层框架抽象——但这层抽象的价值，在大多数场景下，远远低于它引入的复杂性。

---

### 我们的替代方案：模块化构件

放弃 LangChain 后，我们的技术栈变成了：

- **OpenAI / Anthropic SDK** —— LLM 调用
- **Chroma / Qdrant** —— 向量存储（直接用原生 API）
- **自建的简洁编排逻辑** —— Python 函数 + 类型注解
- **标准的 Python 日志和监控** —— 不需要框架特有的回调系统

核心原则是：**每个组件都可替换，每个抽象都是你自己的，没有黑箱**。

这种方式可能比 LangChain 多写几十行样板代码，但换来的是：

- 完全可控的执行流程
- 零框架调试开销
- 团队成员不需要学习另一个 DSL
- 不会被框架的版本升级绑架

---

### 什么时候应该用 LangChain？

公平地说，LangChain 在以下场景仍然有价值：

- **快速原型**：想在 30 分钟内搭出一个 RAG 系统的 Demo
- **教学/学习**：通过它的结构化方式理解 RAG 等概念
- **标准化的简单流程**：你的需求恰好完美匹配它的 Chain 模式

但如果你在构建**生产级系统**，LangChain 大概率会成为技术债，而不是加速器。

---

### 总结

LangChain 做了一件很多人不敢做的事：在 LLM 生态最混乱的时期，尝试提供一个统一的框架。这个勇气值得尊敬。

但 2025-2026 年的实践表明：**对于生产级 AI Agent 系统，简单直接的代码比复杂的框架抽象更好**。LLM 本身已经足够复杂了，你不需要一个框架再增加一层复杂度。

放弃 LangChain 后，我们团队最大的感受不是”功能少了”，而是”终于自由了”——我们可以用最直接的方式写我们想写的代码，而不是想办法让框架允许我们写。

如果你正在开始一个新的 LLM 项目，建议先不用任何框架，用原生 SDK 写几周代码，然后再判断你是否真的需要那些抽象。答案很可能是不需要。

---

*本文基于视频《为什么要放弃 LangChain》整理而成，引用了团队在生产环境中使用 LangChain 12 个月后移除它的真实经历，分析了框架抽象的代价以及模块化构件替代方案的优势。*
