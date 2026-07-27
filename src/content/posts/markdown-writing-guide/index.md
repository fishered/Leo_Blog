---
title: "这套博客的 Markdown 写作约定"
description: "一份可以直接复制使用的写作模板，包括标题结构、代码、图片、草稿和旧文迁移规则。"
published: 2026-07-23
updated: 2026-07-24
slug: markdown-writing-guide
tags:
  - "Blog"
series: 建站手记
draft: true
featured: true
source:
  platform: dev.to
  url: https://dev.to/
  published: 2024-05-18
---

一篇文章由两部分组成：开头的 Frontmatter 保存结构化信息，后面的 Markdown 保存正文。统一这些约定，可以减少迁移和维护成本。

## 文件放在哪里

每篇文章使用一个独立目录：

```text
src/content/posts/
└── my-article/
    ├── index.md
    ├── cover.webp
    └── diagram.svg
```

图片和文章放在一起。删除或移动文章时，相关资源不会被遗忘。

## 标题如何组织

文章标题来自 Frontmatter，因此正文直接从二级标题开始。一篇文章的标题层级应该连续：

- `##` 表示主要章节。
- `###` 表示章节中的子问题。
- 不要仅仅为了让字体变小而使用更深的标题。

## 代码和说明

代码块应当标记语言，这样构建时才能正确高亮：

```java
public final class Note {
    public static void main(String[] args) {
        System.out.println("Write it down.");
    }
}
```

代码前说明它解决什么问题，代码后说明值得注意的限制。不要让读者仅凭一段代码猜测上下文。

## 草稿与发布

尚未完成的文章设置：

```yaml
draft: true
```

构建时草稿不会出现在首页、归档、标签、RSS 或搜索结果中。完成后改为 `false` 并推送即可发布。

## 迁移旧文章

从其他平台迁移时，增加 `source`：

```yaml
source:
  platform: 知乎
  url: https://www.zhihu.com/...
  published: 2021-03-16
```

文章页会自动生成发布轨迹，让原始版本和后续修订之间的关系保持透明。

