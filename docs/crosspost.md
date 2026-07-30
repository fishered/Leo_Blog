# 文章同步说明

这套脚本用于把 `src/content/posts` 里的 Markdown 文章同步到多个平台，并尽量保持原文结构、图片和标题一致。

## 同步规则

- 中文平台读取 `index.md`：掘金、CSDN、博客园、知乎。
- `dev.to` 读取 `en.md`。
- 默认跳过 `draft: true` 的文章。
- 永久排除这两个文章，不参与任何平台同步：
  - `markdown-writing-guide`
  - `building-my-digital-garden`
- 如果文章的 `source.platform` 已经是目标平台，也会自动跳过。
- 如果目标平台已存在同标题文章，也会跳过。

## 图片处理方式

图片现在统一走免费公开 CDN，不再依赖各平台编辑器的本地图片上传控件。

默认 CDN 地址会根据 Git remote 自动生成，例如当前仓库会使用：

```bash
https://cdn.jsdelivr.net/gh/fishered/Leo_Blog@main
```

所以 Markdown 里的本地图片：

```markdown
![示例](./assets/example.png)
```

发布时会被转换成类似这样的公开地址：

```text
https://cdn.jsdelivr.net/gh/fishered/Leo_Blog@main/src/content/posts/文章slug/assets/example.png
```

知乎会粘贴富文本 HTML，图片直接使用这些公开 CDN 地址；掘金、CSDN、博客园、dev.to 会粘贴 Markdown，也会使用同一批公开图片地址。

如果你想换成其他图片 CDN，可以加：

```bash
--image-base-url https://你的公开图片空间
```

## 使用前准备

先安装浏览器自动化依赖：

```bash
npm install -D playwright-core
```

再构建站点，让脚本可以提取文章 HTML：

```bash
npm run build
```

## 登录一次

脚本会复用本地 Chrome 配置。先打开目标平台并手动登录一次：

```bash
npm run sync:login -- --platform zhihu
```

登录完成后直接关闭命令即可，登录态会保存在 `.crosspost/chrome-profile`。

## 校验文章

先检查文章是否能同步：

```bash
npm run sync:check -- --platform zhihu --site-url https://fishered.github.io/Leo_Blog
```

建议发布前加远程图片校验：

```bash
npm run sync:check -- --platform zhihu --site-url https://fishered.github.io/Leo_Blog --verify-remote-assets
```

## 查看计划

先看看会同步哪些文章：

```bash
npm run sync:plan -- --platform cnblogs --site-url https://fishered.github.io/Leo_Blog
```

常用过滤：

```bash
npm run sync:plan -- --platform devto --slug firefly-production-grade-scheduling
npm run sync:plan -- --platform zhihu --allow-mojibake
```

## 正式发布

单篇试发，脚本会填好标题和正文，但停在发布前给你人工检查：

```bash
npm run sync:publish -- --platform zhihu --slug firefly-production-grade-scheduling --site-url https://fishered.github.io/Leo_Blog --limit 1
```

如果你想让脚本自动点发布按钮，可以加 `--yes`：

```bash
npm run sync:publish -- --platform devto --slug firefly-production-grade-scheduling --site-url https://fishered.github.io/Leo_Blog --yes
```

`--yes` 建议谨慎使用，因为各平台最后一步的分类、标签、封面和确认弹窗可能会变。

## 常用平台

```bash
npm run sync:publish -- --platform juejin --site-url https://fishered.github.io/Leo_Blog
npm run sync:publish -- --platform csdn --site-url https://fishered.github.io/Leo_Blog
npm run sync:publish -- --platform cnblogs --site-url https://fishered.github.io/Leo_Blog
npm run sync:publish -- --platform zhihu --site-url https://fishered.github.io/Leo_Blog
npm run sync:publish -- --platform devto --site-url https://fishered.github.io/Leo_Blog
```

## 备注

- `--site-url` 用于生成原文链接和读取构建后的文章 HTML。
- `--image-base-url` 用于生成正文图片链接；默认自动使用 jsDelivr + GitHub 仓库。
- 如果平台编辑器改版，选择器需要在 `scripts/crosspost/platforms.mjs` 里调整。
