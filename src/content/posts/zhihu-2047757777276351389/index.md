---
title: "Agent的概念原理与构建模式"
description: "Agent 的概念、原理与构建模式什么是 AI Agent？在 2025-2026 年，AI Agent（智能体）已经成为大语言模型应用的核心范式。简单来说，Agent 是一个能够 自主感知环境、做出推理、采取行动、并根据反馈持续调整的 AI 系统。它与传统 Chatbot 的根本区别在于：…"
published: 2026-06-09
slug: zhihu-2047757777276351389
tags:
  - "AI & Agent"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/2047757777276351389
  published: 2026-06-09
---

## Agent 的概念、原理与构建模式

### 什么是 AI Agent？

在 2025-2026 年，AI Agent（智能体）已经成为大语言模型应用的核心范式。简单来说，Agent 是一个能够**自主感知环境、做出推理、采取行动、并根据反馈持续调整**的 AI 系统。它与传统 Chatbot 的根本区别在于：Agent 不只是回答问题，它能够**主动使用工具、执行多步骤任务、并在失败时自我纠正**。

如果说大语言模型（LLM）是”大脑”，那么 Agent 就是这个大脑配上了”手脚”——它能够读写文件、运行终端命令、搜索网页、调用 API，把模型的推理能力转化为实际的行动力。

---

### 核心原理：ReAct 范式

Agent 运作的哲学基础来自一篇重要的学术论文 **《ReAct: Synergizing Reasoning and Acting in Language Models》**（Yao et al.）。

这篇论文指出了一个关键问题：在此之前，LLM 的**推理能力**（如 Chain-of-Thought 链式思维）和**行动能力**（如生成行动计划）被当作两个独立的话题来研究。推理只在”大脑”中发生，行动只在”外部”发生，两者之间缺乏协同。

ReAct 的核心贡献是：**将推理（Reasoning）和行动（Acting）以交错循环的方式融合在一起**。具体来说：

- **Reasoning（推理）**帮助模型归纳、追踪和更新行动计划，并处理异常情况
- **Acting（行动）**让模型能够与外部资源（知识库、代码环境、网页等）交互，获取额外信息

两者的协同带来了显著优势：在问答任务（HotpotQA）和事实验证（Fever）中，ReAct 通过与 Wikipedia API 交互，有效克服了纯 Chain-of-Thought 推理中的幻觉和错误传播问题；在交互式决策基准（ALFWorld）上，ReAct 也大幅超越现有方法。

---

### Agent 的工作循环

一个典型的 Agent 按照以下循环运作：

```text
Task（任务）
↓
Thought（思考）：分析当前状态，决定下一步
↓
Action（行动）：调用工具执行操作
↓
Observation（观察）：接收工具返回的结果
↓
（循环上述，直到可以给出最终答案）
↓
Final Answer（最终回答）
```

这个循环看似简单，但它赋予了 Agent 极强的适应性。如果一次行动没有得到预期结果，Agent 可以在下一轮思考中调整策略——本质上，这是在用**运行时推理换取鲁棒性**。

### 以问答任务为例

```text
Task: 帝国大厦有多高？

Thought: 我需要查询帝国大厦的高度信息。
Action: get_height("帝国大厦")
Observation: 帝国大厦屋顶高度 381 米，天线尖端 443 米

Thought: 已获得高度数据，可以回答用户了。
Final Answer: 帝国大厦屋顶高度 381 米，含天线尖端总高 443 米。
```

### 以烹饪任务为例

```text
Task: 我需要做一道番茄炒蛋

Thought: 先找番茄炒蛋的菜谱。
Action: find_recipe(dish="番茄炒蛋")
Observation: 需要：鸡蛋 3 个、番茄 2 个、盐、糖、油、葱花

Thought: 需要先检查冰箱里有没有这些材料。
Action: check_fridge(item="鸡蛋")
Observation: 冰箱里有鸡蛋

Thought: 材料已确认，可以开始烹饪了。
Final Answer: 番茄炒蛋的材料已备齐：鸡蛋有库存，需要确认番茄…
```

---

### Agent 的工具系统

Agent 的能力边界由它可用的工具决定。从视频演示中可以看到，典型的 Agent 工具集包括：

- **read_file(file_path)**：读取指定文件内容
- **write_to_file(filename, content)**：创建或覆盖文件
- **run_terminal_command(command)**：在终端执行命令

这些工具通过 **XML 格式**在系统提示（System Prompt）中定义，Agent 则以结构化的 XML 标记发出具体的工具调用。例如：

```text
<action>write_to_file("test.txt", "a\nb\nc")</action>
```

在格式约定上，通常要求 `\n` 用于换行，确保工具调用的参数正确传递。

---

### 三类 Agent 构建模式

视频通过三个实际案例展示了当前主流的 Agent 构建模式：

### 1. 通用 Agent 平台：Manus

Manus 是一个通用型 AI Agent，能够自主完成复杂的多步骤研究任务。视频展示了它执行”iPhone 15 Pro Max vs Galaxy S24 Ultra vs Pixel 8 Pro 对比报告”任务的完整过程：

- 自主搜索三款手机的规格参数和性能数据
- 收集视觉素材和参考图片
- 生成综合性对比网站
- 输出结构化报告（含执行摘要、详细对比表格等）

Manus 的特点是**高度自主**——用户只需给出任务描述，Agent 自行规划、搜索、整理、输出，中间无需人工干预。

### 2. 代码 Agent：Claude

Claude 作为代码 Agent，演示了用 HTML/CSS/JavaScript 构建贪吃蛇游戏的过程：

- 收到任务：”写一个贪吃蛇游戏，使用 HTML、CSS 和 JS”
- 规划文件结构：index.html、style.css、script.js
- 逐一创建文件并写入代码
- 最终交付可运行的游戏

Claude 的模式展示了 Agent 在**受控环境**下执行确定性编码任务的能力——每一步都有清晰的输入输出，错误可以被及时发现和修正。

### 3. 开放指令 Agent：DeepSeek

DeepSeek 的演示更侧重于**遵循极其详细的系统指令**。视频中展示了其 Agent 模式的提示结构：

- 严格定义了 `<thought>`、`<action>`、`<observation>`、`<final_answer>` 的 XML 标记
- 指定了操作系统环境（macOS 15.5）和工作目录
- 提供了工具定义和调用格式的完整说明
- 同样执行了贪吃蛇游戏的构建任务

DeepSeek 的案例说明，通过**精确的提示工程**，即使是通用对话模型也可以被塑造成遵循特定 Agent 协议的智能体。

### Agent 构建的关键设计决策

综合以上案例，构建一个有效的 Agent 涉及以下关键决策：

**1. 提示结构的设计。** Agent 的系统提示需要精确描述其角色、可用工具、输出格式和推理步骤。XML 标记虽看似繁琐，但它为模型的输出提供了结构化的”语法”，降低了解析失败的概率。

**2. 工具接口的粒度。** 工具应该足够原子化（如 `read_file`、`write_to_file`），让 Agent 可以灵活组合，而不是提供过于宏大但僵硬的”全能”函数。

**3. 观察反馈的质量。** 工具返回的 Observation 是 Agent 调整下一步策略的唯一依据。如果返回信息过于简略或含混，Agent 的推理链条就会断裂。

**4. 终止条件的设定。** Agent 需要明确的停止信号（`<final_answer>`），否则可能陷入无尽的”思考-行动”循环。在实践中，通常还会设置最大步数限制作为兜底。

**5. 错误处理与恢复。** ReAct 范式的核心优势就是能处理异常——当工具调用失败或返回意外结果时，Agent 可以在下一轮 `thought` 中重新评估情况并尝试替代方案。

### 总结

AI Agent 代表了从”语言模型”到”行动模型”的关键跨越。ReAct 范式通过将推理和行动交织在一起，让 LLM 不再是一个只能”说”的系统，而成为一个能够”做”的智能体。

从 Manus 的自主研究、到 Claude 的代码生成、再到 DeepSeek 的精确指令执行，我们可以看到 Agent 的三种不同实现路径——但它们都共享同一个核心理念：**思考指导行动，行动反馈思考**。

随着工具生态的丰富和模型推理能力的增强，Agent 正在从实验性原型走向生产级应用。理解 ReAct 范式，掌握 Agent 的构建模式，将成为 AI 时代工程师的核心素养。

---

*本文基于视频《Agent 的概念、原理与构建模式》整理而成，涵盖了 Agent 的定义、ReAct 论文核心思想、Agent 工作循环、工具系统设计以及三类主流构建模式的对比分析。*
