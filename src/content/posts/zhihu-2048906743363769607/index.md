---
title: "LangChain核心组件全解析"
description: "LangChain 核心组件全景解析：从零到一构建 LLM 应用作者注：本文基于 LangChain 系列教程（共 9 集，总时长约 5 小时）系统整理而成。逐帧分析了视频中的幻灯片、代码演示和架构图示，并结合 LangChain 最新 API 进行了校验和适配。适合有 Python 基础的开…"
published: 2026-06-12
slug: zhihu-2048906743363769607
tags:
  - "AI & Agent"
draft: false
featured: false
source:
  platform: 知乎
  url: https://zhuanlan.zhihu.com/p/2048906743363769607
  published: 2026-06-12
---

## LangChain 核心组件全景解析：从零到一构建 LLM 应用

> **作者注**：本文基于 LangChain 系列教程（共 9 集，总时长约 5 小时）系统整理而成。逐帧分析了视频中的幻灯片、代码演示和架构图示，并结合 LangChain 最新 API 进行了校验和适配。适合有 Python 基础的开发者系统学习。

---

### 目录

1. [开篇：为什么要学 LangChain](https://zhuanlan.zhihu.com/write#1-%E5%BC%80%E7%AF%87%E4%B8%BA%E4%BB%80%E4%B9%88%E8%A6%81%E5%AD%A6-langchain)
2. [第一集：LangChain 入门与 LLM 生态概览](https://zhuanlan.zhihu.com/write#2-%E7%AC%AC%E4%B8%80%E9%9B%86langchain-%E5%85%A5%E9%97%A8%E4%B8%8E-llm-%E7%94%9F%E6%80%81%E6%A6%82%E8%A7%88)
3. [第二集：Hello World 与 ConversationChain](https://zhuanlan.zhihu.com/write#3-%E7%AC%AC%E4%BA%8C%E9%9B%86hello-world-%E4%B8%8E-conversationchain)
4. [第三集：Model I/O —— Prompt 工程化](https://zhuanlan.zhihu.com/write#4-%E7%AC%AC%E4%B8%89%E9%9B%86model-io--prompt-%E5%B7%A5%E7%A8%8B%E5%8C%96)
5. [第四集：Data Connection —— 让 LLM 读懂你的数据](https://zhuanlan.zhihu.com/write#5-%E7%AC%AC%E5%9B%9B%E9%9B%86data-connection--%E8%AE%A9-llm-%E8%AF%BB%E6%87%82%E4%BD%A0%E7%9A%84%E6%95%B0%E6%8D%AE)
6. [第五集：Chains —— 编排的艺术](https://zhuanlan.zhihu.com/write#6-%E7%AC%AC%E4%BA%94%E9%9B%86chains--%E7%BC%96%E6%8E%92%E7%9A%84%E8%89%BA%E6%9C%AF)
7. [第六集：Agents —— 会思考的 LLM](https://zhuanlan.zhihu.com/write#7-%E7%AC%AC%E5%85%AD%E9%9B%86agents--%E4%BC%9A%E6%80%9D%E8%80%83%E7%9A%84-llm)
8. [第七集：实战 PDF 问答系统](https://zhuanlan.zhihu.com/write#8-%E7%AC%AC%E4%B8%83%E9%9B%86%E5%AE%9E%E6%88%98-pdf-%E9%97%AE%E7%AD%94%E7%B3%BB%E7%BB%9F)
9. [第八集：实战 搜索 Agent 进阶](https://zhuanlan.zhihu.com/write#9-%E7%AC%AC%E5%85%AB%E9%9B%86%E5%AE%9E%E6%88%98-%E6%90%9C%E7%B4%A2-agent-%E8%BF%9B%E9%98%B6)
10. [第九集：回顾总结与最佳实践](https://zhuanlan.zhihu.com/write#10-%E7%AC%AC%E4%B9%9D%E9%9B%86%E5%9B%9E%E9%A1%BE%E6%80%BB%E7%BB%93%E4%B8%8E%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5)
11. [附录：API 迁移指南与常见问题](https://zhuanlan.zhihu.com/write#11-%E9%99%84%E5%BD%95api-%E8%BF%81%E7%A7%BB%E6%8C%87%E5%8D%97%E4%B8%8E%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)

---

### 1. 开篇：为什么要学 LangChain

### 1.1 背景：LLM 时代的挑战

2022 年 11 月，OpenAI 发布了 GPT-3.5 API（text-davinci-003），开发者的世界从此改变。紧接着，GPT-4 以 MoE（Mixture of Experts）架构横空出世，Meta 开源了 LLaMA 系列，智谱推出了 ChatGLM。大模型不再只是论文里的概念，而是真正可以调用的 API。

但直接调用 API 做应用开发，会立刻撞上四面墙：

第一面墙：**上下文有限**。GPT-3.5 的 token 上限是 4096，一份 20 页的 PDF 根本塞不进去。

第二面墙：**能力受限**。LLM 不能搜索网页、不能执行代码、不能读取本地文件——它只是”一本百科全书”，而不是”一个能干活的助手”。

第三面墙：**没有记忆**。每次 API 调用都是崭新的对话，你问”我之前叫什么”它永远回答不上来。

第四面墙：**Prompt 管理混乱**。项目里散落着上百行硬编码的 prompt 字符串，改一个字要搜遍整个代码仓库。

LangChain 就是为了推倒这四面墙而生的。

### 1.2 LangChain 是什么

LangChain 不是一个新的 LLM，而是一个 **LLM 应用编排框架**。它的核心理念可以用一句话概括：

> 把 LLM 调用从”手工作坊”升级成”流水线工厂”。

```text
User Input → [Prompt Template] → [LLM Call] → [Output Parser] → Result
↑                ↑
[Memory]        [Tools / APIs]
```

LangChain 的六层架构：

| 层级 | 模块 | 解决的问题 |
| --- | --- | --- |
| L1 | Model I/O | 如何统一调用不同厂商的 LLM |
| L2 | Data Connection | 如何让 LLM 读取外部文档 |
| L3 | Chains | 如何串联多个 LLM 调用 |
| L4 | Memory | 如何让 LLM 记住对话 |
| L5 | Agents | 如何让 LLM 自主使用工具 |
| L6 | Callbacks | 如何监控和调试 LLM 调用链 |

### 1.3 主流 LLM 生态速览

截至教程录制时（约 2024 年初），主流选择：

| 模型 | 厂商 | 架构特点 | 适用场景 |
| --- | --- | --- | --- |
| GPT-4 | OpenAI | MoE 混合专家，8×220B 参数 | 最复杂推理，成本高 |
| GPT-3.5 | OpenAI | 175B Dense | 性价比首选 |
| LLaMA 2 | Meta | 7B/13B/70B 开源 | 本地部署、垂直微调 |
| ChatGLM | 智谱 AI | 中英双语优化 | 中文场景 |

**关于 MoE（Mixture of Experts）**：GPT-4 不是一个大模型，而是多个”专家”子模型的组合。每次推理时，只有部分专家被激活，所以速度快但总参数量巨大。你可以理解为：一个问题来了，系统自动把它派给最擅长这个领域的那几个”专家”回答。

---

### 2. 第一集：LangChain 入门与 LLM 生态概览

> **视频源**：1.mp4（约 30 分钟）—— 介绍 LangChain 的背景、LLM 生态，以及框架的核心理念

### 2.1 本集要点

这一集不涉及代码，而是建立认知框架。讲解者抛出三个核心问题：

1. **什么是 LLM / 大语言模型？** —— 从 GPT 系列的发展讲起，GPT-3 是 2020 年 6 月 11 日发布的，直到 2022 年 11 月 OpenAI 开放 API 后，普通开发者才真正用上。
2. **什么是 LangChain？** —— 一个 Python 框架，让开发者用”搭积木”的方式组合 LLM 调用。
3. **为什么要用 LangChain？** —— 直接调 API 能做 demo，但做产品需要工程化。

### 2.2 直接调 API 的局限

```text
// 原生 GPT API 调用
const response = await createCompletion({
model: "text-davinci-003",
prompt: "你是谁？",
temperature: 0.8,
max_tokens: 100,
});
```

这种代码看起来简单，但做不了产品级应用。原因：

- 没有 prompt 管理：每次拼接字符串，容易出错
- 没有上下文注入：业务数据无法喂给 LLM
- 没有结果处理：LLM 返回的裸文本需要自己解析
- 没有错误处理：API 异常、限流、超时都需要自己写
- 没有可观测性：调用链埋点、日志、调试全要手写

### 2.3 LangChain 的解法

LangChain 官网的一句话概括得很好：

> LangChain is a framework for developing applications powered by language models.

它在 LLM 之上构建了标准化的抽象层，让你只关心”业务逻辑”，不用管底层细节。

---

### 3. 第二集：Hello World 与 ConversationChain

> **视频源**：2.mp4（约 48 分钟）—— 第一个 LangChain 程序，从安装到带记忆的对话

### 3.1 环境搭建

```text
pip install langchain langchain-openai langchain-community python-dotenv
```

创建 `.env` 文件：

```text
DEEPSEEK_API_KEY=sk-your-key-here
OPENAI_API_KEY=sk-your-backup-key-here
```

### 3.2 第一个调用

```text
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

load_dotenv()

# DeepSeek 兼容 OpenAI SDK，零成本切换
llm = ChatOpenAI(
model="deepseek-chat",
temperature=0.7,
api_key=os.getenv("DEEPSEEK_API_KEY"),
base_url="https://api.deepseek.com/v1"
)

result = llm.invoke([HumanMessage(content="你好，请用一句话介绍 LangChain")])
print(result.content)
```

关键点：`base_url` 参数让你可以对接任何兼容 OpenAI API 的服务（DeepSeek、通义千问、本地 Ollama 等），实现模型层的”热插拔”。

### 3.3 Temperature 参数：控制创造力的旋钮

```text
temperature = 0.0  →  确定模式：数学计算、代码生成、事实问答
temperature = 0.7  →  平衡模式：日常对话、内容总结
temperature = 1.0  →  创造模式：创意写作、头脑风暴
```

底层原理：LLM 本质是在做”下一个 token 的概率预测”。temperature 越低，模型越倾向于选最高概率的 token；temperature 越高，低概率 token 被选中的机会越大，输出更”天马行空”。

### 3.4 Jupyter Notebook 交互式开发

视频中演示了在 Jupyter Notebook 中进行 LangChain 开发的全流程。Notebook 的 Cell 机制非常适合 LLM 开发——你可以逐步构建 prompt、观察输出、调整参数，而不需要每次重新运行整个脚本。

### 3.5 ConversationChain：有记忆的对话

```text
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

conversation = ConversationChain(
llm=llm,
memory=ConversationBufferMemory(),
verbose=True  # 打印完整对话记录
)

response1 = conversation.predict(input="我叫小明，今年 25 岁")
# > Entering new ConversationChain chain...
# > Human: 我叫小明，今年 25 岁
# > AI: 你好小明！...

response2 = conversation.predict(input="我叫什么名字？多大？")
# > Human: 我叫什么名字？多大？
# > AI: 你叫小明，今年 25 岁。
```

**verbose=True 的作用**：开启后会打印完整的 Chain 执行日志，包括输入的 prompt、LLM 的输出、以及中间步骤。调试 Chaining 问题时极其有用。

### 3.6 技术要点总结：Prompt 向 LLM 传递信息的方式

视频中有一个非常好的技术总结，将 Prompt 与 LLM 的交互归纳为以下机制：

- **System Message（系统消息）**：设定 AI 的行为边界和角色，如”你是一个专业的 Python 开发者”
- **Human Message（用户消息）**：用户的直接输入
- **AI Message（AI 回复）**：LLM 的返回结果——更重要的是，在多轮对话中，AI 的回复会被作为历史消息附加到后续请求的上下文中

**Temperature 配合不同的交互模式**：高 temperature 配合创意类任务，低 temperature 配合事实类、逻辑类任务。

---

### 4. 第三集：Model I/O —— Prompt 工程化

> **视频源**：3.mp4（约 31 分钟）—— Prompt 模板、Few-Shot、Example Selector

### 4.1 为什么需要 Prompt 模板？

直接拼接 prompt 是 LLM 开发中最常见的反模式：

```text
# ❌ 反模式：硬编码字符串拼接
prompt = "请将以下文本翻译成英文：" + text
```

问题显而易见：维护困难、复用不了、参数多了容易出错。Prompt Template 将 prompt 参数化，把”模板”和”数据”解耦。

### 4.2 PromptTemplate 基础用法

```text
from langchain_core.prompts import PromptTemplate

# 定义模板
template = PromptTemplate.from_template(
"你是一个{role}。请将以下文本翻译成{target_lang}：\n"
"{text}"
)

# 填充参数
prompt_str = template.format(
role="专业翻译",
target_lang="英文",
text="人工智能正在重塑每个行业"
)
```

**视频演示的关键设计模式**：在 template 中通过函数调用动态注入数据：

```text
def get_completion(prompt):
"""封装 LLM 调用，统一处理异常"""
try:
return llm.invoke(prompt)
except Exception as e:
return f"调用失败: {e}"
```

### 4.3 Few-Shot Prompting：用示例教会 LLM

当你需要 LLM 输出特定格式时，与其写长篇大论的说明书，不如直接给几个”标准答案”：

```text
from langchain_core.prompts import FewShotPromptTemplate, PromptTemplate

examples = [
{"input": "今天天气真好", "output": "正向"},
{"input": "我太难了",     "output": "负向"},
{"input": "随便吧",       "output": "中性"},
]

example_prompt = PromptTemplate.from_template(
"输入: {input}\n情感: {output}"
)

few_shot = FewShotPromptTemplate(
examples=examples,
example_prompt=example_prompt,
prefix="分析以下文本的情感倾向，只输出'正向'、'负向'或'中性'：",
suffix="输入: {input}\n情感:",
input_variables=["input"],
)
```

**Few-Shot vs 微调（Fine-tuning）的本质区别**：

| 维度 | Few-Shot | Fine-tuning |
| --- | --- | --- |
| 成本 | 零训练成本，Token 消耗 | 需要训练数据和 GPU |
| 灵活性 | 随时改示例，立即生效 | 修改需要重新训练 |
| 效果 | 适合格式控制 | 适合领域知识注入 |
| 持久性 | 每次推理消耗 token | 训练后模型自带能力 |

视频中的建议：**先用 Few-Shot 验证需求，确实需要再考虑 Fine-tuning**。

### 4.4 Example Selector：示例太多怎么办？

当你积累了数百个高质量示例，全部塞进 prompt 会超出 token 限制。ExampleSelector 自动帮你挑最相关的几个：

```text
from langchain_core.example_selectors import (
SemanticSimilarityExampleSelector
)
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

example_selector = SemanticSimilarityExampleSelector.from_examples(
examples=all_examples,      # 上百条示例
embeddings=OpenAIEmbeddings(),
vectorstore_cls=Chroma,
k=3,                        # 每次取最相关的 3 个
)
```

工作原理：

1. 将所有示例的 input 转换为向量
2. 用户输入也转换为向量
3. 计算余弦相似度，选取 Top-K 最接近的示例
4. 将选中的示例注入 Few-Shot Prompt

### 4.5 其他输出解析器

- **CommaSeparatedListOutputParser**：要求 LLM 以逗号分隔列表输出
- **StructuredOutputParser**：要求 LLM 按 JSON Schema 输出
- **PydanticOutputParser**：直接解析为 Pydantic 模型对象

---

### 5. 第四集：Data Connection —— 让 LLM 读懂你的数据

> **视频源**：4.mp4（约 35 分钟）—— Document Loader、Text Splitter、Embedding、Vector Store

这是 LangChain 最重要的模块，也是 RAG（Retrieval-Augmented Generation）的基础设施。

### 5.1 数据连接层全景

LangChain 的数据连接层解决一个核心问题：**LLM 的训练数据截止到某个时间点，且不包含你的私有数据。如何让 LLM 回答关于你私有文档的问题？**

答案就是 RAG 四步走：

```text
Step 1: Load    → 从各种来源加载文档
Step 2: Split   → 将长文档切分为小块
Step 3: Embed   → 将文本块转为向量
Step 4: Store   → 存入向量数据库，支持语义搜索
```

### 5.2 Document Loaders：万事皆可 Load

LangChain 内置了上百种 Document Loader：

```text
from langchain_community.document_loaders import (
PyPDFLoader,           # PDF 文档
WebBaseLoader,         # 网页 URL
YoutubeLoader,         # YouTube 视频字幕
UnstructuredPowerPointLoader,  # PowerPoint 演示文稿
UnstructuredWordDocumentLoader, # Word 文档
UnstructuredHTMLLoader, # HTML 页面
CSVLoader,             # CSV 数据文件
TextLoader,            # 纯文本
JSONLoader,            # JSON 文件
UnstructuredMarkdownLoader,  # Markdown 文档
UnstructuredEmailLoader,     # 邮件
)

# PDF 示例
loader = PyPDFLoader("annual_report_2023.pdf")
pages = loader.load()
# pages[0].page_content  → 第一页文字内容
# pages[0].metadata      → {"source": "...", "page": 1}

# 网页示例
loader = WebBaseLoader("https://python.langchain.com")
docs = loader.load()

# YouTube 示例
loader = YoutubeLoader.from_youtube_url(
"https://www.youtube.com/watch?v=xxx",
add_video_info=True
)
docs = loader.load()  # 自动提取字幕
```

**视频中特别强调**：每个 Loader 返回的 `Document` 对象包含两个字段：

- `page_content`：文档正文
- `metadata`：元数据（来源路径、页码、作者等），这对后续检索至关重要

### 5.3 Text Splitters：切得聪明，不切断语义

最常见的错误：按固定字符数硬切，把一句话拦腰截断。正确的做法是”有重叠的递归切分”：

```text
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
chunk_size=500,        # 每块 500 字符
chunk_overlap=50,      # 相邻块重叠 50 字符
separators=["\n\n", "\n", "。", "，", " ", ""]
# 递归尝试分隔符：段落→换行→句号→逗号→空格→字符
)
splits = text_splitter.split_documents(pages)
```

**为什么需要 overlap？** 假设一句话跨了两个 chunk 的边界：

```text
Chunk A: "...LangChain 的核心组件包括"  ← 不完整
Chunk B: "Model I/O, Chains, Memory..." ← 缺少主语
```

有了 50 字符的 overlap，Chunk A 和 Chunk B 都包含完整的过渡段落，语义不丢失。

**视频中演示了多种 splitter 类型**：

| Splitter | 特点 | 场景 |
| --- | --- | --- |
| RecursiveCharacterTextSplitter | 通用，按分隔符递归切 | 默认首选 |
| CharacterTextSplitter | 按固定字符切 | 简单文本 |
| TokenTextSplitter | 按 token 数切 | 需要精确控制 token 用量 |
| MarkdownHeaderTextSplitter | 按 Markdown 标题层级切 | 技术文档 |
| PythonCodeTextSplitter | 按函数/类边界切 | 代码库 |

### 5.4 Word Embedding：文字的”身份证”

LLM 不理解文字，只理解数字。Embedding 就是把文字映射为一串数字（向量）。关键性质：**语义相近的文字，向量也相近**。

```text
# 概念示意
"猫"   → [0.12, -0.34,  0.56,  0.78, -0.21, ...]  # 768维
"狗"   → [0.14, -0.31,  0.58,  0.75, -0.19, ...]  # 离"猫"很近
"汽车" → [-0.78, 0.45, -0.12, -0.33,  0.91, ...]  # 离"猫"很远
```

相似度通常用**余弦相似度**（Cosine Similarity）衡量，公式：

```text
cos(θ) = (A · B) / (|A| × |B|)
```

值域 [-1, 1]，1 表示完全相同方向，0 表示正交（无关），-1 表示完全相反。

```text
from langchain_openai import OpenAIEmbeddings

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 单条文本
vec = embeddings.embed_query("什么是 RAG？")
# vec 是一个 1536 维的 float 列表

# 批量（省钱省时间）
docs = ["文档1", "文档2", "文档3"]
vecs = embeddings.embed_documents(docs)
```

**视频中强调的 Embedding 模型选择**：

| 模型 | 维度 | 适用 |
| --- | --- | --- |
| text-embedding-3-small | 1536 | 性价比最优 |
| text-embedding-3-large | 3072 | 精度要求高 |
| text-embedding-ada-002 | 1536 | 上一代，已不推荐 |

### 5.5 Vector Store：语义搜索引擎

把所有文档块的向量存起来，查询时找到最相似的 Top-K：

```text
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# 构建向量库
vectorstore = FAISS.from_documents(
documents=splits,
embedding=OpenAIEmbeddings()
)

# 语义搜索（不仅是关键词匹配）
results = vectorstore.similarity_search(
query="MoE 架构的优缺点是什么？",
k=4  # 返回最相关的 4 个 chunk
)

for doc in results:
print(doc.metadata)   # 来源信息
print(doc.page_content[:200])  # 内容摘要
```

**向量数据库选型（视频中提及的）**：

| 方案 | 类型 | 适用场景 |
| --- | --- | --- |
| FAISS | 本地/内存 | 开发测试、小数据量 |
| Chroma | 本地持久化 | 中小项目 |
| Pinecone | 云服务 | 生产环境 |
| Weaviate | 云/自托管 | 企业级 |
| Qdrant | 云/自托管 | 高性能需求 |

---

### 6. 第五集：Chains —— 编排的艺术

> **视频源**：5.mp4（约 25 分钟）—— LLMChain、RouterChain、SequentialChain、Document Chains

### 6.1 Chain 是什么？

Chain 是 LangChain 中最核心的抽象。它把”调用 LLM”这个原子操作，扩展成”调用 LLM 之前做一堆事，调用之后再做一堆事”的流水线。

最简单的例子：

```text
# 没有 Chain：你需要手动管理这些步骤
prompt = template.format(input=user_input)
response = llm.invoke(prompt)
parsed = parser.parse(response)

# 有了 Chain：一个调用搞定
chain = prompt | llm | parser  # LCEL 语法（LangChain Expression Language）
result = chain.invoke({"input": user_input})
```

`|` 是 LangChain 的管道操作符，让你像 Unix 管道一样串联组件。

### 6.2 Chain 家族全景

### LLMChain：最基础的链

```text
from langchain.chains import LLMChain
from langchain_core.prompts import PromptTemplate

prompt = PromptTemplate.from_template(
"给{age}岁孩子推荐{count}本{language}绘本"
)
chain = LLMChain(llm=llm, prompt=prompt)
result = chain.run(age="5", count="3", language="中文")
```

### RouterChain：智能分发

视频中的核心场景：用户提问内容不确定——可能是数学题、编程题、或一般闲聊。RouteChain 自动将问题路由到最合适的处理器：

```text
用户输入 → RouterChain → 判断类型 →
├─ 数学 → MathChain（prompt: "你是数学专家..."）
├─ 编程 → CodeChain（prompt: "你是编程专家..."）
└─ 通用 → GeneralChain（prompt: "你是知识渊博的助手..."）
from langchain.chains.router import MultiPromptChain
from langchain.chains.router.llm_router import LLMRouterChain, RouterOutputParser
from langchain.chains.router.multi_prompt_prompt import MULTI_PROMPT_ROUTER_TEMPLATE

# 定义不同场景的 prompt 模板
math_template = """你是一个优秀的数学家。你擅长将复杂问题拆解成简单步骤。
请逐步解答以下数学问题：

{input}"""

code_template = """你是一个高级 Python 工程师。
请提供完整的代码和解释来回答以下问题：

{input}"""

# 路由链会根据输入自动选择最合适的模板
router_chain = MultiPromptChain.from_prompts(
llm=llm,
prompt_infos=[
{"name": "math", "description": "适合回答数学问题", "prompt_template": math_template},
{"name": "code", "description": "适合回答编程问题", "prompt_template": code_template},
]
)
```

### SequentialChain：流水线处理

```text
输入 → 生成大纲 → 展开段落 → 润色校对 → 输出
from langchain.chains import SequentialChain, LLMChain

# Chain 1: 生成大纲
outline_chain = LLMChain(
llm=llm,
prompt=PromptTemplate.from_template("为'{topic}'生成一个文章大纲"),
output_key="outline"
)

# Chain 2: 展开内容
expand_chain = LLMChain(
llm=llm,
prompt=PromptTemplate.from_template("根据大纲展开写文章:\n{outline}"),
output_key="article"
)

# Chain 3: 润色
polish_chain = LLMChain(
llm=llm,
prompt=PromptTemplate.from_template("润色以下文章:\n{article}"),
output_key="final"
)

# 串联
pipeline = SequentialChain(
chains=[outline_chain, expand_chain, polish_chain],
input_variables=["topic"],
output_variables=["final"],
)

result = pipeline({"topic": "LangChain vs 原生 API"})
print(result["final"])
```

### TransformationChain：后处理管道

对 LLM 输出做任意后处理——翻译、摘要、格式化、敏感词过滤等：

```text
from langchain.chains import TransformChain

def clean_response(inputs: dict) -> dict:
"""移除 LLM 输出中的多余空白和前缀"""
text = inputs["text"]
text = text.strip().replace("AI: ", "").replace("Assistant: ", "")
return {"cleaned": text}

cleaner = TransformChain(
input_variables=["text"],
output_variables=["cleaned"],
transform=clean_response
)
```

### 6.3 Document Chains：RAG 的核心

当你从向量库检索出多个相关文档块后，如何把它们”喂”给 LLM？有四种策略：

### Stuff（填鸭式）

```text
所有检索结果 + 用户问题 → 塞进一个 Prompt → LLM 一次回答

优点：一次 API 调用，简单直接
缺点：受限于上下文窗口长度
场景：检索结果 < 4 个 chunk
```

### Map-Reduce（分治式）

```text
Chunk1 → LLM → 摘要1 ┐
Chunk2 → LLM → 摘要2 ├→ 汇总摘要 → LLM → 最终答案
Chunk3 → LLM → 摘要3 ┘

优点：可并行处理，适合海量文档
缺点：多次 API 调用，延迟较高
场景：需要覆盖大量文档
```

### Refine（迭代式）

```text
Chunk1 → LLM → 初始答案
Chunk2 + 初始答案 → LLM → 修正后答案
Chunk3 + 修正后答案 → LLM → 最终答案

优点：答案质量逐步提升
缺点：串行调用，延迟最高
场景：对答案质量要求极高
```

### Map-Rerank（打分式）

```text
Chunk1 → LLM → 答案1 + 信心分 0.7 ┐
Chunk2 → LLM → 答案2 + 信心分 0.9 ├→ 选最高分 → 最终答案
Chunk3 → LLM → 答案3 + 信心分 0.3 ┘

场景：需要 LLM 对相关性进行打分排名
```

---

### 7. 第六集：Agents —— 会思考的 LLM

> **视频源**：6.mp4（约 25 分钟）—— Agent 概念、ReAct 模式、Plan-and-Execute

### 7.1 什么是 Agent？

Chain 是被动的——你定义了流程，LLM 照做。Agent 是主动的——你给了工具箱，LLM 自己决定用哪个、用几次、按什么顺序。

```text
Agent 工作循环：
1. 收到任务："北京到上海的直线距离，换成英里是多少？"
2. 思考：需要先知道距离，再换算单位
3. 行动：调用 Search("北京 上海 直线距离")  → 约 1068 公里
4. 观察：得到了公里数
5. 再思考：需要把公里换成英里（1 公里 ≈ 0.621 英里）
6. 行动：调用 Calculator("1068 * 0.621")  → 663.2
7. 观察：计算完成
8. 输出：约 663 英里
```

### 7.2 ReAct：推理与行动的交错

ReAct = Reasoning + Acting。Agent 在每个步骤都输出三个部分：

```text
Thought: 我在这一步应该做什么？
Action: 我调用哪个工具？参数是什么？
Observation: 工具返回了什么？
```

视频中的经典示例：

```text
Q: Leo DiCaprio 的女朋友是谁？她当前年龄的 0.43 次方是多少？

Thought: 先查女朋友是谁
Action: Search("Leo DiCaprio girlfriend")
Observation: 模特 Vittoria Ceretti

Thought: 查她的年龄
Action: Search("Vittoria Ceretti age")
Observation: 出生于 1998 年 6 月，现 26 岁

Thought: 计算 26 的 0.43 次方
Action: Calculator("26^0.43")
Observation: Answer: 4.059...

Thought: 得到了所有信息，可以回答了
Answer: Leo DiCaprio 的女友是 Vittoria Ceretti，26 岁。26^0.43 ≈ 4.06。
```

### 7.3 Agent 代码实现

```text
from langchain.agents import load_tools, initialize_agent, AgentType
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="deepseek-chat", temperature=0)

# 加载工具
tools = load_tools(
["serpapi", "llm-math"],  # 搜索引擎 + 计算器
llm=llm
)

# 初始化 Agent
agent = initialize_agent(
tools=tools,
llm=llm,
agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
verbose=True,
handle_parsing_errors=True,
max_iterations=5,  # 最多 5 轮，防止死循环
)

# 执行
result = agent.run(
"Who is Leo DiCaprio's girlfriend? "
"What is her current age raised to the 0.43 power?"
)
```

**verbose=True 输出示例**：

```text
> Entering new AgentExecutor chain...
Thought: I need to find Leo DiCaprio's girlfriend first.
Action: Search
Action Input: "Leo DiCaprio girlfriend"
Observation: Leo DiCaprio is dating Italian model Vittoria Ceretti...

Thought: Now I need her age.
Action: Search
Action Input: "Vittoria Ceretti age"
Observation: Vittoria Ceretti was born on June 7, 1998. As of now, she is 26.

Thought: Now calculate 26^0.43.
Action: Calculator
Action Input: 26^0.43
Observation: Answer: 4.059

Thought: I have the answer.
Final Answer: Leo DiCaprio's girlfriend is Vittoria Ceretti, age 26. 26^0.43 ≈ 4.06
```

## LangChain 核心组件全景解析：从零到一构建 LLM 应用

> **作者注**：本文基于 LangChain 系列教程（共 9 集，总时长约 5 小时）系统整理而成。逐帧分析了视频中的幻灯片、代码演示和架构图示，并结合 LangChain 最新 API 进行了校验和适配。适合有 Python 基础的开发者系统学习。

---

### 目录

1. [开篇：为什么要学 LangChain](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#1-%E5%BC%80%E7%AF%87%E4%B8%BA%E4%BB%80%E4%B9%88%E8%A6%81%E5%AD%A6-langchain)
2. [第一集：LangChain 入门与 LLM 生态概览](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#2-%E7%AC%AC%E4%B8%80%E9%9B%86langchain-%E5%85%A5%E9%97%A8%E4%B8%8E-llm-%E7%94%9F%E6%80%81%E6%A6%82%E8%A7%88)
3. [第二集：Hello World 与 ConversationChain](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#3-%E7%AC%AC%E4%BA%8C%E9%9B%86hello-world-%E4%B8%8E-conversationchain)
4. [第三集：Model I/O —— Prompt 工程化](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#4-%E7%AC%AC%E4%B8%89%E9%9B%86model-io--prompt-%E5%B7%A5%E7%A8%8B%E5%8C%96)
5. [第四集：Data Connection —— 让 LLM 读懂你的数据](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#5-%E7%AC%AC%E5%9B%9B%E9%9B%86data-connection--%E8%AE%A9-llm-%E8%AF%BB%E6%87%82%E4%BD%A0%E7%9A%84%E6%95%B0%E6%8D%AE)
6. [第五集：Chains —— 编排的艺术](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#6-%E7%AC%AC%E4%BA%94%E9%9B%86chains--%E7%BC%96%E6%8E%92%E7%9A%84%E8%89%BA%E6%9C%AF)
7. [第六集：Agents —— 会思考的 LLM](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#7-%E7%AC%AC%E5%85%AD%E9%9B%86agents--%E4%BC%9A%E6%80%9D%E8%80%83%E7%9A%84-llm)
8. [第七集：实战 PDF 问答系统](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#8-%E7%AC%AC%E4%B8%83%E9%9B%86%E5%AE%9E%E6%88%98-pdf-%E9%97%AE%E7%AD%94%E7%B3%BB%E7%BB%9F)
9. [第八集：实战 搜索 Agent 进阶](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#9-%E7%AC%AC%E5%85%AB%E9%9B%86%E5%AE%9E%E6%88%98-%E6%90%9C%E7%B4%A2-agent-%E8%BF%9B%E9%98%B6)
10. [第九集：回顾总结与最佳实践](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#10-%E7%AC%AC%E4%B9%9D%E9%9B%86%E5%9B%9E%E9%A1%BE%E6%80%BB%E7%BB%93%E4%B8%8E%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5)
11. [附录：API 迁移指南与常见问题](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#11-%E9%99%84%E5%BD%95api-%E8%BF%81%E7%A7%BB%E6%8C%87%E5%8D%97%E4%B8%8E%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)

---

### 1. 开篇：为什么要学 LangChain

### 1.1 背景：LLM 时代的挑战

2022 年 11 月，OpenAI 发布了 GPT-3.5 API（text-davinci-003），开发者的世界从此改变。紧接着，GPT-4 以 MoE（Mixture of Experts）架构横空出世，Meta 开源了 LLaMA 系列，智谱推出了 ChatGLM。大模型不再只是论文里的概念，而是真正可以调用的 API。

但直接调用 API 做应用开发，会立刻撞上四面墙：

第一面墙：**上下文有限**。GPT-3.5 的 token 上限是 4096，一份 20 页的 PDF 根本塞不进去。

第二面墙：**能力受限**。LLM 不能搜索网页、不能执行代码、不能读取本地文件——它只是”一本百科全书”，而不是”一个能干活的助手”。

第三面墙：**没有记忆**。每次 API 调用都是崭新的对话，你问”我之前叫什么”它永远回答不上来。

第四面墙：**Prompt 管理混乱**。项目里散落着上百行硬编码的 prompt 字符串，改一个字要搜遍整个代码仓库。

LangChain 就是为了推倒这四面墙而生的。

### 1.2 LangChain 是什么

LangChain 不是一个新的 LLM，而是一个 **LLM 应用编排框架**。它的核心理念可以用一句话概括：

> 把 LLM 调用从”手工作坊”升级成”流水线工厂”。

```text
User Input → [Prompt Template] → [LLM Call] → [Output Parser] → Result
↑                ↑
[Memory]        [Tools / APIs]
```

LangChain 的六层架构：

| 层级 | 模块 | 解决的问题 |
| --- | --- | --- |
| L1 | Model I/O | 如何统一调用不同厂商的 LLM |
| L2 | Data Connection | 如何让 LLM 读取外部文档 |
| L3 | Chains | 如何串联多个 LLM 调用 |
| L4 | Memory | 如何让 LLM 记住对话 |
| L5 | Agents | 如何让 LLM 自主使用工具 |
| L6 | Callbacks | 如何监控和调试 LLM 调用链 |

### 1.3 主流 LLM 生态速览

截至教程录制时（约 2024 年初），主流选择：

| 模型 | 厂商 | 架构特点 | 适用场景 |
| --- | --- | --- | --- |
| GPT-4 | OpenAI | MoE 混合专家，8×220B 参数 | 最复杂推理，成本高 |
| GPT-3.5 | OpenAI | 175B Dense | 性价比首选 |
| LLaMA 2 | Meta | 7B/13B/70B 开源 | 本地部署、垂直微调 |
| ChatGLM | 智谱 AI | 中英双语优化 | 中文场景 |

**关于 MoE（Mixture of Experts）**：GPT-4 不是一个大模型，而是多个”专家”子模型的组合。每次推理时，只有部分专家被激活，所以速度快但总参数量巨大。你可以理解为：一个问题来了，系统自动把它派给最擅长这个领域的那几个”专家”回答。

---

### 2. 第一集：LangChain 入门与 LLM 生态概览

> **视频源**：1.mp4（约 30 分钟）—— 介绍 LangChain 的背景、LLM 生态，以及框架的核心理念

### 2.1 本集要点

这一集不涉及代码，而是建立认知框架。讲解者抛出三个核心问题：

1. **什么是 LLM / 大语言模型？** —— 从 GPT 系列的发展讲起，GPT-3 是 2020 年 6 月 11 日发布的，直到 2022 年 11 月 OpenAI 开放 API 后，普通开发者才真正用上。
2. **什么是 LangChain？** —— 一个 Python 框架，让开发者用”搭积木”的方式组合 LLM 调用。
3. **为什么要用 LangChain？** —— 直接调 API 能做 demo，但做产品需要工程化。

### 2.2 直接调 API 的局限

```text
// 原生 GPT API 调用
const response = await createCompletion({
model: "text-davinci-003",
prompt: "你是谁？",
temperature: 0.8,
max_tokens: 100,
});
```

这种代码看起来简单，但做不了产品级应用。原因：

- 没有 prompt 管理：每次拼接字符串，容易出错
- 没有上下文注入：业务数据无法喂给 LLM
- 没有结果处理：LLM 返回的裸文本需要自己解析
- 没有错误处理：API 异常、限流、超时都需要自己写
- 没有可观测性：调用链埋点、日志、调试全要手写

### 2.3 LangChain 的解法

LangChain 官网的一句话概括得很好：

> LangChain is a framework for developing applications powered by language models.

它在 LLM 之上构建了标准化的抽象层，让你只关心”业务逻辑”，不用管底层细节。

---

### 3. 第二集：Hello World 与 ConversationChain

> **视频源**：2.mp4（约 48 分钟）—— 第一个 LangChain 程序，从安装到带记忆的对话

### 3.1 环境搭建

```text
pip install langchain langchain-openai langchain-community python-dotenv
```

创建 `.env` 文件：

```text
DEEPSEEK_API_KEY=sk-your-key-here
OPENAI_API_KEY=sk-your-backup-key-here
```

### 3.2 第一个调用

```text
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

load_dotenv()

# DeepSeek 兼容 OpenAI SDK，零成本切换
llm = ChatOpenAI(
model="deepseek-chat",
temperature=0.7,
api_key=os.getenv("DEEPSEEK_API_KEY"),
base_url="https://api.deepseek.com/v1"
)

result = llm.invoke([HumanMessage(content="你好，请用一句话介绍 LangChain")])
print(result.content)
```

关键点：`base_url` 参数让你可以对接任何兼容 OpenAI API 的服务（DeepSeek、通义千问、本地 Ollama 等），实现模型层的”热插拔”。

### 3.3 Temperature 参数：控制创造力的旋钮

```text
temperature = 0.0  →  确定模式：数学计算、代码生成、事实问答
temperature = 0.7  →  平衡模式：日常对话、内容总结
temperature = 1.0  →  创造模式：创意写作、头脑风暴
```

底层原理：LLM 本质是在做”下一个 token 的概率预测”。temperature 越低，模型越倾向于选最高概率的 token；temperature 越高，低概率 token 被选中的机会越大，输出更”天马行空”。

### 3.4 Jupyter Notebook 交互式开发

视频中演示了在 Jupyter Notebook 中进行 LangChain 开发的全流程。Notebook 的 Cell 机制非常适合 LLM 开发——你可以逐步构建 prompt、观察输出、调整参数，而不需要每次重新运行整个脚本。

### 3.5 ConversationChain：有记忆的对话

```text
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

conversation = ConversationChain(
llm=llm,
memory=ConversationBufferMemory(),
verbose=True  # 打印完整对话记录
)

response1 = conversation.predict(input="我叫小明，今年 25 岁")
# > Entering new ConversationChain chain...
# > Human: 我叫小明，今年 25 岁
# > AI: 你好小明！...

response2 = conversation.predict(input="我叫什么名字？多大？")
# > Human: 我叫什么名字？多大？
# > AI: 你叫小明，今年 25 岁。
```

**verbose=True 的作用**：开启后会打印完整的 Chain 执行日志，包括输入的 prompt、LLM 的输出、以及中间步骤。调试 Chaining 问题时极其有用。

### 3.6 技术要点总结：Prompt 向 LLM 传递信息的方式

视频中有一个非常好的技术总结，将 Prompt 与 LLM 的交互归纳为以下机制：

- **System Message（系统消息）**：设定 AI 的行为边界和角色，如”你是一个专业的 Python 开发者”
- **Human Message（用户消息）**：用户的直接输入
- **AI Message（AI 回复）**：LLM 的返回结果——更重要的是，在多轮对话中，AI 的回复会被作为历史消息附加到后续请求的上下文中

**Temperature 配合不同的交互模式**：高 temperature 配合创意类任务，低 temperature 配合事实类、逻辑类任务。

---

### 4. 第三集：Model I/O —— Prompt 工程化

> **视频源**：3.mp4（约 31 分钟）—— Prompt 模板、Few-Shot、Example Selector

### 4.1 为什么需要 Prompt 模板？

直接拼接 prompt 是 LLM 开发中最常见的反模式：

```text
# ❌ 反模式：硬编码字符串拼接
prompt = "请将以下文本翻译成英文：" + text
```

问题显而易见：维护困难、复用不了、参数多了容易出错。Prompt Template 将 prompt 参数化，把”模板”和”数据”解耦。

### 4.2 PromptTemplate 基础用法

```text
from langchain_core.prompts import PromptTemplate

# 定义模板
template = PromptTemplate.from_template(
"你是一个{role}。请将以下文本翻译成{target_lang}：\n"
"{text}"
)

# 填充参数
prompt_str = template.format(
role="专业翻译",
target_lang="英文",
text="人工智能正在重塑每个行业"
)
```

**视频演示的关键设计模式**：在 template 中通过函数调用动态注入数据：

```text
def get_completion(prompt):
"""封装 LLM 调用，统一处理异常"""
try:
return llm.invoke(prompt)
except Exception as e:
return f"调用失败: {e}"
```

### 4.3 Few-Shot Prompting：用示例教会 LLM

当你需要 LLM 输出特定格式时，与其写长篇大论的说明书，不如直接给几个”标准答案”：

```text
from langchain_core.prompts import FewShotPromptTemplate, PromptTemplate

examples = [
{"input": "今天天气真好", "output": "正向"},
{"input": "我太难了",     "output": "负向"},
{"input": "随便吧",       "output": "中性"},
]

example_prompt = PromptTemplate.from_template(
"输入: {input}\n情感: {output}"
)

few_shot = FewShotPromptTemplate(
examples=examples,
example_prompt=example_prompt,
prefix="分析以下文本的情感倾向，只输出'正向'、'负向'或'中性'：",
suffix="输入: {input}\n情感:",
input_variables=["input"],
)
```

**Few-Shot vs 微调（Fine-tuning）的本质区别**：

| 维度 | Few-Shot | Fine-tuning |
| --- | --- | --- |
| 成本 | 零训练成本，Token 消耗 | 需要训练数据和 GPU |
| 灵活性 | 随时改示例，立即生效 | 修改需要重新训练 |
| 效果 | 适合格式控制 | 适合领域知识注入 |
| 持久性 | 每次推理消耗 token | 训练后模型自带能力 |

视频中的建议：**先用 Few-Shot 验证需求，确实需要再考虑 Fine-tuning**。

### 4.4 Example Selector：示例太多怎么办？

当你积累了数百个高质量示例，全部塞进 prompt 会超出 token 限制。ExampleSelector 自动帮你挑最相关的几个：

```text
from langchain_core.example_selectors import (
SemanticSimilarityExampleSelector
)
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

example_selector = SemanticSimilarityExampleSelector.from_examples(
examples=all_examples,      # 上百条示例
embeddings=OpenAIEmbeddings(),
vectorstore_cls=Chroma,
k=3,                        # 每次取最相关的 3 个
)
```

工作原理：

1. 将所有示例的 input 转换为向量
2. 用户输入也转换为向量
3. 计算余弦相似度，选取 Top-K 最接近的示例
4. 将选中的示例注入 Few-Shot Prompt

### 4.5 其他输出解析器

- **CommaSeparatedListOutputParser**：要求 LLM 以逗号分隔列表输出
- **StructuredOutputParser**：要求 LLM 按 JSON Schema 输出
- **PydanticOutputParser**：直接解析为 Pydantic 模型对象

---

### 5. 第四集：Data Connection —— 让 LLM 读懂你的数据

> **视频源**：4.mp4（约 35 分钟）—— Document Loader、Text Splitter、Embedding、Vector Store

这是 LangChain 最重要的模块，也是 RAG（Retrieval-Augmented Generation）的基LangChain 核心组件全景解析：从零到一构建 LLM 应用

> **作者注**：本文基于 LangChain 系列教程（共 9 集，总时长约 5 小时）系统整理而成。逐帧分析了视频中的幻灯片、代码演示和架构图示，并结合 LangChain 最新 API 进行了校验和适配。适合有 Python 基础的开发者系统学习。

---

### 目录

1. [开篇：为什么要学 LangChain](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#1-%E5%BC%80%E7%AF%87%E4%B8%BA%E4%BB%80%E4%B9%88%E8%A6%81%E5%AD%A6-langchain)
2. [第一集：LangChain 入门与 LLM 生态概览](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#2-%E7%AC%AC%E4%B8%80%E9%9B%86langchain-%E5%85%A5%E9%97%A8%E4%B8%8E-llm-%E7%94%9F%E6%80%81%E6%A6%82%E8%A7%88)
3. [第二集：Hello World 与 ConversationChain](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#3-%E7%AC%AC%E4%BA%8C%E9%9B%86hello-world-%E4%B8%8E-conversationchain)
4. [第三集：Model I/O —— Prompt 工程化](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#4-%E7%AC%AC%E4%B8%89%E9%9B%86model-io--prompt-%E5%B7%A5%E7%A8%8B%E5%8C%96)
5. [第四集：Data Connection —— 让 LLM 读懂你的数据](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#5-%E7%AC%AC%E5%9B%9B%E9%9B%86data-connection--%E8%AE%A9-llm-%E8%AF%BB%E6%87%82%E4%BD%A0%E7%9A%84%E6%95%B0%E6%8D%AE)
6. [第五集：Chains —— 编排的艺术](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#6-%E7%AC%AC%E4%BA%94%E9%9B%86chains--%E7%BC%96%E6%8E%92%E7%9A%84%E8%89%BA%E6%9C%AF)
7. [第六集：Agents —— 会思考的 LLM](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#7-%E7%AC%AC%E5%85%AD%E9%9B%86agents--%E4%BC%9A%E6%80%9D%E8%80%83%E7%9A%84-llm)
8. [第七集：实战 PDF 问答系统](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#8-%E7%AC%AC%E4%B8%83%E9%9B%86%E5%AE%9E%E6%88%98-pdf-%E9%97%AE%E7%AD%94%E7%B3%BB%E7%BB%9F)
9. [第八集：实战 搜索 Agent 进阶](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#9-%E7%AC%AC%E5%85%AB%E9%9B%86%E5%AE%9E%E6%88%98-%E6%90%9C%E7%B4%A2-agent-%E8%BF%9B%E9%98%B6)
10. [第九集：回顾总结与最佳实践](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#10-%E7%AC%AC%E4%B9%9D%E9%9B%86%E5%9B%9E%E9%A1%BE%E6%80%BB%E7%BB%93%E4%B8%8E%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5)
11. [附录：API 迁移指南与常见问题](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#11-%E9%99%84%E5%BD%95api-%E8%BF%81%E7%A7%BB%E6%8C%87%E5%8D%97%E4%B8%8E%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)

---

### 1. 开篇：为什么要学 LangChain

### 1.1 背景：LLM 时代的挑战

2022 年 11 月，OpenAI 发布了 GPT-3.5 API（text-davinci-003），开发者的世界从此改变。紧接着，GPT-4 以 MoE（Mixture of Experts）架构横空出世，Meta 开源了 LLaMA 系列，智谱推出了 ChatGLM。大模型不再只是论文里的概念，而是真正可以调用的 API。

但直接调用 API 做应用开发，会立刻撞上四面墙：

第一面墙：**上下文有限**。GPT-3.5 的 token 上限是 4096，一份 20 页的 PDF 根本塞不进去。

第二面墙：**能力受限**。LLM 不能搜索网页、不能执行代码、不能读取本地文件——它只是”一本百科全书”，而不是”一个能干活的助手”。

第三面墙：**没有记忆**。每次 API 调用都是崭新的对话，你问”我之前叫什么”它永远回答不上来。

第四面墙：**Prompt 管理混乱**。项目里散落着上百行硬编码的 prompt 字符串，改一个字要搜遍整个代码仓库。

LangChain 就是为了推倒这四面墙而生的。

### 1.2 LangChain 是什么

LangChain 不是一个新的 LLM，而是一个 **LLM 应用编排框架**。它的核心理念可以用一句话概括：

> 把 LLM 调用从”手工作坊”升级成”流水线工厂”。

```text
User Input → [Prompt Template] → [LLM Call] → [Output Parser] → Result
↑                ↑
[Memory]        [Tools / APIs]
```

LangChain 的六层架构：

| 层级 | 模块 | 解决的问题 |
| --- | --- | --- |
| L1 | Model I/O | 如何统一调用不同厂商的 LLM |
| L2 | Data Connection | 如何让 LLM 读取外部文档 |
| L3 | Chains | 如何串联多个 LLM 调用 |
| L4 | Memory | 如何让 LLM 记住对话 |
| L5 | Agents | 如何让 LLM 自主使用工具 |
| L6 | Callbacks | 如何监控和调试 LLM 调用链 |

![image](./image-01.jpg)

### 1.3 主流 LLM 生态速览

截至教程录制时（约 2024 年初），主流选择：

| 模型 | 厂商 | 架构特点 | 适用场景 |
| --- | --- | --- | --- |
| GPT-4 | OpenAI | MoE 混合专家，8×220B 参数 | 最复杂推理，成本高 |
| GPT-3.5 | OpenAI | 175B Dense | 性价比首选 |
| LLaMA 2 | Meta | 7B/13B/70B 开源 | 本地部署、垂直微调 |
| ChatGLM | 智谱 AI | 中英双语优化 | 中文场景 |

**关于 MoE（Mixture of Experts）**：GPT-4 不是一个大模型，而是多个”专家”子模型的组合。每次推理时，只有部分专家被激活，所以速度快但总参数量巨大。你可以理解为：一个问题来了，系统自动把它派给最擅长这个领域的那几个”专家”回答。

---

### 2. 第一集：LangChain 入门与 LLM 生态概览

> **视频源**：1.mp4（约 30 分钟）—— 介绍 LangChain 的背景、LLM 生态，以及框架的核心理念

### 2.1 本集要点

这一集不涉及代码，而是建立认知框架。讲解者抛出三个核心问题：

1. **什么是 LLM / 大语言模型？** —— 从 GPT 系列的发展讲起，GPT-3 是 2020 年 6 月 11 日发布的，直到 2022 年 11 月 OpenAI 开放 API 后，普通开发者才真正用上。
2. **什么是 LangChain？** —— 一个 Python 框架，让开发者用”搭积木”的方式组合 LLM 调用。
3. **为什么要用 LangChain？** —— 直接调 API 能做 demo，但做产品需要工程化。

### 2.2 直接调 API 的局限

```text
// 原生 GPT API 调用
const response = await createCompletion({
model: "text-davinci-003",
prompt: "你是谁？",
temperature: 0.8,
max_tokens: 100,
});
```

这种代码看起来简单，但做不了产品级应用。原因：

- 没有 prompt 管理：每次拼接字符串，容易出错
- 没有上下文注入：业务数据无法喂给 LLM
- 没有结果处理：LLM 返回的裸文本需要自己解析
- 没有错误处理：API 异常、限流、超时都需要自己写
- 没有可观测性：调用链埋点、日志、调试全要手写

### 2.3 LangChain 的解法

LangChain 官网的一句话概括得很好：

> LangChain is a framework for developing applications powered by language models.

它在 LLM 之上构建了标准化的抽象层，让你只关心”业务逻辑”，不用管底层细节。

---

### 3. 第二集：Hello World 与 ConversationChain

> **视频源**：2.mp4（约 48 分钟）—— 第一个 LangChain 程序，从安装到带记忆的对话

### 3.1 环境搭建

```text
pip install langchain langchain-openai langchain-community python-dotenv
```

创建 `.env` 文件：

```text
DEEPSEEK_API_KEY=sk-your-key-here
OPENAI_API_KEY=sk-your-backup-key-here
```

### 3.2 第一个调用

```text
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

load_dotenv()

# DeepSeek 兼容 OpenAI SDK，零成本切换
llm = ChatOpenAI(
model="deepseek-chat",
temperature=0.7,
api_key=os.getenv("DEEPSEEK_API_KEY"),
base_url="https://api.deepseek.com/v1"
)

result = llm.invoke([HumanMessage(content="你好，请用一句话介绍 LangChain")])
print(result.content)
```

关键点：`base_url` 参数让你可以对接任何兼容 OpenAI API 的服务（DeepSeek、通义千问、本地 Ollama 等），实现模型层的”热插拔”。

### 3.3 Temperature 参数：控制创造力的旋钮

```text
temperature = 0.0  →  确定模式：数学计算、代码生成、事实问答
temperature = 0.7  →  平衡模式：日常对话、内容总结
temperature = 1.0  →  创造模式：创意写作、头脑风暴
```

底层原理：LLM 本质是在做”下一个 token 的概率预测”。temperature 越低，模型越倾向于选最高概率的 token；temperature 越高，低概率 token 被选中的机会越大，输出更”天马行空”。

### 3.4 Jupyter Notebook 交互式开发

视频中演示了在 Jupyter Notebook 中进行 LangChain 开发的全流程。Notebook 的 Cell 机制非常适合 LLM 开发——你可以逐步构建 prompt、观察输出、调整参数，而不需要每次重新运行整个脚本。

### 3.5 ConversationChain：有记忆的对话

```text
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

conversation = ConversationChain(
llm=llm,
memory=ConversationBufferMemory(),
verbose=True  # 打印完整对话记录
)

response1 = conversation.predict(input="我叫小明，今年 25 岁")
# > Entering new ConversationChain chain...
# > Human: 我叫小明，今年 25 岁
# > AI: 你好小明！...

response2 = conversation.predict(input="我叫什么名字？多大？")
# > Human: 我叫什么名字？多大？
# > AI: 你叫小明，今年 25 岁。
```

**verbose=True 的作用**：开启后会打印完整的 Chain 执行日志，包括输入的 prompt、LLM 的输出、以及中间步骤。调试 Chaining 问题时极其有用。

### 3.6 技术要点总结：Prompt 向 LLM 传递信息的方式

视频中有一个非常好的技术总结，将 Prompt 与 LLM 的交互归纳为以下机制：

- **System Message（系统消息）**：设定 AI 的行为边界和角色，如”你是一个专业的 Python 开发者”
- **Human Message（用户消息）**：用户的直接输入
- **AI Message（AI 回复）**：LLM 的返回结果——更重要的是，在多轮对话中，AI 的回复会被作为历史消息附加到后续请求的上下文中

**Temperature 配合不同的交互模式**：高 temperature 配合创意类任务，低 temperature 配合事实类、逻辑类任务。

---

### 4. 第三集：Model I/O —— Prompt 工程化

> **视频源**：3.mp4（约 31 分钟）—— Prompt 模板、Few-Shot、Example Selector

### 4.1 为什么需要 Prompt 模板？

直接拼接 prompt 是 LLM 开发中最常见的反模式：

```text
# ❌ 反模式：硬编码字符串拼接
prompt = "请将以下文本翻译成英文：" + text
```

问题显而易见：维护困难、复用不了、参数多了容易出错。Prompt Template 将 prompt 参数化，把”模板”和”数据”解耦。

### 4.2 PromptTemplate 基础用法

```text
from langchain_core.prompts import PromptTemplate

# 定义模板
template = PromptTemplate.from_template(
"你是一个{role}。请将以下文本翻译成{target_lang}：\n"
"{text}"
)

# 填充参数
prompt_str = template.format(
role="专业翻译",
target_lang="英文",
text="人工智能正在重塑每个行业"
)
```

**视频演示的关键设计模式**：在 template 中通过函数调用动态注入数据：

```text
def get_completion(prompt):
"""封装 LLM 调用，统一处理异常"""
try:
return llm.invoke(prompt)
except Exception as e:
return f"调用失败: {e}"
```

### 4.3 Few-Shot Prompting：用示例教会 LLM

当你需要 LLM 输出特定格式时，与其写长篇大论的说明书，不如直接给几个”标准答案”：

```text
from langchain_core.prompts import FewShotPromptTemplate, PromptTemplate

examples = [
{"input": "今天天气真好", "output": "正向"},
{"input": "我太难了",     "output": "负向"},
{"input": "随便吧",       "output": "中性"},
]

example_prompt = PromptTemplate.from_template(
"输入: {input}\n情感: {output}"
)

few_shot = FewShotPromptTemplate(
examples=examples,
example_prompt=example_prompt,
prefix="分析以下文本的情感倾向，只输出'正向'、'负向'或'中性'：",
suffix="输入: {input}\n情感:",
input_variables=["input"],
)
```

**Few-Shot vs 微调（Fine-tuning）的本质区别**：

| 维度 | Few-Shot | Fine-tuning |
| --- | --- | --- |
| 成本 | 零训练成本，Token 消耗 | 需要训练数据和 GPU |
| 灵活性 | 随时改示例，立即生效 | 修改需要重新训练 |
| 效果 | 适合格式控制 | 适合领域知识注入 |
| 持久性 | 每次推理消耗 token | 训练后模型自带能力 |

视频中的建议：**先用 Few-Shot 验证需求，确实需要再考虑 Fine-tuning**。

## LangChain 核心组件全景解析：从零到一构建 LLM 应用

![image](./image-02.jpg)

> **作者注**：本文基于 LangChain 系列教程（共 9 集，总时长约 5 小时）系统整理而成。逐帧分析了视频中的幻灯片、代码演示和架构图示，并结合 LangChain 最新 API 进行了校验和适配。适合有 Python 基础的开发者系统学习。

---

### 目录

1. [开篇：为什么要学 LangChain](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#1-%E5%BC%80%E7%AF%87%E4%B8%BA%E4%BB%80%E4%B9%88%E8%A6%81%E5%AD%A6-langchain)
2. [第一集：LangChain 入门与 LLM 生态概览](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#2-%E7%AC%AC%E4%B8%80%E9%9B%86langchain-%E5%85%A5%E9%97%A8%E4%B8%8E-llm-%E7%94%9F%E6%80%81%E6%A6%82%E8%A7%88)
3. [第二集：Hello World 与 ConversationChain](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#3-%E7%AC%AC%E4%BA%8C%E9%9B%86hello-world-%E4%B8%8E-conversationchain)
4. [第三集：Model I/O —— Prompt 工程化](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#4-%E7%AC%AC%E4%B8%89%E9%9B%86model-io--prompt-%E5%B7%A5%E7%A8%8B%E5%8C%96)
5. [第四集：Data Connection —— 让 LLM 读懂你的数据](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#5-%E7%AC%AC%E5%9B%9B%E9%9B%86data-connection--%E8%AE%A9-llm-%E8%AF%BB%E6%87%82%E4%BD%A0%E7%9A%84%E6%95%B0%E6%8D%AE)
6. [第五集：Chains —— 编排的艺术](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#6-%E7%AC%AC%E4%BA%94%E9%9B%86chains--%E7%BC%96%E6%8E%92%E7%9A%84%E8%89%BA%E6%9C%AF)
7. [第六集：Agents —— 会思考的 LLM](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#7-%E7%AC%AC%E5%85%AD%E9%9B%86agents--%E4%BC%9A%E6%80%9D%E8%80%83%E7%9A%84-llm)
8. [第七集：实战 PDF 问答系统](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#8-%E7%AC%AC%E4%B8%83%E9%9B%86%E5%AE%9E%E6%88%98-pdf-%E9%97%AE%E7%AD%94%E7%B3%BB%E7%BB%9F)
9. [第八集：实战 搜索 Agent 进阶](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#9-%E7%AC%AC%E5%85%AB%E9%9B%86%E5%AE%9E%E6%88%98-%E6%90%9C%E7%B4%A2-agent-%E8%BF%9B%E9%98%B6)
10. [第九集：回顾总结与最佳实践](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#10-%E7%AC%AC%E4%B9%9D%E9%9B%86%E5%9B%9E%E9%A1%BE%E6%80%BB%E7%BB%93%E4%B8%8E%E6%9C%80%E4%BD%B3%E5%AE%9E%E8%B7%B5)
11. [附录：API 迁移指南与常见问题](https://zhuanlan.zhihu.com/p/2048906743363769607/edit#11-%E9%99%84%E5%BD%95api-%E8%BF%81%E7%A7%BB%E6%8C%87%E5%8D%97%E4%B8%8E%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)

---

### 1. 开篇：为什么要学 LangChain

### 1.1 背景：LLM 时代的挑战

2022 年 11 月，OpenAI 发布了 GPT-3.5 API（text-davinci-003），开发者的世界从此改变。紧接着，GPT-4 以 MoE（Mixture of Experts）架构横空出世，Meta 开源了 LLaMA 系列，智谱推出了 ChatGLM。大模型不再只是论文里的概念，而是真正可以调用的 API。

但直接调用 API 做应用开发，会立刻撞上四面墙：

第一面墙：**上下文有限**。GPT-3.5 的 token 上限是 4096，一份 20 页的 PDF 根本塞不进去。

第二面墙：**能力受限**。LLM 不能搜索网页、不能执行代码、不能读取本地文件——它只是”一本百科全书”，而不是”一个能干活的助手”。

第三面墙：**没有记忆**。每次 API 调用都是崭新的对话，你问”我之前叫什么”它永远回答不上来。

第四面墙：**Prompt 管理混乱**。项目里散落着上百行硬编码的 prompt 字符串，改一个字要搜遍整个代码仓库。

LangChain 就是为了推倒这四面墙而生的。

### 1.2 LangChain 是什么

LangChain 不是一个新的 LLM，而是一个 **LLM 应用编排框架**。它的核心理念可以用一句话概括：

> 把 LLM 调用从”手工作坊”升级成”流水线工厂”。

```text
User Input → [Prompt Template] → [LLM Call] → [Output Parser] → Result
↑                ↑
[Memory]        [Tools / APIs]
```

LangChain 的六层架构：

| 层级 | 模块 | 解决的问题 |
| --- | --- | --- |
| L1 | Model I/O | 如何统一调用不同厂商的 LLM |
| L2 | Data Connection | 如何让 LLM 读取外部文档 |
| L3 | Chains | 如何串联多个 LLM 调用 |
| L4 | Memory | 如何让 LLM 记住对话 |
| L5 | Agents | 如何让 LLM 自主使用工具 |
| L6 | Callbacks | 如何监控和调试 LLM 调用链 |

![image](./image-03.jpg)

### 1.3 主流 LLM 生态速览

截至教程录制时（约 2024 年初），主流选择：

| 模型 | 厂商 | 架构特点 | 适用场景 |
| --- | --- | --- | --- |
| GPT-4 | OpenAI | MoE 混合专家，8×220B 参数 | 最复杂推理，成本高 |
| GPT-3.5 | OpenAI | 175B Dense | 性价比首选 |
| LLaMA 2 | Meta | 7B/13B/70B 开源 | 本地部署、垂直微调 |
| ChatGLM | 智谱 AI | 中英双语优化 | 中文场景 |

**关于 MoE（Mixture of Experts）**：GPT-4 不是一个大模型，而是多个”专家”子模型的组合。每次推理时，只有部分专家被激活，所以速度快但总参数量巨大。你可以理解为：一个问题来了，系统自动把它派给最擅长这个领域的那几个”专家”回答。

---

### 2. 第一集：LangChain 入门与 LLM 生态概览

> **视频源**：1.mp4（约 30 分钟）—— 介绍 LangChain 的背景、LLM 生态，以及框架的核心理念

### 2.1 本集要点

这一集不涉及代码，而是建立认知框架。讲解者抛出三个核心问题：

1. **什么是 LLM / 大语言模型？** —— 从 GPT 系列的发展讲起，GPT-3 是 2020 年 6 月 11 日发布的，直到 2022 年 11 月 OpenAI 开放 API 后，普通开发者才真正用上。
2. **什么是 LangChain？** —— 一个 Python 框架，让开发者用”搭积木”的方式组合 LLM 调用。
3. **为什么要用 LangChain？** —— 直接调 API 能做 demo，但做产品需要工程化。

### 2.2 直接调 API 的局限

```text
// 原生 GPT API 调用
const response = await createCompletion({
model: "text-davinci-003",
prompt: "你是谁？",
temperature: 0.8,
max_tokens: 100,
});
```

这种代码看起来简单，但做不了产品级应用。原因：

- 没有 prompt 管理：每次拼接字符串，容易出错
- 没有上下文注入：业务数据无法喂给 LLM
- 没有结果处理：LLM 返回的裸文本需要自己解析
- 没有错误处理：API 异常、限流、超时都需要自己写
- 没有可观测性：调用链埋点、日志、调试全要手写

### 2.3 LangChain 的解法

LangChain 官网的一句话概括得很好：

> LangChain is a framework for developing applications powered by language models.

它在 LLM 之上构建了标准化的抽象层，让你只关心”业务逻辑”，不用管底层细节。

![image](./image-04.jpg)

---

### 3. 第二集：Hello World 与 ConversationChain

> **视频源**：2.mp4（约 48 分钟）—— 第一个 LangChain 程序，从安装到带记忆的对话

### 3.1 环境搭建

```text
pip install langchain langchain-openai langchain-community python-dotenv
```

创建 `.env` 文件：

```text
DEEPSEEK_API_KEY=sk-your-key-here
OPENAI_API_KEY=sk-your-backup-key-here
```

### 3.2 第一个调用

```text
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

load_dotenv()

# DeepSeek 兼容 OpenAI SDK，零成本切换
llm = ChatOpenAI(
model="deepseek-chat",
temperature=0.7,
api_key=os.getenv("DEEPSEEK_API_KEY"),
base_url="https://api.deepseek.com/v1"
)

result = llm.invoke([HumanMessage(content="你好，请用一句话介绍 LangChain")])
print(result.content)
```

关键点：`base_url` 参数让你可以对接任何兼容 OpenAI API 的服务（DeepSeek、通义千问、本地 Ollama 等），实现模型层的”热插拔”。

### 3.3 Temperature 参数：控制创造力的旋钮

```text
temperature = 0.0  →  确定模式：数学计算、代码生成、事实问答
temperature = 0.7  →  平衡模式：日常对话、内容总结
temperature = 1.0  →  创造模式：创意写作、头脑风暴
```

底层原理：LLM 本质是在做”下一个 token 的概率预测”。temperature 越低，模型越倾向于选最高概率的 token；temperature 越高，低概率 token 被选中的机会越大，输出更”天马行空”。

### 3.4 Jupyter Notebook 交互式开发

视频中演示了在 Jupyter Notebook 中进行 LangChain 开发的全流程。Notebook 的 Cell 机制非常适合 LLM 开发——你可以逐步构建 prompt、观察输出、调整参数，而不需要每次重新运行整个脚本。

![image](./image-05.jpg)

### 3.5 ConversationChain：有记忆的对话

```text
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

conversation = ConversationChain(
llm=llm,
memory=ConversationBufferMemory(),
verbose=True  # 打印完整对话记录
)

response1 = conversation.predict(input="我叫小明，今年 25 岁")
# > Entering new ConversationChain chain...
# > Human: 我叫小明，今年 25 岁
# > AI: 你好小明！...

response2 = conversation.predict(input="我叫什么名字？多大？")
# > Human: 我叫什么名字？多大？
# > AI: 你叫小明，今年 25 岁。
```

**verbose=True 的作用**：开启后会打印完整的 Chain 执行日志，包括输入的 prompt、LLM 的输出、以及中间步骤。调试 Chaining 问题时极其有用。

### 3.6 技术要点总结：Prompt 向 LLM 传递信息的方式

视频中有一个非常好的技术总结，将 Prompt 与 LLM 的交互归纳为以下机制：

- **System Message（系统消息）**：设定 AI 的行为边界和角色，如”你是一个专业的 Python 开发者”
- **Human Message（用户消息）**：用户的直接输入
- **AI Message（AI 回复）**：LLM 的返回结果——更重要的是，在多轮对话中，AI 的回复会被作为历史消息附加到后续请求的上下文中

**Temperature 配合不同的交互模式**：高 temperature 配合创意类任务，低 temperature 配合事实类、逻辑类任务。

---

### 4. 第三集：Model I/O —— Prompt 工程化

> **视频源**：3.mp4（约 31 分钟）—— Prompt 模板、Few-Shot、Example Selector

### 4.1 为什么需要 Prompt 模板？

直接拼接 prompt 是 LLM 开发中最常见的反模式：

```text
# ❌ 反模式：硬编码字符串拼接
prompt = "请将以下文本翻译成英文：" + text
```

问题显而易见：维护困难、复用不了、参数多了容易出错。Prompt Template 将 prompt 参数化，把”模板”和”数据”解耦。

### 4.2 PromptTemplate 基础用法

```text
from langchain_core.prompts import PromptTemplate

# 定义模板
template = PromptTemplate.from_template(
"你是一个{role}。请将以下文本翻译成{target_lang}：\n"
"{text}"
)

# 填充参数
prompt_str = template.format(
role="专业翻译",
target_lang="英文",
text="人工智能正在重塑每个行业"
)
```

**视频演示的关键设计模式**：在 template 中通过函数调用动态注入数据：

```text
def get_completion(prompt):
"""封装 LLM 调用，统一处理异常"""
try:
return llm.invoke(prompt)
except Exception as e:
return f"调用失败: {e}"
```

### 4.3 Few-Shot Prompting：用示例教会 LLM

当你需要 LLM 输出特定格式时，与其写长篇大论的说明书，不如直接给几个”标准答案”：

```text
from langchain_core.prompts import FewShotPromptTemplate, PromptTemplate

examples = [
{"input": "今天天气真好", "output": "正向"},
{"input": "我太难了",     "output": "负向"},
{"input": "随便吧",       "output": "中性"},
]

example_prompt = PromptTemplate.from_template(
"输入: {input}\n情感: {output}"
)

few_shot = FewShotPromptTemplate(
examples=examples,
example_prompt=example_prompt,
prefix="分析以下文本的情感倾向，只输出'正向'、'负向'或'中性'：",
suffix="输入: {input}\n情感:",
input_variables=["input"],
)
```

**Few-Shot vs 微调（Fine-tuning）的本质区别**：

| 维度 | Few-Shot | Fine-tuning |
| --- | --- | --- |
| 成本 | 零训练成本，Token 消耗 | 需要训练数据和 GPU |
| 灵活性 | 随时改示例，立即生效 | 修改需要重新训练 |
| 效果 | 适合格式控制 | 适合领域知识注入 |
| 持久性 | 每次推理消耗 token | 训练后模型自带能力 |

视频中的建议：**先用 Few-Shot 验证需求，确实需要再考虑 Fine-tuning**。

![image](./image-06.jpg)

### 4.4 Example Selector：示例太多怎么办？

当你积累了数百个高质量示例，全部塞进 prompt 会超出 token 限制。ExampleSelector 自动帮你挑最相关的几个：

```text
from langchain_core.example_selectors import (
SemanticSimilarityExampleSelector
)
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

example_selector = SemanticSimilarityExampleSelector.from_examples(
examples=all_examples,      # 上百条示例
embeddings=OpenAIEmbeddings(),
vectorstore_cls=Chroma,
k=3,                        # 每次取最相关的 3 个
)
```

工作原理：

1. 将所有示例的 input 转换为向量
2. 用户输入也转换为向量
3. 计算余弦相似度，选取 Top-K 最接近的示例
4. 将选中的示例注入 Few-Shot Prompt

### 4.5 其他输出解析器

- **CommaSeparatedListOutputParser**：要求 LLM 以逗号分隔列表输出
- **StructuredOutputParser**：要求 LLM 按 JSON Schema 输出
- **PydanticOutputParser**：直接解析为 Pydantic 模型对象

---

### 5. 第四集：Data Connection —— 让 LLM 读懂你的数据

> **视频源**：4.mp4（约 35 分钟）—— Document Loader、Text Splitter、Embedding、Vector Store

这是 LangChain 最重要的模块，也是 RAG（Retrieval-Augmented Generation）的基础设施。

### 5.1 数据连接层全景

LangChain 的数据连接层解决一个核心问题：**LLM 的训练数据截止到某个时间点，且不包含你的私有数据。如何让 LLM 回答关于你私有文档的问题？**

答案就是 RAG 四步走：

”` Step 1: Load → 从各种来源加载文档 Step 2: Split → 将长文档切分为小块 Step 3: Embed → 将文本块转为向量 Step 4: Store → 存入向量数据库，支持语义

### 4.4 Example Selector：示例太多怎么办？

当你积累了数百个高质量示例，全部塞进 prompt 会超出 token 限制。ExampleSelector 自动帮你挑最相关的几个：

```text
from langchain_core.example_selectors import (
SemanticSimilarityExampleSelector
)
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

example_selector = SemanticSimilarityExampleSelector.from_examples(
examples=all_examples,      # 上百条示例
embeddings=OpenAIEmbeddings(),
vectorstore_cls=Chroma,
k=3,                        # 每次取最相关的 3 个
)
```

工作原理：

1. 将所有示例的 input 转换为向量
2. 用户输入也转换为向量
3. 计算余弦相似度，选取 Top-K 最接近的示例
4. 将选中的示例注入 Few-Shot Prompt

### 4.5 其他输出解析器

- **CommaSeparatedListOutputParser**：要求 LLM 以逗号分隔列表输出
- **StructuredOutputParser**：要求 LLM 按 JSON Schema 输出
- **PydanticOutputParser**：直接解析为 Pydantic 模型对象

---

### 5. 第四集：Data Connection —— 让 LLM 读懂你的数据

> **视频源**：4.mp4（约 35 分钟）—— Document Loader、Text Splitter、Embedding、Vector Store

这是 LangChain 最重要的模块，也是 RAG（Retrieval-Augmented Generation）的基础设施。

### 5.1 数据连接层全景

LangChain 的数据连接层解决一个核心问题：**LLM 的训练数据截止到某个时间点，且不包含你的私有数据。如何让 LLM 回答关于你私有文档的问题？**

答案就是 RAG 四步走：

”` Step 1: Load → 从各种来源加载文档 Step 2: Split → 将长文档切分为小块 Step 3: Embed → 将文本块转为向量 Step 4: Store → 存入向量数据库，支持语义础设施。

### 5.1 数据连接层全景

LangChain 的数据连接层解决一个核心问题：**LLM 的训练数据截止到某个时间点，且不包含你的私有数据。如何让 LLM 回答关于你私有文档的问题？**

答案就是 RAG 四步走：

```text
Step 1: Load    → 从各种来源加载文档
Step 2: Split   → 将长文档切分为小块
Step 3: Embed   → 将文本块转为向量
Step 4: Store   → 存入向量数据库，支持语义搜索
```

### 5.2 Document Loaders：万事皆可 Load

LangChain 内置了上百种 Document Loader：

”`python from langchain_community.document_loaders import (

```text
PyPDFLoader,           # PDF 文档
WebBaseLoader,         # 网页 URL
YoutubeLoader,         # YouTube 视频字幕
U
```

### 7.4 Agent 类型对比

| Agent 类型 | 模式 | 适用 |
| --- | --- | --- |
| Zero-shot ReAct | 每步即时决策，不预设计划 | 简单任务 |
| Structured Chat | 支持多参数工具调用 | 复杂工具 |
| OpenAI Functions | 利用 Function Calling API | GPT 模型专属 |
| Plan-and-Execute | 先做计划，再逐步执行 | 多步骤复杂任务 |
| Self-Ask with Search | 自问自答式搜索 | 需要多轮查询 |

### 7.5 Agent 调优

**max_iterations**：限制 Agent 最大轮数，防止陷入死循环（比如反复搜同一个词但搜不到结果）。

**early_stopping_method**：

- `"force"`：达到最大轮数后强制输出当前结果
- `"generate"`：达到最大轮数后让 LLM 基于已有信息生成最佳猜测

**handle_parsing_errors**：LLM 有时输出的格式不符合 Agent 期望（比如忘了写 Action）。开启此选项会重试而不是直接报错。

---

### 8. 第七集：实战 PDF 问答系统

> **视频源**：7.mp4（约 38 分钟）—— 完整 RAG 流程：加载 PDF → 切分 → Embedding → 检索 → 问答

### 8.1 完整代码

```text
# ============================================
# Step 1: 加载 PDF
# ============================================
from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("company_report_2023.pdf")
documents = loader.load()
print(f"加载了 {len(documents)} 页")

# ============================================
# Step 2: 切分文档
# ============================================
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
chunk_size=800,
chunk_overlap=100,
separators=["\n\n", "\n", "。", ".", " ", ""],
)
chunks = text_splitter.split_documents(documents)
print(f"切分为 {len(chunks)} 个文本块")

# ============================================
# Step 3: 生成 Embedding 并存入向量库
# ============================================
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = FAISS.from_documents(chunks, embeddings)

# 持久化（下次不用重新生成 embedding）
vectorstore.save_local("faiss_index")
# 加载：vectorstore = FAISS.load_local("faiss_index", embeddings)

# ============================================
# Step 4: 构建 RAG Chain
# ============================================
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="deepseek-chat", temperature=0)

qa_chain = RetrievalQA.from_chain_type(
llm=llm,
chain_type="stuff",    # 可选 "map_reduce", "refine", "map_rerank"
retriever=vectorstore.as_retriever(search_kwargs={"k": 4}),
return_source_documents=True,  # 返回引用来源
)

# ============================================
# Step 5: 提问
# ============================================
query = "公司 2023 年第四季度的营收是多少？增长了多少？"
result = qa_chain.invoke({"query": query})

print("答案:", result["result"])
print("\n引用来源:")
for doc in result["source_documents"]:
print(f"  - {doc.metadata['source']} (第 {doc.metadata['page']} 页)")
```

### 8.2 技术决策指南

| 技术决策 | 建议 | 原因 |
| --- | --- | --- |
| chunk_size | 500-1000 | 太小语义不完整，太大超出 embedding 模型的上下文 |
| chunk_overlap | chunk_size 的 10-20% | 保证过渡段落在相邻 chunk 中都有覆盖 |
| k 值 | 3-5 | 太少信息不足，太多可能引入噪音 |
| embedding 模型 | text-embedding-3-small | 1536 维，性价比最高 |
| 向量库 | 开发用 FAISS，生产升级 | FAISS 内存中运行，够快但不持久化 |

### 8.3 进阶：使用 LCEL 构建 RAG

LangChain 新推荐的写法——使用 LCEL (LangChain Expression Language) 管道：

```text
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate

# 定义 RAG prompt
template = """基于以下上下文回答问题。如果上下文中没有相关信息，请说"我无法从文档中找到相关信息"。

上下文：
{context}

问题：{question}

答案："""

prompt = ChatPromptTemplate.from_template(template)

# 构建 RAG 管道
rag_chain = (
{"context": vectorstore.as_retriever(), "question": RunnablePassthrough()}
| prompt
| llm
| StrOutputParser()
)

# 使用
answer = rag_chain.invoke("公司未来的战略方向是什么？")
```

---

### 9. 第八集：实战 搜索 Agent 进阶

> **视频源**：8.mp4（约 53 分钟）—— 多工具 Agent、自定义 Tool、错误处理

### 9.1 自定义 Tool

除了内置工具，你可以将任何 Python 函数封装为 Agent 可用的 Tool：

```text
from langchain.agents import tool

@tool
def get_stock_price(symbol: str) -> str:
"""获取指定股票代码的当前价格。输入为股票代码，如 AAPL、TSLA。"""
# 实际应调用股票 API
prices = {"AAPL": "189.30", "TSLA": "242.84", "GOOGL": "177.85"}
return prices.get(symbol.upper(), f"未找到股票代码 {symbol}")

@tool
def get_weather(city: str) -> str:
"""获取指定城市的天气。输入为城市中文名称。"""
# 实际应调用天气 API
weather_data = {
"北京": "晴，25°C",
"上海": "多云，28°C",
"深圳": "阵雨，30°C",
}
return weather_data.get(city, f"暂无{city}的天气数据")

# 添加到 Agent
from langchain.agents import initialize_agent, AgentType

tools = [get_stock_price, get_weather]
agent = initialize_agent(
tools, llm,
agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
verbose=True,
handle_parsing_errors=True,
max_iterations=6,
)

agent.run("苹果股票现在多少钱？北京的天气怎么样？")
```

### 9.2 @tool 装饰器详解

```text
@tool
def my_tool(param: str) -> str:
"""工具的 docstring——这是 Agent 判断何时使用该工具的依据，务必清晰准确。

输入应该详细说明参数格式和期望值。
"""
# 工具实现
return result
```

Agent 根据工具的 **name** 和 **docstring** 来决定调用哪个工具。所以 docstring 不要随便写，要写清楚”什么时候用”和”参数是什么”。

### 9.3 Agent 架构图

```text
┌─────────────────┐
│   用户输入任务    │
└────────┬────────┘
│
┌────────▼────────┐
│  Agent Executor │
│  (ReAct Loop)   │
│                 │
│  Thought ←→ Act │
└────────┬────────┘
│
┌──────────────┼──────────────┐
│              │              │
┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
│  Search   │  │  Calc   │  │  Custom   │
│   API     │  │  Tool   │  │  Tool(s)  │
└───────────┘  └─────────┘  └───────────┘
```

### 9.4 错误处理最佳实践

```text
try:
result = agent.invoke({"input": user_query})
except Exception as e:
# 常见错误：
# - OutputParserException: Agent 输出格式错误
# - AgentTimeoutError: 达到 max_iterations 上限
# - ToolException: 工具调用失败
print(f"Agent 执行失败: {e}")

# 降级策略：直接让 LLM 回答
fallback = llm.invoke(user_query)
print(f"降级回答: {fallback.content}")
```

### 9.5 视频演示的完整交互

视频中完整演示了从加载工具、初始化 Agent、到逐步观察 ReAct 循环的全过程。关键观察点：

1. Agent 根据问题的复杂度自动决定调用次数——简单问题 1 轮，复杂问题可能有 4-5 轮
2. 当工具返回的结果信息量不足时，Agent 会自动追加搜索
3. `verbose=True` 模式让你能清晰看到每一步的 Thought（思考）、Action（行动）、Observation（观察），这是理解和调试 Agent 的最重要方式

---

### 10. 第九集：回顾总结与最佳实践

> **视频源**：9.mp4（约 20 分钟）—— 全系列回顾、架构总结、生产环境建议

### 10.1 LangChain 六大模块全景图

```text
┌─────────────────────────────────────────────────────────┐
│                     LangChain 框架                        │
├─────────────┬─────────────┬────────────┬────────────────┤
│  Model I/O  │    Data     │   Chains   │    Memory      │
│             │ Connection  │            │                │
│ Prompt      │ Loader      │ LLMChain   │ Buffer         │
│ Template    │ Splitter    │ Sequential │ Summary        │
│ LLM/Emed    │ Embedding   │ Router     │ Window         │
│ Parser      │ VectorStore │ RetrievalQA│ Entity         │
├─────────────┴─────────────┼────────────┼────────────────┤
│         Agents            │  Callbacks │   安全 & 评测   │
│ ReAct | Plan-Execute      │  LangSmith │  Guardrails    │
│ OpenAI Functions | Custom │  监控/调试  │   Chains      │
└───────────────────────────┴────────────┴────────────────┘
```

### 10.2 技术选型决策树

```text
需要做什么？
├─ 简单问答 → LLMChain + PromptTemplate
├─ 问答私有文档 → RAG = Loader + Splitter + Embedding + VectorStore + RetrievalQA
├─ 多步骤任务（固定流程） → SequentialChain
├─ 需要 LLM 自主决策 → Agent (ReAct)
├─ 需要记忆 → 加上 ConversationBufferMemory
└─ 需要调用外部 API → 封装为 Tool，交给 Agent
```

### 10.3 生产环境注意事项

**安全**：

- 永远不要在 prompt 中暴露 API Key
- Agent 的工具调用可能带来风险（如执行任意代码、写入文件），需要沙箱隔离
- 对用户输入做敏感词过滤

**性能**：

- Embedding 结果可以缓存，减少重复 API 调用
- 向量库选择持久化的（Chroma/Pinecone），避免每次重启重建
- `map_reduce` 链可以并行执行多个 chunk 的 LLM 调用

**成本控制**：

- 先用 cheap 模型（GPT-3.5/DeepSeek）验证，再换强模型
- `temperature=0` 的任务可以用缓存
- 限制 `max_iterations` 防止 Agent 失控烧钱

**可观测性**：

- 使用 LangSmith 追踪完整调用链
- 记录每个 Step 的 token 消耗
- 对 Agent 的输出做自动化评估

### 10.4 与两年前的差异

本系列视频录制于约两年前。以下是最重要的 API 变化：

| 旧 API | 新 API | 说明 |
| --- | --- | --- |
| from langchain.llms import OpenAI | from langchain_openai import ChatOpenAI | 独立包 |
| from langchain.embeddings import OpenAIEmbeddings | from langchain_openai import OpenAIEmbeddings | 独立包 |
| llm.predict("text") | llm.invoke([HumanMessage("text")]) | Messages 接口 |
| Chain.run(input) | Chain.invoke({"key": value}) | 字典化参数 |
| from langchain.vectorstores import FAISS | from langchain_community.vectorstores import FAISS | 移至 community |

---

### 11. 附录：API 迁移指南与常见问题

### 11.1 迁移脚本示例

如果你的代码还在用旧 API，这是一个快速迁移模板：

```text
# ===== 旧写法 =====
# from langchain.llms import OpenAI
# llm = OpenAI(temperature=0.7)
# result = llm("Hello")

# ===== 新写法 =====
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
result = llm.invoke([HumanMessage(content="Hello")])
print(result.content)
```

### 11.2 常见错误排查

| 错误 | 原因 | 解决 |
| --- | --- | --- |
| ModuleNotFoundError: langchain.llms | 旧版 API 已移除 | 改用 langchain-openai |
| No module named 'dotenv' | 未安装 python-dotenv | pip install python-dotenv |
| jupyter-lab 命令找不到 | Scripts 不在 PATH | 添加 C:\Python314\Scripts 到 PATH |
| DeepSeek 返回 401 | API Key 错误或余额不足 | 检查 .env 文件 |
| Agent 陷入循环 | 工具返回不明确 | 优化工具的 docstring |
| FAISS 内存溢出 | 向量数据太大 | 换用 Chroma/Pinecone |

### 11.3 推荐学习路径

1. **第 1 周**：跑通 Hello World，理解 ChatOpenAI 的基本用法
2. **第 2 周**：掌握 PromptTemplate + FewShot，尝试各种 prompt 技巧
3. **第 3 周**：实现一个完整的 RAG 应用（PDF 问答）
4. **第 4 周**：把 RAG 升级为 Agent，加入搜索和自定义工具
5. **持续**：关注 LangChain 官方文档和 LangSmith 的新功能

---

### 后记

这套视频虽然是两年前录制的，但 LangChain 的核心设计思想——**模块化、可组合、工程化**——没有变。变的只是包名和 API 签名，理解底层原理后，迁移只是改几行 import 的事。

LangChain 最有价值的不是它的代码，而是它提出的”用搭积木的方式构建 LLM 应用”这一范式。理解了 PromptTemplate、Chain、Agent、RAG 这些概念，即使将来 LangChain 本身被取代，你的知识也不会过时。

---

> **声明**：本文代码示例已适配 LangChain 最新 API（2025-2026），部分早期 API 在最新版本中已不可用，请以本文代码为准。图片来自原教程视频截图，仅供学习参考。
