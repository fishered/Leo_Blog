---
title: "Markdown Writing Conventions for This Blog"
description: "A writing convention for keeping technical posts consistent, portable, searchable, and easy to migrate."
lang: en
translationKey: "markdown-writing-guide"
published: 2026-07-23
updated: 2026-07-24
slug: markdown-writing-guide
tags:
  - "Blog"
series: "Site Notes"
draft: true
featured: true
source:
  platform: dev.to
  url: https://dev.to/
  published: 2024-05-18
---

> Summary: The article defines how posts should be structured so the blog remains comfortable to write in and safe to rebuild later.

## Intended Reader

The future maintainer of the blog, including the author six months from now.

## Why This Matters

A personal technical blog is also an engineering system: content format, asset ownership, routing, search, and migration all affect whether knowledge can survive platform changes.

Good conventions reduce future migration cost. A post should have predictable frontmatter, clear headings, stable image paths, and code blocks that render correctly on GitHub and the generated site.

## Mental Model

Markdown-first publishing keeps content portable while still allowing a polished reading experience on GitHub Pages.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Use one folder per article when the post owns images or diagrams.
- Keep the title hierarchy simple: one article title, then meaningful second-level sections.
- Use fenced code blocks with accurate language identifiers such as `java`, `sql`, `bash`, or `text`.
- Separate drafts from published posts through metadata instead of moving files around.

## Pitfalls and Tradeoffs

- Too many rules make writing feel heavy; too few rules make migration and search messy.
- Pretty Markdown tricks should be avoided if they do not render consistently across platforms.
- Images should have local paths even when the original article used hosted URLs.

## Verification Checklist

- Run the local build before publishing.
- Check that search indexes the title, description, and meaningful body text.
- Open both Chinese and English routes when the post has translations.

## Practical Takeaways

- Keep source Markdown readable without depending on one platform.
- Store images locally so posts remain stable after migration.
- Use clear frontmatter for title, date, topic, language, and source.
- Treat the blog as a long-term knowledge base, not only a visual site.

## Selected Technical Snippets

The following snippets are preserved only when they are safe to publish in English without broken encoding or translated identifiers.

```text
src/content/posts/
└── my-article/
    ├── index.md
    ├── cover.webp
    └── diagram.svg
```

```java
public final class Note {
    public static void main(String[] args) {
        System.out.println("Write it down.");
    }
}
```

```yaml
draft: true
```

## Source Notes

- Topic: Blog
- [Original source](https://dev.to/)
- Original publication date: 2024-05-18
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
