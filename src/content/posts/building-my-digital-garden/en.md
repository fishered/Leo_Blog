---
title: "Why I Rebuilt an Independent Blog"
description: "A practical note on rebuilding a personal technical blog around Markdown, GitHub, local assets, and long-term ownership."
lang: en
translationKey: "building-my-digital-garden"
published: 2026-07-24
updated: 2026-07-24
slug: building-my-digital-garden
tags:
  - "Blog"
series: "Site Notes"
draft: true
featured: true
---

> Summary: This article explains why an independent blog is more than a visual site: it is a durable knowledge system where Markdown remains the source of truth and GitHub becomes the publishing backbone.

## Intended Reader

Engineers who have written across multiple platforms and now want a stable personal knowledge base.

## Why This Matters

A personal technical blog is also an engineering system: content format, asset ownership, routing, search, and migration all affect whether knowledge can survive platform changes.

The core decision is to make the repository the canonical home of the content. The website should enhance reading, search, and navigation, but the Markdown files and local assets must remain portable.

## Mental Model

Markdown-first publishing keeps content portable while still allowing a polished reading experience on GitHub Pages.

The practical way to read this article is to look for the boundary it clarifies: what state exists, who owns it, which operation changes it, and what evidence proves the system behaved as expected.

## Implementation Walkthrough

- Keep every article readable as plain Markdown before thinking about page effects.
- Store migrated images next to the post so the article does not depend on an external platform CDN.
- Use frontmatter for title, publication date, topic, source URL, language, and translation identity.
- Treat routing and RSS as long-term interfaces, because old links and subscribers are part of the knowledge system.

## Pitfalls and Tradeoffs

- A custom blog requires more maintenance than a hosted writing platform, but it avoids platform lock-in.
- A warm visual design is valuable only when it does not hide navigation, search, and reading clarity.
- Automated migration can move the archive quickly, but important posts still deserve editorial cleanup.

## Verification Checklist

- Open the Markdown file directly and confirm that the article still makes sense without Astro.
- Build the site locally and verify post routes, images, search, RSS, and language switching.
- Check that future posts can be added by creating a new Markdown file, not by editing layout code.

## Practical Takeaways

- Keep source Markdown readable without depending on one platform.
- Store images locally so posts remain stable after migration.
- Use clear frontmatter for title, date, topic, language, and source.
- Treat the blog as a long-term knowledge base, not only a visual site.

## Source Notes

- Topic: Blog
- Original source: personal blog
- Original publication date: available in the article metadata
- This English edition is localized from the migrated article metadata, source structure, technical terms, local assets, and clean implementation evidence.

## Closing Thoughts

The goal of this English edition is not to imitate the original wording sentence by sentence. It preserves the engineering argument, removes migration noise, and presents the article as a publishable technical note that future readers can use for design, debugging, or implementation review.
