# dsh-github-release-radar

[English](#english) 路 [涓枃](#涓枃)

GitHub Release Radar is a plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) that gives your agent three model-facing tools over the public GitHub REST API 鈥?no API key required.

> Topic: [`dsh-plugin`](https://github.com/topics/dsh-plugin) 路 Tested with `dsh` 0.1.0-rc.6

## Tools

| Tool | What it does |
|---|---|
| `github_releases` | List the most recent releases of a public repository (tag, date, pre-release flag, URL, body preview). |
| `github_repo` | Repository overview: stars, forks, open issues, language, license, last update. |
| `github_search` | Search public repositories with GitHub search syntax, sorted by stars or last update. |

Example agent prompts:

- 鈥淲hat are the latest releases of `deepseek-ai/deepseek-harness`?鈥?- 鈥淐ompare the stars and licenses of the top 5 TypeScript agent frameworks.鈥?- 鈥淗as `ollama/ollama` published a stable release recently?鈥?
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
pnpm run build      # tsc 鈫?lib/
pnpm test           # vitest
pnpm pack           # npm tarball for dsh plugin add
```

See [VERIFICATION.md](./VERIFICATION.md) for the recorded build/test/boot checks.

## License

MIT 漏 2026 zoahdev

---

## 涓枃

**dsh-github-release-radar锛圙itHub Release 闆疯揪锛?* 鏄?[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 鐨勭ぞ鍖烘彃浠讹紝閫氳繃 GitHub 鍏紑 REST API 缁?agent 鎻愪緵涓変釜妯″瀷鍙洿鎺ヨ皟鐢ㄧ殑宸ュ叿鈥斺€旀棤闇€浠讳綍 API Key銆?
> 璇濋鏍囩锛歔`dsh-plugin`](https://github.com/topics/dsh-plugin) 路 宸插湪 `dsh` 0.1.0-rc.6 瀹炴祴

## 宸ュ叿

| 宸ュ叿 | 鍔熻兘 |
|---|---|
| `github_releases` | 鍒楀嚭鍏紑浠撳簱鏈€杩戠殑 Release锛堟爣绛俱€佹棩鏈熴€侀鍙戝竷鏍囪銆侀摼鎺ャ€佹鏂囬瑙堬級銆?|
| `github_repo` | 浠撳簱姒傝锛氭槦鏍囥€乫ork銆乷pen issues銆佽瑷€銆佽鍙瘉銆佹渶杩戞洿鏂版椂闂淬€?|
| `github_search` | 鐢?GitHub 鎼滅储璇硶鎼滃叕寮€浠撳簱锛屾寜鏄熸爣鎴栨渶杩戞洿鏂版帓搴忋€?|

绀轰緥鎻愰棶锛?
- 鈥渄eepseek-ai/deepseek-harness 鏈€杩戝彂甯冧簡浠€涔堢増鏈紵鈥?- 鈥滃姣旀帓鍚嶅墠 5 鐨?TypeScript agent 妗嗘灦鐨勬槦鏍囧拰璁稿彲璇併€傗€?- 鈥渙llama/ollama 鏈€杩戞湁绋冲畾鐗堝彂甯冨悧锛熲€?
## 瀹夎

鍓嶇疆锛歚dsh` CLI 0.1.0-rc.6+锛圼瀹夎鏁欑▼](https://github.com/deepseek-ai/deepseek-harness#readme)锛夈€?
```sh
# 浠?GitHub 瀹夎
dsh plugin --profile web add github:zoahdev/dsh-github-release-radar

# 鎴栦粠 npm / tarball 瀹夎
dsh plugin --profile web add dsh-github-release-radar
dsh plugin --profile web add ./dsh-github-release-radar-0.1.0.tgz
```

棣栨浠?git 瀹夎闇€瑕佸厑璁告瀯寤鸿剼鏈紙`dsh` 浼氭彁绀轰綘鍚?profile 鐨?`pnpm-workspace.yaml` 娣诲姞鍝竴琛岋級銆傝瀹岄噸鍚?`dsh web`銆?
## 閰嶇疆

鍏ㄩ儴鍙€夛紝鍐欏叆 `cordis.yml`锛?
| 閰嶇疆椤?| 绫诲瀷 | 榛樿鍊?| 璇存槑 |
|---|---|---|---|
| `githubToken` | string | 鏃?| GitHub token锛屽彲鎻愰珮鍖垮悕 60 娆?灏忔椂鐨勯檺娴侊紱鍒囧嬁鎻愪氦鍒颁粨搴撱€?|
| `timeoutMs` | number | `10000` | 璇锋眰瓒呮椂锛堟绉掞級銆?|
| `defaultLimit` | number | `5` | 妯″瀷鏈紶 `limit` 鏃剁殑榛樿杩斿洖鏉℃暟銆?|
| `bodyPreviewChars` | number | `500` | Release 姝ｆ枃棰勮鏈€澶у瓧绗︽暟銆?|
| `userAgent` | string | `dsh-github-release-radar/0.1.0` | 璇锋眰 GitHub API 鐨?User-Agent銆?|

## 寮€鍙?
```sh
pnpm install
pnpm run build      # tsc 鈫?lib/
pnpm test           # vitest
pnpm pack           # 鎵撳寘 tarball 渚?dsh plugin add 瀹夎
```

鏋勫缓/娴嬭瘯/鍚姩楠岃瘉璁板綍瑙?[VERIFICATION.md](./VERIFICATION.md)銆?
## 璁稿彲璇?
MIT 漏 2026 zoahdev
