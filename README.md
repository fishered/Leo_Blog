# Leo's Blog

一个温馨、轻量的个人技术博客。Markdown 是唯一内容源，由 Astro 构建并自动发布到 GitHub Pages。

站点名称、作者、签名、公告和 GitHub 地址集中在 `src/config.ts`，第一次发布前可统一修改。

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

## 发布一篇文章

在 `src/content/posts` 中新建目录和 `index.md`：

```text
src/content/posts/my-new-post/
├── index.md
└── image.webp
```

Frontmatter 模板：

```yaml
---
title: "文章标题"
description: "用于列表和搜索引擎的简短摘要"
published: 2026-07-24
updated: 2026-07-24
slug: article-url-slug
tags:
  - Java
  - 工程实践
series: 系列名称
draft: false
featured: false
source:
  platform: 知乎
  url: https://www.zhihu.com/...
  published: 2021-03-16
---
```

`draft: true` 的文章不会进入网站、RSS 或搜索索引。将文件提交到 `main` 分支后，GitHub Actions 会自动构建并发布。

## GitHub Pages 设置

1. 在 GitHub 创建仓库并推送本目录。
2. 打开仓库的 **Settings → Pages**。
3. 将 **Source** 设为 **GitHub Actions**。
4. 推送到 `main`，等待 `Deploy blog to GitHub Pages` 工作流完成。

工作流会自动判断这是 `username.github.io` 用户站点还是普通项目站点，并配置正确的路径。

RSS 的公开订阅地址会随 GitHub Pages 地址一起生成，例如本仓库默认是：

```text
https://fishered.github.io/Leo_Blog/rss.xml
```

将这个地址添加到 Feedly、Inoreader、NetNewsWire 等 RSS 阅读器即可。GitHub 的 Follow 关注的是账号动态，不能替代博客文章订阅。

## 视觉资源

开发者书房横幅是本项目的原创资源，没有引用博客园主题或其他站点的图片、字体和脚本：

- 网站使用：`public/images/leo-study-hero-v2.png`
- 可编辑源稿：`design/leo-study-hero-v2.svg`
- 本地渲染脚本：`scripts/render_assets.py`

需要调整插画时，先编辑 SVG，再运行：

```bash
python scripts/render_assets.py
```

文章自己的图片建议和文章放在同一目录，通过相对路径引用。这样 Markdown、图片和迁移来源可以一起维护。

桌面增强功能集中在 `src/components/DesktopWidgets.astro`：

- 使用 `L2Dwidget` 渲染 Hijiki 黑猫，模型、纹理和动作全部位于 `public/vendor/live2d/hijiki`
- 使用 `APlayer + Meting` 加载网易云歌单 `3116636104`
- 网络歌单加载后会随机排列；网络暂时不可用时，回退到 `public/audio` 中四首随机排列的本地原创循环音乐
- 仅当页面初始宽度大于 1000px 时加载，移动端不会下载播放器和 Live2D 脚本

相关第三方运行库均保存在 `public/vendor`，不热链博客园文件。浏览器不会自动播放音乐，访客需要主动点击播放按钮。

## 内容能力

- Markdown / MDX 内容集合与字段校验
- 文章、标签、专题和时间归档
- Pagefind 静态全文搜索
- RSS、Sitemap、SEO 和 Open Graph 元数据
- 深色模式、桌面悬浮工具栏与移动端底部导航
- 旧平台来源和修订轨迹
- 所有生产图片与图标均由仓库本地托管
