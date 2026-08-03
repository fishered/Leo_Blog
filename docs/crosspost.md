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

PowerShell 如果提示禁止执行 `npm.ps1`，把命令中的 `npm` 改成 `npm.cmd`。

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

## 单篇同步到知乎、掘金、博客园

以 `firefly-boundary-governance` 为例，完整流程如下：

```bash
npm run build

npm run sync:login -- --platform zhihu
npm run sync:login -- --platform juejin
npm run sync:login -- --platform cnblogs

npm run sync:plan -- --platform zhihu --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog
npm run sync:plan -- --platform juejin --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog
npm run sync:plan -- --platform cnblogs --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog

npm run sync:check -- --platform zhihu --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog
npm run sync:check -- --platform juejin --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog
npm run sync:check -- --platform cnblogs --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog

npm run sync:publish -- --platform zhihu --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog --limit 1
npm run sync:publish -- --platform juejin --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog --limit 1
npm run sync:publish -- --platform cnblogs --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog --limit 1
```

掘金第一次使用必须登录到脚本自己的 Chrome 会话中，不能只登录普通 Chrome：

```bash
npm run sync:login -- --platform juejin
```

登录完成后按 `Ctrl+C` 结束登录命令，再重新运行掘金的 `sync:plan`、`sync:check` 和 `sync:publish`。

掘金编辑器如果页面结构变化，脚本会先使用精确选择器，失败后再点击固定的标题和正文区域，并检查标题、正文是否真的填入。没有填入时会直接报错，不会再静默留下空白草稿页。

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

## 知乎图片说明

知乎对 SVG 和部分远程图片转存不稳定，容易在编辑器里显示“上传失败/重试”。

脚本已经对知乎做了特殊处理：发布到知乎时，本地图片会直接内嵌到粘贴内容里；如果原图是 SVG，会先自动转成 PNG，再交给知乎编辑器上传。你仍然使用同一条发布命令即可：

```bash
npm run sync:publish -- --platform zhihu --slug firefly-boundary-governance --site-url https://fishered.github.io/Leo_Blog --limit 1
```

如果当前页面已经出现失败占位，建议关闭这篇草稿页面，重新运行上面的发布命令生成一份新的草稿。

## 自动跳过规则

脚本会自动跳过：

- `draft: true`
- `markdown-writing-guide`
- `building-my-digital-garden`
- `source.platform` 已经等于目标平台的文章
- 本地状态或目标平台判断为同标题重复的文章

dev.to 的重复判断使用 Dashboard，不再使用全站搜索。
