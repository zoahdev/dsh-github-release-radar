# dsh-github-release-radar

[English](#english) ? [??](#??)

GitHub Release Radar is a plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) that gives your agent three model-facing tools over the public GitHub REST API ? no API key required.

> Topic: [`dsh-plugin`](https://github.com/topics/dsh-plugin) ? Tested with `dsh` 0.1.0-rc.6

## Tools

| Tool | What it does |
|---|---|
| `github_releases` | List the most recent releases of a public repository (tag, date, pre-release flag, URL, body preview). |
| `github_repo` | Repository overview: stars, forks, open issues, language, license, last update. |
| `github_search` | Search public repositories with GitHub search syntax, sorted by stars or last update. |

Example agent prompts:

- ?What are the latest releases of `deepseek-ai/deepseek-harness`??
- ?Compare the stars and licenses of the top 5 TypeScript agent frameworks.?
- ?Has `ollama/ollama` published a stable release recently??

## Install

Prerequisite: `dsh` CLI 0.1.0-rc.6+ ([install guide](https://github.com/deepseek-ai/deepseek-harness#readme)).

### From GitHub

```sh
dsh plugin --profile web add github:zoahdev/dsh-github-release-radar
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
pnpm run build      # tsc ? lib/
pnpm test           # vitest
pnpm pack           # npm tarball for dsh plugin add
```

See [VERIFICATION.md](./VERIFICATION.md) for the recorded build/test/boot checks.

## License

MIT ? 2026 zoahdev

---

## ??

**dsh-github-release-radar?GitHub Release ???** ? [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) ???????? GitHub ?? REST API ? agent ???????????????????? API Key?

> ?????[`dsh-plugin`](https://github.com/topics/dsh-plugin) ? ?? `dsh` 0.1.0-rc.6 ??

## ??

| ?? | ?? |
|---|---|
| `github_releases` | ????????? Release?????????????????????? |
| `github_repo` | ????????fork?open issues??????????????? |
| `github_search` | ? GitHub ????????????????????? |

?????

- ?deepseek-ai/deepseek-harness ???????????
- ?????? 5 ? TypeScript agent ???????????
- ?ollama/ollama ???????????

## ??

???`dsh` CLI 0.1.0-rc.6+?[????](https://github.com/deepseek-ai/deepseek-harness#readme)??

```sh
# ? GitHub ??
dsh plugin --profile web add github:zoahdev/dsh-github-release-radar

# ?? npm / tarball ??
dsh plugin --profile web add dsh-github-release-radar
dsh plugin --profile web add ./dsh-github-release-radar-0.1.0.tgz
```

??? git ???????????`dsh` ????? profile ? `pnpm-workspace.yaml` ??????????? `dsh web`?

## ??

??????? `cordis.yml`?

| ??? | ?? | ??? | ?? |
|---|---|---|---|
| `githubToken` | string | ? | GitHub token?????? 60 ?/?????????????? |
| `timeoutMs` | number | `10000` | ????????? |
| `defaultLimit` | number | `5` | ???? `limit` ????????? |
| `bodyPreviewChars` | number | `500` | Release ?????????? |
| `userAgent` | string | `dsh-github-release-radar/0.1.0` | ?? GitHub API ? User-Agent? |

## ??

```sh
pnpm install
pnpm run build      # tsc ? lib/
pnpm test           # vitest
pnpm pack           # ?? tarball ? dsh plugin add ??
```

??/??/??????? [VERIFICATION.md](./VERIFICATION.md)?

## ???

MIT ? 2026 zoahdev
