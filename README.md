# dsh-github-release-radar

[English](#english) · [中文](#中文)

GitHub Release Radar is a plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) that gives your agent three model-facing tools over the public GitHub REST API — no API key required.

> Topic: [`dsh-plugin`](https://github.com/topics/dsh-plugin) · Tested with `dsh` 0.1.0-rc.6

## Tools

| Tool | What it does |
|---|---|
| `github_releases` | List the most recent releases of a public repository (tag, date, pre-release flag, URL, body preview). |
| `github_repo` | Repository overview: stars, forks, open issues, language, license, last update. |
| `github_search` | Search public repositories with GitHub search syntax, sorted by stars or last update. |

Example agent prompts:

- “What are the latest releases of `deepseek-ai/deepseek-harness`?”
- “Compare the stars and licenses of the top 5 TypeScript agent frameworks.”
- “Has `ollama/ollama` published a stable release recently?”

## Install

Prerequisite: `dsh` CLI 0.1.0-rc.6+ ([install guide](https://github.com/deepseek-ai/deepseek-harness#readme)).

### From GitHub

```sh
dsh plugin --profile web add github:bahuang081-svg/dsh-github-release-radar
```

First-time git installs require an allow-build entry; `dsh` will print the exact line to add to your profile's `pnpm-workspace.yaml` (see the official publishing guide for details).

### From npm / tarball

```sh
dsh plugin --profile web add dsh-github-release-radar
# or
dsh plugin --profile web add ./dsh-github-release-radar-0.1.0.tgz
```

Then restart `dsh web`.

### Local development (patch overlay)

```yaml
# cordis.patch.yml
- insert:
    - id: github-release-radar
      name: dsh-github-release-radar
      config:
        defaultLimit: 5
```

```sh
dsh web --patch ./cordis.patch.yml
```

## Configuration

All values are optional and can be set in `cordis.yml`:

| Key | Type | Default | Description |
|---|---|---|---|
| `githubToken` | string | *(none)* | GitHub token to raise the anonymous 60 requests/hour rate limit. Never commit it. |
| `timeoutMs` | number | `10000` | Request timeout in milliseconds. |
| `defaultLimit` | number | `5` | Default result count when the model omits `limit`. |
| `bodyPreviewChars` | number | `500` | Maximum characters kept from a release body preview. |
| `userAgent` | string | `dsh-github-release-radar/0.1.0` | User-Agent header sent to the GitHub API. |

Example:

```yaml
- insert:
    - id: github-release-radar
      name: dsh-github-release-radar
      config:
        githubToken: ghp_xxx
        defaultLimit: 10
        timeoutMs: 15000
```

## Design notes

- Everything is a plugin: the bundle contributes a `cordis.patch.yml` layer and registers tools through `ctx.tools.register` + `defineTool`.
- Requests honor `exec.signal` cancellation and a configurable timeout.
- Anonymous rate limits are detected (`403` + `x-ratelimit-remaining: 0`) and surfaced with actionable guidance.
- Canonical JSON outputs are schema-validated; model-facing prose lives in `output.render`, UI cards in `presentCall`.

## Development

```sh
pnpm install
pnpm run build      # tsc → lib/
pnpm test           # vitest
pnpm pack           # npm tarball for dsh plugin add
```

See [VERIFICATION.md](./VERIFICATION.md) for the recorded build/test/boot checks.

## License

MIT © 2026 bahuang081-svg

---

## 中文

**dsh-github-release-radar（GitHub Release 雷达）** 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的社区插件，通过 GitHub 公开 REST API 给 agent 提供三个模型可直接调用的工具——无需任何 API Key。

> 话题标签：[`dsh-plugin`](https://github.com/topics/dsh-plugin) · 已在 `dsh` 0.1.0-rc.6 实测

## 工具

| 工具 | 功能 |
|---|---|
| `github_releases` | 列出公开仓库最近的 Release（标签、日期、预发布标记、链接、正文预览）。 |
| `github_repo` | 仓库概览：星标、fork、open issues、语言、许可证、最近更新时间。 |
| `github_search` | 用 GitHub 搜索语法搜公开仓库，按星标或最近更新排序。 |

示例提问：

- “deepseek-ai/deepseek-harness 最近发布了什么版本？”
- “对比排名前 5 的 TypeScript agent 框架的星标和许可证。”
- “ollama/ollama 最近有稳定版发布吗？”

## 安装

前置：`dsh` CLI 0.1.0-rc.6+（[安装教程](https://github.com/deepseek-ai/deepseek-harness#readme)）。

```sh
# 从 GitHub 安装
dsh plugin --profile web add github:bahuang081-svg/dsh-github-release-radar

# 或从 npm / tarball 安装
dsh plugin --profile web add dsh-github-release-radar
dsh plugin --profile web add ./dsh-github-release-radar-0.1.0.tgz
```

首次从 git 安装需要允许构建脚本（`dsh` 会提示你向 profile 的 `pnpm-workspace.yaml` 添加哪一行）。装完重启 `dsh web`。

## 配置

全部可选，写入 `cordis.yml`：

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `githubToken` | string | 无 | GitHub token，可提高匿名 60 次/小时的限流；切勿提交到仓库。 |
| `timeoutMs` | number | `10000` | 请求超时（毫秒）。 |
| `defaultLimit` | number | `5` | 模型未传 `limit` 时的默认返回条数。 |
| `bodyPreviewChars` | number | `500` | Release 正文预览最大字符数。 |
| `userAgent` | string | `dsh-github-release-radar/0.1.0` | 请求 GitHub API 的 User-Agent。 |

## 开发

```sh
pnpm install
pnpm run build      # tsc → lib/
pnpm test           # vitest
pnpm pack           # 打包 tarball 供 dsh plugin add 安装
```

构建/测试/启动验证记录见 [VERIFICATION.md](./VERIFICATION.md)。

## 许可证

MIT © 2026 bahuang081-svg
