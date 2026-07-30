# 多平台同步简易说明

脚本统一放在 `scripts/crosspost/` 目录下，用于把博客文章同步到外部平台。

## 当前启用平台

- 知乎：发布中文 `index.md`
- 掘金：发布中文 `index.md`
- 博客园：发布中文 `index.md`
- dev.to：发布英文 `en.md`

CSDN 已放弃，不再出现在平台配置和快捷命令里。

## 基本流程

先确保文章和图片已经推到 GitHub，因为图片使用 jsDelivr 读取仓库源文件。

```bash
git status
git push
```

构建博客：

```bash
npm run build
```

每个平台第一次使用前先登录一次：

```bash
npm run sync:login -- --platform zhihu
npm run sync:login -- --platform juejin
npm run sync:login -- --platform cnblogs
npm run sync:login -- --platform devto
```

## 查看计划

```bash
npm run sync:plan -- --platform zhihu --site-url https://fishered.github.io/Leo_Blog
npm run sync:plan -- --platform juejin --site-url https://fishered.github.io/Leo_Blog
npm run sync:plan -- --platform cnblogs --site-url https://fishered.github.io/Leo_Blog
npm run sync:plan -- --platform devto --site-url https://fishered.github.io/Leo_Blog
```

## 发布

建议先小批量发布，不加 `--yes`，让脚本填好内容后人工检查。

```bash
npm run sync:publish -- --platform zhihu --site-url https://fishered.github.io/Leo_Blog --limit 3
npm run sync:publish -- --platform juejin --site-url https://fishered.github.io/Leo_Blog --limit 3
npm run sync:publish -- --platform cnblogs --site-url https://fishered.github.io/Leo_Blog --limit 3
npm run sync:publish -- --platform devto --site-url https://fishered.github.io/Leo_Blog --limit 3
```

只发某一篇：

```bash
npm run sync:publish -- --platform devto --slug firefly-production-grade-scheduling --site-url https://fishered.github.io/Leo_Blog --limit 1
```

## 校验

普通校验：

```bash
npm run sync:check -- --platform devto --site-url https://fishered.github.io/Leo_Blog
```

严格图片校验：

```bash
npm run sync:check -- --platform devto --site-url https://fishered.github.io/Leo_Blog --verify-remote-assets
```

严格图片校验依赖 jsDelivr 和网络状态，偶发失败时可以稍后重试。

## 自动跳过规则

脚本会自动跳过：

- `draft: true`
- `markdown-writing-guide`
- `building-my-digital-garden`
- `source.platform` 已经等于目标平台的文章
- 本地状态或目标平台判断为同标题重复的文章

dev.to 的重复判断使用 Dashboard，不再使用全站搜索。
