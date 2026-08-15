# dsh-github-release-radar — 设计说明

## 为什么做这个插件

DeepSeek Harness 开源 48 小时内星标暴涨，但社区插件生态几乎空白。要"被看见"，
插件需要满足三个条件：

1. **无需 API key 即可用**——降低试用门槛，人人可跑。
2. **面向开发者社区**——dsh 的用户本身就是开发者，GitHub 数据天然有吸引力。
3. **可演示、可截图**——agent 一句"看看 llama.cpp 最近发布了什么"就能出效果。

GitHub 公开 REST API 匿名可用（60 次/小时），完美满足以上条件。

## 功能范围（YAGNI）

- `github_releases`：列出某仓库最近 Release（tag、名称、时间、prerelease、正文预览）。
- `github_repo`：仓库概览（星标、fork、issues、语言、许可证、更新时间）。
- `github_search`：按关键词搜索仓库，默认按星标排序。

不做的：提交 issue/PR、写评论（需要用户授权且风险高）、star 历史图（需要多次请求，
容易撞匿名限流）。

## 技术要点

- 遵循官方"一切皆插件"模式：`name` + `inject: ['tools']` + `apply(ctx)`。
- 用 `defineTool` 声明工具：schema 驱动参数校验与模型可见描述，`output.render`
  负责模型可读文本，`presentCall` 负责 UI 卡片。
- 所有 HTTP 请求支持 `exec.signal` 取消 + 可配置超时。
- 配置项（token、timeout、默认条数）全部走 schemastery Config，不在代码里写死。
- 匿名限流（403 + x-ratelimit-remaining: 0）给出明确错误提示，引导用户配置 token。

## 发布形态

遵循官方 publish 指南：npm 包 + `dsh.bundle` manifest + `cordis.patch.yml`，
用户可用 `dsh plugin add` 安装；`prepare` 脚本让 git 源安装也能直接构建。
